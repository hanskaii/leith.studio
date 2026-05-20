import {
	Conversion,
	Input,
	Output,
	ALL_FORMATS,
	Mp4OutputFormat,
	WebMOutputFormat,
	MkvOutputFormat,
	MovOutputFormat,
	Mp3OutputFormat,
	WavOutputFormat,
	OggOutputFormat,
	MpegTsOutputFormat,
	QUALITY_VERY_LOW,
	QUALITY_LOW,
	QUALITY_MEDIUM,
	QUALITY_HIGH,
	QUALITY_VERY_HIGH,
	VideoSample,
	AudioSample,
	VideoSampleSink,
	FilePathSource,
	ReadableStreamSource,
	BufferTarget,
	ConversionVideoOptions,
	ConversionAudioOptions,
	Quality,
	VideoSamplePixelFormat
} from "mediabunny";
import type {
	Transform,
	OutputFormat,
	TransformResult,
	QualityLevel,
	WatermarkPosition
} from "../types.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveQuality(q: number | QualityLevel): number | Quality {
	if (typeof q === "number") return q;
	return {
		"very-low": QUALITY_VERY_LOW,
		low: QUALITY_LOW,
		medium: QUALITY_MEDIUM,
		high: QUALITY_HIGH,
		"very-high": QUALITY_VERY_HIGH
	}[q];
}

function resolveOutputFormat(format: OutputFormat) {
	const map: Record<
		OutputFormat,
		() => InstanceType<typeof Mp4OutputFormat>
	> = {
		mp4: () => new Mp4OutputFormat(),
		webm: () => new WebMOutputFormat() as any,
		mkv: () => new MkvOutputFormat() as any,
		mov: () => new MovOutputFormat() as any,
		mp3: () => new Mp3OutputFormat() as any,
		wav: () => new WavOutputFormat() as any,
		ogg: () => new OggOutputFormat() as any,
		mpegts: () => new MpegTsOutputFormat() as any
	};
	return map[format]();
}

function find<K extends Transform["type"]>(
	pipeline: Transform[],
	type: K
): Extract<Transform, { type: K }> | undefined {
	return pipeline.find(
		(t): t is Extract<Transform, { type: K }> => t.type === type
	) as any;
}

// ─── Watermark helpers ────────────────────────────────────────────────────────

async function loadWatermarkPixels(
	imagePath: string
): Promise<{ data: Uint8Array; width: number; height: number }> {
	const input = new Input({
		source: new FilePathSource(imagePath),
		formats: ALL_FORMATS
	});
	const track = await input.getPrimaryVideoTrack();
	if (!track)
		throw new Error(`No video track in watermark image: ${imagePath}`);

	const sink = new VideoSampleSink(track);
	const sample = await sink.getSample(0);
	if (!sample) throw new Error(`Could not decode watermark: ${imagePath}`);

	const w = sample.codedWidth;
	const h = sample.codedHeight;
	const size = sample.allocationSize({
		format: "RGBA"
	} as VideoFrameCopyToOptions);
	const data = new Uint8Array(size);
	await sample.copyTo(data, { format: "RGBA" } as VideoFrameCopyToOptions);
	sample.close();
	input.dispose();

	return { data, width: w, height: h };
}

function watermarkOrigin(
	position: WatermarkPosition,
	frameW: number,
	frameH: number,
	wmW: number,
	wmH: number,
	padding = 16
): { x: number; y: number } {
	switch (position) {
		case "top-left":
			return { x: padding, y: padding };
		case "top-right":
			return { x: frameW - wmW - padding, y: padding };
		case "bottom-left":
			return { x: padding, y: frameH - wmH - padding };
		case "bottom-right":
			return { x: frameW - wmW - padding, y: frameH - wmH - padding };
		case "center":
			return {
				x: Math.floor((frameW - wmW) / 2),
				y: Math.floor((frameH - wmH) / 2)
			};
	}
}

