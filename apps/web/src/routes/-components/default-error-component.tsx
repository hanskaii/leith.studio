import type { ErrorComponentProps } from "@tanstack/react-router";

export function DefaultErrorComponent({ error }: ErrorComponentProps) {
	return (
		<div className="flex h-svh w-full items-center justify-center bg-background text-foreground">
			<div className="flex flex-col items-center gap-4 text-center max-w-sm px-4">
				<div className="flex items-center justify-center size-12 rounded-full bg-destructive/10 text-destructive">
					<svg
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<title>Error</title>
						<circle cx="12" cy="12" r="10" />
						<line x1="12" y1="8" x2="12" y2="12" />
						<line x1="12" y1="16" x2="12.01" y2="16" />
					</svg>
				</div>
				<div className="flex flex-col gap-1">
					<h1 className="font-heading text-sm font-semibold text-foreground">
						Something went wrong
					</h1>
					<p className="text-xs text-muted-foreground">
						{error.message || "An unexpected error occurred."}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => window.location.reload()}
						className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
					>
						↻ Try Again
					</button>
					<a
						href="/"
						className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/80"
					>
						← Home
					</a>
				</div>
			</div>
		</div>
	);
}
