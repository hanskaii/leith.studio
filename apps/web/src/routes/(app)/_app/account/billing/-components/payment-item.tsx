import { Invoice01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { StatusBadge } from "./status-badge";
import { formatDate, formatAmount } from "./format-utils";

export function PaymentItem({ payment }: { payment: any }) {
	const id = payment.paymentId ?? payment.payment_id ?? payment.id ?? "";
	const createdAt = payment.createdAt ?? payment.created_at ?? payment.date;
	const amount =
		payment.totalAmount ?? payment.total_amount ?? payment.amount;

	return (
		<div className="flex items-center justify-between gap-3 px-4 py-3.5 bg-background hover:bg-muted/20 transition-colors">
			<div className="flex items-center gap-3">
				<div className="size-7 rounded-lg bg-muted/40 flex items-center justify-center">
					<HugeiconsIcon
						icon={Invoice01Icon}
						className="size-3.5 text-muted-foreground"
					/>
				</div>
				<div className="flex flex-col gap-0.5">
					<p className="text-xs font-medium leading-tight font-mono">
						{id.slice(0, 18)}...
					</p>
					<p className="text-[11px] text-muted-foreground">
						{formatDate(createdAt)}
					</p>
				</div>
			</div>
			<div className="flex items-center gap-3">
				<span className="text-xs font-semibold tabular-nums">
					{formatAmount(amount, payment.currency)}
				</span>
				<StatusBadge status={payment.status ?? "succeeded"} />
			</div>
		</div>
	);
}
