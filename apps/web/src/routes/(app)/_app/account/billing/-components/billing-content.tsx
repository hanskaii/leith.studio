import { useSuspenseQuery } from "@tanstack/react-query";
import { Button, Spinner } from "@workspace/ui";
import { Link01Icon, Invoice01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { paymentsQueryOptions, type DodoPayment } from "@/routes/-fn/auth";
import { PaymentItem } from "./payment-item";

export function BillingContent({
	handleOpenPortal,
	isPortalLoading
}: {
	handleOpenPortal: () => Promise<void>;
	isPortalLoading: boolean;
}) {
	const { data: paymentsData } = useSuspenseQuery(paymentsQueryOptions(5, 1));

	const payments = (paymentsData as { items: DodoPayment[] })?.items ?? [];

	return (
		<section className="flex flex-col gap-5 py-8">
			<div className="flex items-end justify-between">
				<div className="flex flex-col gap-0.5">
					<h2 className="text-sm font-semibold text-foreground">
						Payment History
					</h2>
					<p className="text-xs text-muted-foreground">
						Your 5 most recent transactions.
					</p>
				</div>
				<Button
					size="sm"
					variant="ghost"
					className="h-7 text-xs gap-1 text-muted-foreground"
					onClick={handleOpenPortal}
					disabled={isPortalLoading}
				>
					{isPortalLoading ? (
						<Spinner className="size-3" />
					) : (
						<HugeiconsIcon icon={Link01Icon} className="size-3" />
					)}
					View all
				</Button>
			</div>

			{payments.length === 0 ? (
				<div className="flex flex-col items-center justify-center gap-2 py-10 rounded-xl border border-dashed border-border text-center">
					<HugeiconsIcon
						icon={Invoice01Icon}
						className="size-7 text-muted-foreground/40"
					/>
					<p className="text-sm font-medium text-muted-foreground">
						No payments yet
					</p>
				</div>
			) : (
				<div className="flex flex-col divide-y divide-border rounded-xl border border-border overflow-hidden">
					{payments.map((payment) => (
						<PaymentItem
							key={payment.paymentId}
							payment={payment}
						/>
					))}
				</div>
			)}
		</section>
	);
}
