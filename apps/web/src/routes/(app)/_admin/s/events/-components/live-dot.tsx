export function LiveDot() {
	return (
		<span className="relative flex size-2">
			<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
			<span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
		</span>
	);
}