function blendWatermark(
	frame: Uint8Array,
	frameW: number,
	frameH: number,
	wm: Uint8Array,
	wmW: number,
	wmH: number,
	ox: number,
	oy: number,
	opacity: number
) {
	for (let wy = 0; wy < wmH; wy++) {
		const fy = oy + wy;
		if (fy < 0 || fy >= frameH) continue;
		for (let wx = 0; wx < wmW; wx++) {
			const fx = ox + wx;
			if (fx < 0 || fx >= frameW) continue;

			const wi = (wy * wmW + wx) * 4;
			const fi = (fy * frameW + fx) * 4;
			const a = (wm[wi + 3] / 255) * opacity;
			const inv = 1 - a;

			frame[fi] = Math.round(frame[fi] * inv + wm[wi] * a);
			frame[fi + 1] = Math.round(frame[fi + 1] * inv + wm[wi + 1] * a);
			frame[fi + 2] = Math.round(frame[fi + 2] * inv + wm[wi + 2] * a);
		}
	}
}

// ─── Color filter helper ──────────────────────────────────────────────────────

function applyColorFilter(
	buf: Uint8Array,
	brightness: number,
	contrast: number,
	saturation: number
) {
	for (let i = 0; i < buf.length; i += 4) {
		let r = buf[i],
			g = buf[i + 1],
			b = buf[i + 2];

		r *= brightness;
		g *= brightness;
		b *= brightness;
		r = contrast * (r - 128) + 128;
		g = contrast * (g - 128) + 128;
		b = contrast * (b - 128) + 128;

		const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
		r = luma + saturation * (r - luma);
		g = luma + saturation * (g - luma);
		b = luma + saturation * (b - luma);

		buf[i] = Math.max(0, Math.min(255, Math.round(r)));
		buf[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
		buf[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
	}
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function transform(
	stream: ReadableStream,
	pipeline: Transform[],
	outputFormat: OutputFormat = "mp4"
): Promise<TransformResult> {
	const resizeStep = find(pipeline, "resize");
	const rotateStep = find(pipeline, "rotate");
	const cropStep = find(pipeline, "crop");
	const clipStep = find(pipeline, "clip");
	const framerateStep = find(pipeline, "framerate");
	const videoCodecStep = find(pipeline, "video-codec");
	const colorFilter = find(pipeline, "color-filter");
	const watermarkStep = find(pipeline, "watermark");
	const audioChStep = find(pipeline, "audio-channels");
	const audioSrStep = find(pipeline, "audio-samplerate");
	const audioCodecStep = find(pipeline, "audio-codec");
	const volumeStep = find(pipeline, "volume");
	const stripVideo = pipeline.some((t) => t.type === "strip-video");
	const stripAudio = pipeline.some((t) => t.type === "strip-audio");

	// Pre-load watermark pixels once before the conversion starts
	const wmPixels = watermarkStep
		? await loadWatermarkPixels(watermarkStep.imagePath)
		: null;

	// ── Video options ──────────────────────────────────────────────────────────
	const videoOpts: ConversionVideoOptions = {};

	if (stripVideo) {
		videoOpts.discard = true;
	} else {
		if (resizeStep?.width !== undefined) videoOpts.width = resizeStep.width;
		if (resizeStep?.height !== undefined)
			videoOpts.height = resizeStep.height;
		if (resizeStep?.fit) videoOpts.fit = resizeStep.fit;
		if (rotateStep) videoOpts.rotate = rotateStep.degrees;
		if (cropStep)
			videoOpts.crop = {
				left: cropStep.left,
				top: cropStep.top,
				width: cropStep.width,
				height: cropStep.height
			};
		if (framerateStep) videoOpts.frameRate = framerateStep.fps;
		if (videoCodecStep) {
			videoOpts.codec = videoCodecStep.codec;
			if (videoCodecStep.bitrate !== undefined)
				videoOpts.bitrate = resolveQuality(videoCodecStep.bitrate);
		}

		if (colorFilter || wmPixels) {
			const _cf = colorFilter;
			const _wm = wmPixels;
			const _wmStep = watermarkStep;

			videoOpts.process = async (
				sample: VideoSample
			): Promise<VideoSample> => {
				const w = sample.codedWidth;
				const h = sample.codedHeight;
				const size = sample.allocationSize({
					format: "RGBA"
				} as VideoFrameCopyToOptions);
				const buf = new Uint8Array(size);
				await sample.copyTo(buf, {
					format: "RGBA"
				} as VideoFrameCopyToOptions);

				if (_cf) {
					applyColorFilter(
						buf,
						_cf.brightness ?? 1,
						_cf.contrast ?? 1,
						_cf.saturation ?? 1
					);
				}

				if (_wm && _wmStep) {
					const { x, y } = watermarkOrigin(
						_wmStep.position ?? "bottom-right",
						w,
						h,
						_wm.width,
						_wm.height
					);
					blendWatermark(
						buf,
						w,
						h,
						_wm.data,
						_wm.width,
						_wm.height,
						x,
						y,
						_wmStep.opacity ?? 1
					);
				}

				sample.close();
				return new VideoSample(buf.buffer, {
					format: "RGBA" as VideoSamplePixelFormat,
					codedWidth: w,
					codedHeight: h,
					timestamp: sample.timestamp,
					duration: sample.duration
				});
			};
		}
	}

	// ── Audio options ──────────────────────────────────────────────────────────
	const audioOpts: ConversionAudioOptions = {};

	if (stripAudio) {
		audioOpts.discard = true;
	} else {
		if (audioChStep) audioOpts.numberOfChannels = audioChStep.count;
		if (audioSrStep) audioOpts.sampleRate = audioSrStep.hz;
		if (audioCodecStep) {
			audioOpts.codec = audioCodecStep.codec;
			if (audioCodecStep.bitrate !== undefined)
				audioOpts.bitrate = resolveQuality(audioCodecStep.bitrate);
		}

		if (volumeStep) {
			const gain = volumeStep.gain;
			audioOpts.process = (sample: AudioSample): AudioSample => {
				const size = sample.allocationSize({
					planeIndex: 0,
					format: "f32" as AudioSampleFormat
				});
				const buf = new Float32Array(size / 4);
				sample.copyTo(buf, {
					planeIndex: 0,
					format: "f32" as AudioSampleFormat
				});
				for (let i = 0; i < buf.length; i++) {
					buf[i] = Math.max(-1, Math.min(1, buf[i] * gain));
				}
				sample.close();
				return new AudioSample({
					data: buf.buffer,
					format: "f32" as AudioSampleFormat,
					numberOfChannels: sample.numberOfChannels,
					sampleRate: sample.sampleRate,
					timestamp: sample.timestamp
				});
			};
		}
	}

	const hasVideo = Object.keys(videoOpts).length > 0;
	const hasAudio = Object.keys(audioOpts).length > 0;
	const trimConfig = clipStep
		? {
				start: clipStep.startSeconds ?? 0,
				end: (clipStep.startSeconds ?? 0) + clipStep.durationSeconds
			}
		: undefined;

	const conversion = await Conversion.init({
		input: new Input({
			source: new ReadableStreamSource(stream),
			formats: ALL_FORMATS
		}),
		output: new Output({
			format: resolveOutputFormat(outputFormat),
			target: new BufferTarget()
		}),
		...(trimConfig && { trim: trimConfig }),
		...(hasVideo && { video: videoOpts }),
		...(hasAudio && { audio: audioOpts })
	});

	await conversion.execute();

	const buffer = (conversion.output.target as BufferTarget).buffer;
	if (!buffer) {
		throw new Error("Conversion generated an empty buffer");
	}

	return { buffer, format: outputFormat };
}
