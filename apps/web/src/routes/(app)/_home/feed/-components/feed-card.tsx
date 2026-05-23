import { memo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { FeedAsset } from "../-lib/feed-data";

export const FeedCard = memo(function FeedCard({
	asset,
	aspect = "aspect-[16/9]"
}: {
	asset: FeedAsset;
	aspect?: string;
}) {
	const [hovered, setHovered] = useState(false);
	const videoRef = useRef<HTMLVideoElement>(null);
	const audioRef = useRef<HTMLAudioElement>(null);
	const isVideo = asset.type === "video";
	const isAudio = asset.type === "audio";
	const hasClip = isVideo && !!asset.clipUrl;
	const hasAudioClip = isAudio && !!asset.clipUrl;

	function handlePointerEnter() {
		setHovered(true);
		if (videoRef.current) {
			videoRef.current.currentTime = 0;
			videoRef.current.play().catch(() => {});
		}
		if (audioRef.current) {
			audioRef.current.currentTime = 0;
			audioRef.current.play().catch(() => {});
		}
	}

	function handlePointerLeave() {
		setHovered(false);
		if (videoRef.current) {
			videoRef.current.pause();
			videoRef.current.currentTime = 0;
		}
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
		}
	}

	return (
		<Link
			to="/feed/$slug"
			params={{ slug: asset.slug }}
			className="group block"
		>
			<div
				className={`relative ${aspect} overflow-hidden rounded-md bg-muted`}
				onPointerEnter={handlePointerEnter}
				onPointerLeave={handlePointerLeave}
			>
				{/* Thumbnail — always rendered */}
				<img
					src={asset.coverThumb}
					alt={asset.title}
					loading="lazy"
					decoding="async"
					className={`absolute inset-0 h-full w-full object-cover transition-[transform,opacity] duration-500 ${
						hovered && hasClip
							? "opacity-0 scale-[1.04]"
							: "opacity-100 group-hover:scale-[1.04]"
					}`}
				/>

				{/* Hover clip — video only */}
				{hasClip && (
					<video
						ref={videoRef}
						muted
						loop
						playsInline
						preload="none"
						src={asset.clipUrl}
						className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
							hovered ? "opacity-100" : "opacity-0"
						}`}
					/>
				)}

				{/* Audio hover clip — hidden, just plays */}
				{hasAudioClip && (
					<audio
						ref={audioRef}
						loop
						preload="none"
						src={asset.clipUrl}
					/>
				)}

				{/* Audio overlay — waveform indicator on hover */}
				{isAudio && (
					<div
						className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
							hovered ? "opacity-100" : "opacity-0"
						}`}
						style={{ background: "rgba(0,0,0,0.45)" }}
					>
						<div className="flex items-end gap-[3px] h-6">
							{[3, 6, 10, 7, 12, 5, 9, 4, 8, 6, 11, 4].map(
								(h, i) => (
									<span
										key={i}
										className="w-[3px] rounded-full bg-white/80"
										style={{
											height: `${h}px`,
											transformOrigin: "bottom",
											animation: hovered
												? `bar-bounce 0.8s ease-in-out ${(i * 0.07).toFixed(2)}s infinite alternate`
												: "none"
										}}
									/>
								)
							)}
						</div>
					</div>
				)}

				{/* Format + resolution — bottom left */}
				<div className="absolute bottom-2 left-2 flex items-center gap-1">
					<span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-black/60 text-white/80 backdrop-blur-sm">
						{asset.format}
					</span>
					{!isAudio && (
						<span className="rounded px-1.5 py-0.5 text-[9px] font-medium bg-black/40 text-white/60 backdrop-blur-sm">
							{asset.resolution}
						</span>
					)}
				</div>

				{/* Members badge — top right */}
				{asset.access === "members" && (
					<div className="absolute right-2 top-2">
						<span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-primary text-primary-foreground">
							Members
						</span>
					</div>
				)}
			</div>

			<div className="mt-2.5 px-0.5">
				<h3 className="font-heading font-semibold text-sm leading-snug text-foreground transition-colors group-hover:text-primary line-clamp-1">
					{asset.title}
				</h3>
			</div>
		</Link>
	);
});

export function FeedCardSkeleton() {
	return (
		<div className="block animate-pulse">
			<div className="aspect-[16/9] rounded-md bg-muted" />
			<div className="mt-2.5 px-0.5">
				<div className="h-4 w-3/4 rounded bg-muted" />
			</div>
		</div>
	);
}
