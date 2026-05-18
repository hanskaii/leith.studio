export function DefaultPendingComponent() {
	return (
		<div className="flex h-svh w-full items-center justify-center bg-background">
			<svg
				width="28"
				height="28"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="animate-spin text-muted-foreground"
			>
				<title>Loading</title>
				<path d="M21 12a9 9 0 1 1-6.219-8.56" />
			</svg>
		</div>
	);
}
