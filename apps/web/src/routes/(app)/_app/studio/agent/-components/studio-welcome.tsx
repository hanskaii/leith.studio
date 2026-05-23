import { Button } from "@workspace/ui";
import { HugeiconsIcon } from "@hugeicons/react";
import { VideoReplayIcon } from "@hugeicons/core-free-icons";

interface StudioWelcomeProps {
	isStreaming: boolean;
	onSendMessage: (text: string) => void;
}

const SUGGESTIONS = [
	{
		label: "Generate Video Loop",
		text: "Buat video loop sky time-lapse, mood cinematic",
		icon: "🎬"
	},
	{
		label: "Batch Images",
		text: "Buat 5 gambar abstract minimal dengan tone netral untuk koleksi",
		icon: "🖼️"
	},
	{
		label: "Schedule Daily",
		text: "Jadwalkan 3 generation per hari dengan tema nature",
		icon: "📅"
	},
	{
		label: "Status Check",
		text: "Tampilkan status generation yang sedang berjalan",
		icon: "📊"
	}
];

export function StudioWelcome({
	isStreaming,
	onSendMessage
}: StudioWelcomeProps) {
	return (
		<div className="flex flex-col items-center justify-center py-12 text-center space-y-8 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500">
			<div className="relative">
				<div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
				<div className="relative w-24 h-24 rounded-[2rem] bg-linear-to-br from-primary to-primary-foreground flex items-center justify-center transform rotate-3">
					<HugeiconsIcon
						icon={VideoReplayIcon}
						className="size-12 text-white -rotate-3"
						strokeWidth={1.5}
					/>
				</div>
			</div>
			<div className="space-y-3">
				<h2 className="text-3xl font-heading font-bold tracking-tight text-foreground">
					Leith Studio Agent
				</h2>
				<p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
					Generate, schedule, dan manage konten visual. Ceritakan apa
					yang kamu inginkan dan biarkan agen yang handle semuanya.
				</p>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg pt-4">
				{SUGGESTIONS.map((item, i) => (
					<div
						key={item.label}
						className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
						style={{ animationDelay: `${150 + i * 100}ms` }}
					>
						<Button
							variant="outline"
							disabled={isStreaming}
							onClick={() => onSendMessage(item.text)}
							className="group w-full flex items-center justify-start gap-3 h-auto p-3.5 text-left border-border/40 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 rounded-2xl bg-card/30 backdrop-blur-sm"
						>
							<span className="text-xl bg-secondary/80 size-11 rounded-xl flex items-center justify-center group-hover:bg-primary/10 group-hover:scale-110 transition-transform">
								{item.icon}
							</span>
							<div className="flex flex-col">
								<span className="text-xs font-bold text-foreground">
									{item.label}
								</span>
								<span className="text-[10px] text-muted-foreground line-clamp-1 group-hover:text-primary/70">
									{item.text}
								</span>
							</div>
						</Button>
					</div>
				))}
			</div>
		</div>
	);
}
