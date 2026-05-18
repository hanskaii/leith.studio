export function formatDate(dateStr?: string | null) {
	if (!dateStr) return "—";
	return new Date(dateStr).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric"
	});
}

export function formatAmount(amount?: number, currency?: string) {
	if (amount == null) return "—";
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: currency ?? "USD"
	}).format(amount / 100);
}
