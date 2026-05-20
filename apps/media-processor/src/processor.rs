use anyhow::Context;
use std::path::Path;

/// Resize the input video to 480p (854x480) with H.264, full duration.
/// Output is written to the R2 FUSE mount path.
pub async fn generate_preview(input: &Path, output: &Path) -> anyhow::Result<()> {
    if let Some(parent) = output.parent() {
        tokio::fs::create_dir_all(parent).await.ok();
    }

    let out = tokio::process::Command::new("ffmpeg")
        .args(["-y", "-i"])
        .arg(input)
        .args([
            "-vf", "scale=854:-2",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-movflags", "+faststart",
            "-c:a", "aac",
        ])
        .arg(output)
        .output()
        .await
        .context("ffmpeg not found")?;

    if !out.status.success() {
        anyhow::bail!("ffmpeg (preview):\n{}", String::from_utf8_lossy(&out.stderr));
    }

    // fsync so the FUSE write reaches R2 before we return
    {
        use tokio::io::AsyncWriteExt;
        let mut dst = tokio::fs::OpenOptions::new()
            .write(true)
            .open(output)
            .await
            .context("failed to open preview output for sync")?;
        dst.flush().await.context("flush failed")?;
        dst.sync_all().await.context("sync_all to R2 failed")?;
    }

    Ok(())
}

/// Trim the first `duration_secs` seconds of the input and resize to 360p (640x360).
/// No audio — this is a silent hover preview clip.
/// Output is written to the R2 FUSE mount path.
pub async fn generate_clip(input: &Path, output: &Path, duration_secs: u32) -> anyhow::Result<()> {
    if let Some(parent) = output.parent() {
        tokio::fs::create_dir_all(parent).await.ok();
    }

    let duration = duration_secs.to_string();

    let out = tokio::process::Command::new("ffmpeg")
        .args(["-y", "-ss", "0", "-t", &duration, "-i"])
        .arg(input)
        .args([
            "-vf", "scale=640:-2",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "28",
            "-movflags", "+faststart",
            "-an",
        ])
        .arg(output)
        .output()
        .await
        .context("ffmpeg not found")?;

    if !out.status.success() {
        anyhow::bail!("ffmpeg (clip):\n{}", String::from_utf8_lossy(&out.stderr));
    }

    // fsync so the FUSE write reaches R2 before we return
    {
        use tokio::io::AsyncWriteExt;
        let mut dst = tokio::fs::OpenOptions::new()
            .write(true)
            .open(output)
            .await
            .context("failed to open clip output for sync")?;
        dst.flush().await.context("flush failed")?;
        dst.sync_all().await.context("sync_all to R2 failed")?;
    }

    Ok(())
}
