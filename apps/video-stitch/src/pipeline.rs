use anyhow::{bail, Context, Result};
use futures::future::join_all;
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::io::AsyncWriteExt;
use tokio::sync::Semaphore;

/// Max concurrent ffprobe metadata checks.
const PROBE_CONCURRENCY: usize = 4;

pub async fn concat_to_mp4(
    scene_paths: &[PathBuf],
    output_path: &Path,
    work_dir: &Path,
) -> Result<()> {
    validate_metadata(scene_paths)
        .await
        .context("metadata mismatch")?;

    let list_path = write_concat_list(scene_paths, work_dir).await?;

    if let Some(parent) = output_path.parent() {
        tokio::fs::create_dir_all(parent).await.ok();
    }

    let out = tokio::process::Command::new("ffmpeg")
        .args(["-y", "-f", "concat", "-safe", "0", "-i"])
        .arg(&list_path)
        .args([
            "-c",
            "copy",
            "-movflags",
            "+faststart",
            "-avoid_negative_ts",
            "make_zero",
            "-fflags",
            "+genpts",
        ])
        .arg(output_path)
        .output()
        .await
        .context("ffmpeg not found")?;

    if !out.status.success() {
        bail!("ffmpeg:\n{}", String::from_utf8_lossy(&out.stderr));
    }

    Ok(())
}

/// Validate that all *unique* scenes share the same codec/resolution/framerate.
/// Deduplicates paths so the same file isn't probed N times.
async fn validate_metadata(paths: &[PathBuf]) -> Result<()> {
    // Collect unique paths while preserving first-seen index
    let mut seen = HashSet::new();
    let unique: Vec<(usize, &PathBuf)> = paths
        .iter()
        .enumerate()
        .filter(|(_, p)| seen.insert(p.as_path()))
        .collect();

    if unique.len() < 2 {
        return Ok(());
    }

    let sem = Arc::new(Semaphore::new(PROBE_CONCURRENCY));
    let tasks: Vec<_> = unique
        .iter()
        .map(|&(i, path)| {
            let path = path.clone();
            let sem = sem.clone();
            async move {
                let _permit = sem.acquire().await.context("semaphore closed")?;
                let out = tokio::process::Command::new("ffprobe")
                    .args([
                        "-v",
                        "error",
                        "-select_streams",
                        "v:0",
                        "-show_entries",
                        "stream=codec_name,width,height,r_frame_rate,pix_fmt",
                        "-of",
                        "json",
                    ])
                    .arg(&path)
                    .output()
                    .await?;

                if !out.status.success() {
                    bail!(
                        "ffprobe scene {} ({}) failed: {}",
                        i,
                        path.file_name().unwrap_or_default().to_string_lossy(),
                        String::from_utf8_lossy(&out.stderr)
                    );
                }

                let json: serde_json::Value = serde_json::from_slice(&out.stdout)?;
                let stream = json["streams"]
                    .as_array()
                    .and_then(|s| s.first())
                    .context("no video stream found in metadata")?
                    .clone();

                Ok::<(usize, serde_json::Value), anyhow::Error>((i, stream))
            }
        })
        .collect();

    let results = join_all(tasks).await;
    let mut streams = Vec::with_capacity(unique.len());
    for r in results {
        streams.push(r?);
    }
    streams.sort_by_key(|(i, _)| *i);

    let reference = &streams[0].1;
    for (i, stream) in streams.iter().skip(1) {
        for field in ["codec_name", "width", "height", "r_frame_rate", "pix_fmt"] {
            if stream[field] != reference[field] {
                bail!(
                    "Scene {} format mismatch: {} is {} but scene 0 is {}",
                    i,
                    field,
                    stream[field],
                    reference[field]
                );
            }
        }
    }

    Ok(())
}

async fn write_concat_list(scene_paths: &[PathBuf], work_dir: &Path) -> Result<PathBuf> {
    let list_path = work_dir.join("concat.txt");
    let mut file = tokio::fs::File::create(&list_path).await?;

    for path in scene_paths {
        file.write_all(format!("file '{}'\n", path.to_string_lossy()).as_bytes())
            .await?;
    }

    file.flush().await?;
    Ok(list_path)
}
