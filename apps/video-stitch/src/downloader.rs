use anyhow::{bail, Context, Result};
use futures::future::join_all;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::io::AsyncWriteExt;
use tokio::sync::Semaphore;

/// Max concurrent downloads.
const DL_CONCURRENCY: usize = 4;
/// Max concurrent ffprobe checks.
const PROBE_CONCURRENCY: usize = 4;
/// Per-file download timeout.
const DL_TIMEOUT_SECS: u64 = 600;

/// Download all scenes in parallel. Deduplicates identical URLs so each is
/// fetched only once, then maps back to the original order.
pub async fn download_all(urls: &[&str], work_dir: &Path) -> Result<Vec<PathBuf>> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(DL_TIMEOUT_SECS))
        .build()?;

    // 1. Deduplicate URLs → only download unique ones
    let mut unique_urls: Vec<&str> = Vec::new();
    let mut url_to_path: HashMap<&str, PathBuf> = HashMap::new();

    for (i, &url) in urls.iter().enumerate() {
        url_to_path
            .entry(url)
            .or_insert_with(|| {
                unique_urls.push(url);
                work_dir.join(format!("scene_{i:04}.mp4"))
            });
    }

    eprintln!(
        "  {} unique URLs out of {} total",
        unique_urls.len(),
        urls.len()
    );

    // 2. Download unique URLs in parallel
    let sem = Arc::new(Semaphore::new(DL_CONCURRENCY));
    let tasks: Vec<_> = unique_urls
        .iter()
        .map(|&url| {
            let client = client.clone();
            let url_owned = url.to_string();
            let dest = url_to_path[url].clone();
            let sem = sem.clone();
            async move {
                let _permit = sem.acquire().await.context("semaphore closed")?;
                download_one(&client, &url_owned, &dest)
                    .await
                    .with_context(|| format!("download failed: {url_owned}"))?;
                Ok::<(), anyhow::Error>(())
            }
        })
        .collect();

    for r in join_all(tasks).await {
        r?;
    }

    // 3. Reconstruct paths in original order
    let paths: Vec<PathBuf> = urls
        .iter()
        .map(|&url| url_to_path[url].clone())
        .collect();

    Ok(paths)
}

async fn download_one(client: &reqwest::Client, url: &str, dest: &Path) -> Result<()> {
    let mut resp = client.get(url).send().await?.error_for_status()?;
    let mut file = tokio::fs::File::create(dest).await?;
    while let Some(chunk) = resp.chunk().await? {
        file.write_all(&chunk).await?;
    }
    file.flush().await?;
    Ok(())
}

/// Validate that each *unique* scene starts with an IDR keyframe.
/// Deduplicates paths so identical files aren't probed multiple times.
pub async fn validate_idr_frames(paths: &[PathBuf]) -> Result<()> {
    let unique_paths: Vec<&PathBuf> = {
        let mut seen = std::collections::HashSet::new();
        paths.iter().filter(|p| seen.insert(p.as_path())).collect()
    };

    let sem = Arc::new(Semaphore::new(PROBE_CONCURRENCY));
    let tasks: Vec<_> = unique_paths
        .iter()
        .enumerate()
        .map(|(i, &path)| {
            let path = path.clone();
            let sem = sem.clone();
            async move {
                let _permit = sem.acquire().await.context("semaphore closed")?;
                let ok = check_idr(&path)
                    .await
                    .with_context(|| format!("IDR check scene {i}"))?;
                if !ok {
                    eprintln!(
                        "  warn: {} missing IDR — concat may glitch at join",
                        path.file_name().unwrap_or_default().to_string_lossy()
                    );
                }
                Ok::<(), anyhow::Error>(())
            }
        })
        .collect();

    for r in join_all(tasks).await {
        r?;
    }
    Ok(())
}

async fn check_idr(path: &Path) -> Result<bool> {
    let out = tokio::process::Command::new("ffprobe")
        .args([
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-read_intervals",
            "%+#5",
            "-show_frames",
            "-show_entries",
            "frame=pict_type,key_frame",
            "-of",
            "json",
        ])
        .arg(path)
        .output()
        .await
        .context("ffprobe not found")?;

    if !out.status.success() {
        bail!("ffprobe: {}", String::from_utf8_lossy(&out.stderr));
    }

    let json: serde_json::Value = serde_json::from_slice(&out.stdout)?;
    Ok(json["frames"]
        .as_array()
        .and_then(|f| f.first())
        .map_or(false, |f| {
            f["key_frame"].as_i64() == Some(1) && f["pict_type"].as_str() == Some("I")
        }))
}
