export function DefaultNotFoundComponent() {
	return (
		<div className="flex h-svh w-full items-center justify-center bg-background text-foreground">
			<div className="flex flex-col items-center gap-3 text-center px-4">
				<h1 className="font-heading text-8xl font-black leading-none tracking-tight text-foreground/10">
					404
				</h1>
				<p className="text-sm text-muted-foreground">
					Halaman yang kamu cari tidak ditemukan.
				</p>
				<a
					href="/"
					className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
				>
					← Kembali ke Beranda
				</a>
			</div>
		</div>
	);
}
