const TICKER_EVENTS = [
	{ label: "User signups", color: "text-emerald-400" },
	{ label: "Session activity", color: "text-blue-400" },
	{ label: "API key usage", color: "text-yellow-400" },
	{ label: "Billing events", color: "text-purple-400" },
	{ label: "Admin actions", color: "text-rose-400" }
];

export function LiveTicker() {
	const items = [...TICKER_EVENTS, ...TICKER_EVENTS, ...TICKER_EVENTS];
	return (
		<div className="relative overflow-hidden border-y border-border bg-muted/10 h-8 flex items-center">
			<div className="flex animate-[ticker_30s_linear_infinite] whitespace-nowrap gap-12 pr-12">
				{items.map((item, i) => (
					<span key={i} className="flex items-center gap-1.5 text-xs">
						<span
							className={`w-1.5 h-1.5 rounded-full bg-current ${item.color} shrink-0`}
						/>
						<span className="text-muted-foreground">
							Live events will appear here
						</span>
						<span className={`font-medium ${item.color}`}>
							{item.label}
						</span>
					</span>
				))}
			</div>
			<div className="absolute inset-y-0 left-0 w-12 bg-linear-to-r from-background to-transparent pointer-events-none" />
			<div className="absolute inset-y-0 right-0 w-12 bg-linear-to-l from-background to-transparent pointer-events-none" />
		</div>
	);
}
