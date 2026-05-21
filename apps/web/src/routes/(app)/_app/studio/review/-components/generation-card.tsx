import { memo } from "react";
import { Image } from "@unpic/react";
import { Link } from "@tanstack/react-router";
import type { StudioGeneration } from "@/routes/-fn/studio";

export const GenerationCard = memo(function GenerationCard({
	gen,
	selected,
	onToggle
}: {
	gen: StudioGeneration;
	selected: boolean;
	onToggle: (id: string) => void;
}) {
	const topicLabel = gen.topic ?? "Unknown topic";
	const isApproved = gen.status === "approved";

	return (
		<div
			className="rounded-lg overflow-hidden flex flex-col relative"
			style={{
				border: selected
					? "2px solid oklch(0.62 0.14 140)"
					: "1px solid oklch(0.88 0.008 80)",
				background: "white"
			}}
		>
			{!isApproved && (
				<button
					onClick={() => onToggle(gen.id)}
					className="absolute top-2 left-2 z-10 w-6 h-6 rounded flex items-center justify-center"
					style={{
						background: selected
							? "oklch(0.62 0.14 140)"
							: "rgba(255,255,255,0.85)",
						border: selected
							? "none"
							: "1.5px solid oklch(0.75 0.008 80)"
					}}
				>
					{selected && (
						<svg
							width="12"
							height="12"
							viewBox="0 0 12 12"
							fill="none"
						>
							<path
								d="M2 6l3 3 5-5"
								stroke="white"
								strokeWidth="1.8"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					)}
				</button>
			)}

			<div
				className="relative"
				style={{
					aspectRatio: "16/9",
					background: "oklch(0.12 0.008 60)"
				}}
			>
				{gen.videoUrl ? (
					<video
						src={gen.videoUrl}
						className="absolute inset-0 w-full h-full object-cover"
						loop
						muted
						autoPlay
						playsInline
					/>
				) : gen.imageUrl ? (
					<Image
						src={gen.imageUrl}
						alt=""
						loading="lazy"
						decoding="async"
						layout="fullWidth"
						className="absolute inset-0 w-full h-full object-cover"
					/>
				) : (
					<div
						className="absolute inset-0 flex items-center justify-center text-xs"
						style={{ color: "oklch(0.60 0.008 80)" }}
					>
						No preview
					</div>
				)}

				{isApproved && (
					<div
						className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium"
						style={{
							background: "oklch(0.62 0.14 140)",
							color: "white"
						}}
					>
						Approved
					</div>
				)}
			</div>

			<div className="p-3 flex flex-col gap-1 flex-1">
				<p
					className="text-xs font-medium truncate"
					style={{
						color: "oklch(0.20 0.008 60)",
						fontFamily: "var(--font-sans)"
					}}
				>
					{topicLabel}
				</p>
				{gen.videoPrompt && (
					<p
						className="text-xs line-clamp-2"
						style={{ color: "oklch(0.55 0.010 60)" }}
					>
						{gen.videoPrompt}
					</p>
				)}
			</div>

			{isApproved && gen.postId && (
				<div className="px-3 pb-3">
					<Link
						to="/creator/$id"
						params={{ id: gen.postId }}
						className="block w-full text-center py-1.5 rounded text-xs font-medium"
						style={{
							background: "oklch(0.94 0.025 55)",
							color: "oklch(0.45 0.10 60)"
						}}
					>
						Open in creator
					</Link>
				</div>
			)}
		</div>
	);
});
