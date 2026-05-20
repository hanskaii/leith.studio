mod downloader;
mod pipeline;

use anyhow::Context;
use http_body_util::{BodyExt, Full};
use hyper::body::Bytes;
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::{Method, Request, Response, StatusCode};
use hyper_util::rt::TokioIo;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::path::PathBuf;
use std::time::Instant;
use tokio::net::TcpListener;
use tokio::signal;

const PROCESS_TIMEOUT_SECS: u64 = 840; // 14 mins (slightly less than the 15m workflow timeout)

#[derive(Deserialize)]
struct StitchRequest {
    job_id: String,
    output_path: String,
    urls: Vec<String>,
}

/// Combine a static image + audio track into a looped MP4.
/// All paths are R2 mount paths (e.g. "/mnt/r2/replaylist/abc/audio.m4a").
#[derive(Deserialize)]
struct RenderRequest {
    job_id: String,
    image_path: String,
    audio_path: String,
    output_path: String,
}

#[derive(Serialize)]
struct StitchResponse {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

async fn handle(req: Request<hyper::body::Incoming>) -> Result<Response<Full<Bytes>>, anyhow::Error> {
    match (req.method(), req.uri().path()) {
        (&Method::GET, "/health") => {
            let r2_ready = tokio::fs::metadata("/mnt/r2").await
                .map(|m| m.is_dir())
                .unwrap_or(false);
            let body = if r2_ready {
                Bytes::from_static(b"{\"ok\":true,\"r2_ready\":true}")
            } else {
                Bytes::from_static(b"{\"ok\":false,\"r2_ready\":false}")
            };
            let status = if r2_ready { StatusCode::OK } else { StatusCode::SERVICE_UNAVAILABLE };
            Ok(Response::builder()
                .status(status)
                .header("content-type", "application/json")
                .body(Full::new(body))?)
        }
        (&Method::POST, "/stitch") => {
            let body = req.collect().await?.to_bytes();
            let payload: StitchRequest = match serde_json::from_slice(&body) {
                Ok(p) => p,
                Err(e) => {
                    let resp = StitchResponse { ok: false, error: Some(e.to_string()) };
                    return Ok(Response::builder()
                        .status(StatusCode::BAD_REQUEST)
                        .header("content-type", "application/json")
                        .body(Full::new(Bytes::from(serde_json::to_vec(&resp)?)))?);
                }
            };

            let job_id = payload.job_id.clone();
            let output_path = PathBuf::from(&payload.output_path);
            let urls: Vec<&str> = payload.urls.iter().map(|s| s.as_str()).collect();

            eprintln!("[{job_id}] stitch: {} scenes", urls.len());

            let run_future = run(&job_id, &urls, &output_path);
            match tokio::time::timeout(std::time::Duration::from_secs(PROCESS_TIMEOUT_SECS), run_future).await {
                Ok(Ok(_)) => {
                    eprintln!("[{job_id}] completed successfully");
                    let resp = StitchResponse { ok: true, error: None };
                    Ok(Response::builder()
                        .status(StatusCode::OK)
                        .header("content-type", "application/json")
                        .body(Full::new(Bytes::from(serde_json::to_vec(&resp)?)))?)
                }
                Ok(Err(e)) => {
                    eprintln!("[{job_id}] error: {e:#}");
                    let resp = StitchResponse { ok: false, error: Some(format!("{e:#}")) };
                    Ok(Response::builder()
                        .status(StatusCode::INTERNAL_SERVER_ERROR)
                        .header("content-type", "application/json")
                        .body(Full::new(Bytes::from(serde_json::to_vec(&resp)?)))?)
                }
                Err(_) => {
                    eprintln!("[{job_id}] timed out after {}s", PROCESS_TIMEOUT_SECS);
                    let resp = StitchResponse { ok: false, error: Some(format!("Stitcher timed out after {}s", PROCESS_TIMEOUT_SECS)) };
                    Ok(Response::builder()
                        .status(StatusCode::GATEWAY_TIMEOUT)
                        .header("content-type", "application/json")
                        .body(Full::new(Bytes::from(serde_json::to_vec(&resp)?)))?)
                }
            }
        }
        (&Method::POST, "/render") => {
            let body = req.collect().await?.to_bytes();
            let payload: RenderRequest = match serde_json::from_slice(&body) {
                Ok(p) => p,
                Err(e) => {
                    let resp = StitchResponse { ok: false, error: Some(e.to_string()) };
                    return Ok(Response::builder()
                        .status(StatusCode::BAD_REQUEST)
                        .header("content-type", "application/json")
                        .body(Full::new(Bytes::from(serde_json::to_vec(&resp)?)))?);
                }
            };

            let job_id = payload.job_id.clone();
            let image_path = PathBuf::from(&payload.image_path);
            let audio_path = PathBuf::from(&payload.audio_path);
            let output_path = PathBuf::from(&payload.output_path);

            eprintln!("[{job_id}] render: image+audio → video");

            let run_future = run_render(&job_id, &image_path, &audio_path, &output_path);
            match tokio::time::timeout(std::time::Duration::from_secs(PROCESS_TIMEOUT_SECS), run_future).await {
                Ok(Ok(_)) => {
                    eprintln!("[{job_id}] render completed successfully");
                    let resp = StitchResponse { ok: true, error: None };
                    Ok(Response::builder()
                        .status(StatusCode::OK)
                        .header("content-type", "application/json")
                        .body(Full::new(Bytes::from(serde_json::to_vec(&resp)?)))?)
                }
                Ok(Err(e)) => {
                    eprintln!("[{job_id}] render error: {e:#}");
                    let resp = StitchResponse { ok: false, error: Some(format!("{e:#}")) };
                    Ok(Response::builder()
                        .status(StatusCode::INTERNAL_SERVER_ERROR)
                        .header("content-type", "application/json")
                        .body(Full::new(Bytes::from(serde_json::to_vec(&resp)?)))?)
                }
                Err(_) => {
                    eprintln!("[{job_id}] render timed out after {}s", PROCESS_TIMEOUT_SECS);
                    let resp = StitchResponse { ok: false, error: Some(format!("Render timed out after {}s", PROCESS_TIMEOUT_SECS)) };
                    Ok(Response::builder()
                        .status(StatusCode::GATEWAY_TIMEOUT)
                        .header("content-type", "application/json")
                        .body(Full::new(Bytes::from(serde_json::to_vec(&resp)?)))?)
                }
            }
        }
        _ => Ok(Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(Full::new(Bytes::from_static(b"not found")))?),
    }
}

async fn run(job_id: &str, scene_urls: &[&str], output_path: &PathBuf) -> anyhow::Result<()> {
    let start_total = Instant::now();
    let work_dir = PathBuf::from(format!("/tmp/{job_id}"));
    tokio::fs::create_dir_all(&work_dir).await?;

    let t1 = Instant::now();
    eprintln!("[{job_id}] downloading...");
    let scene_paths = downloader::download_all(scene_urls, &work_dir)
        .await
        .context("download failed")?;
    eprintln!("[{job_id}] download finished in {:?}", t1.elapsed());

    let t2 = Instant::now();
    eprintln!("[{job_id}] validating IDR frames...");
    downloader::validate_idr_frames(&scene_paths)
        .await
        .context("IDR validation failed")?;
    eprintln!("[{job_id}] IDR validation finished in {:?}", t2.elapsed());

    let t3 = Instant::now();
    eprintln!("[{job_id}] stitching...");
    let local_out = work_dir.join("stitched.mp4");
    pipeline::concat_to_mp4(&scene_paths, &local_out, &work_dir)
        .await
        .context("ffmpeg failed")?;
    eprintln!("[{job_id}] stitching finished in {:?}", t3.elapsed());

    let t4 = Instant::now();
    eprintln!("[{job_id}] copying to R2 mount...");
    if let Some(parent) = output_path.parent() {
        tokio::fs::create_dir_all(parent).await.ok();
    }

    // Stream + fsync to guarantee data hits R2 before we return.
    {
        use tokio::io::AsyncWriteExt;
        let mut src = tokio::fs::File::open(&local_out).await
            .context("failed to open stitched output")?;
        let mut dst = tokio::fs::OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open(output_path)
            .await
            .context("failed to open /mnt/r2 destination")?;
        tokio::io::copy(&mut src, &mut dst).await
            .context("failed to copy output to /mnt/r2")?;
        dst.flush().await.context("flush failed")?;
        dst.sync_all().await.context("sync_all to R2 failed")?;
    }
    eprintln!("[{job_id}] copy + sync to R2 finished in {:?}", t4.elapsed());

    tokio::fs::remove_dir_all(&work_dir).await.ok();
    eprintln!("[{job_id}] total time: {:?}", start_total.elapsed());

    Ok(())
}

/// Loop a static image for the full duration of an MP3 and write an MP4.
/// image_path / mp3_path / output_path are all paths on the R2 FUSE mount.
async fn run_render(
    job_id: &str,
    image_path: &PathBuf,
    audio_path: &PathBuf,
    output_path: &PathBuf,
) -> anyhow::Result<()> {
    let start = Instant::now();

    if let Some(parent) = output_path.parent() {
        tokio::fs::create_dir_all(parent).await.ok();
    }

    eprintln!("[{job_id}] ffmpeg: looping image over audio...");
    let out = tokio::process::Command::new("ffmpeg")
        .args(["-y", "-framerate", "1", "-loop", "1", "-i"])
        .arg(image_path)
        .arg("-i")
        .arg(audio_path)
        .args([
            "-threads", "4",
            "-r", "1",
            "-vf", "scale=854:-2",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "30",
            "-tune", "stillimage",
            "-c:a", "copy",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-shortest",
        ])
        .arg(output_path)
        .output()
        .await
        .context("ffmpeg not found")?;

    if !out.status.success() {
        anyhow::bail!("ffmpeg:\n{}", String::from_utf8_lossy(&out.stderr));
    }

    // fsync so the FUSE write reaches R2 before we return
    {
        use tokio::io::AsyncWriteExt;
        let mut dst = tokio::fs::OpenOptions::new()
            .write(true)
            .open(output_path)
            .await
            .context("failed to open output for sync")?;
        dst.flush().await.context("flush failed")?;
        dst.sync_all().await.context("sync_all to R2 failed")?;
    }

    eprintln!("[{job_id}] render done in {:?}", start.elapsed());
    Ok(())
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    let listener = TcpListener::bind(addr).await?;
    eprintln!("stitcher listening on {addr}");

    let (tx, mut rx) = tokio::sync::mpsc::channel::<()>(1);
    tokio::spawn(async move {
        signal::ctrl_c().await.expect("Failed to listen for ctrl_c");
        eprintln!("Received SIGINT, shutting down...");
        let _ = tx.send(()).await;
    });

    loop {
        tokio::select! {
            result = listener.accept() => {
                let (stream, _) = match result {
                    Ok(res) => res,
                    Err(e) => {
                        eprintln!("accept error: {e}");
                        continue;
                    }
                };
                let io = TokioIo::new(stream);
                tokio::spawn(async move {
                    if let Err(e) = http1::Builder::new()
                        .serve_connection(io, service_fn(handle))
                        .await
                    {
                        eprintln!("connection error: {e}");
                    }
                });
            }
            _ = rx.recv() => {
                break;
            }
        }
    }

    Ok(())
}
