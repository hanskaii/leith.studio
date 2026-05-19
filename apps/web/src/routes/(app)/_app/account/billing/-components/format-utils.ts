export function formatAmount(amount?: number, currency?: string) {
	if (amount == null) return "—";
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: currency ?? "USD"
	}).format(amount / 100);
}
