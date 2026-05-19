import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
	Button,
	Field,
	FieldDescription,
	FieldLabel,
	FieldTitle,
	Separator,
	toast,
	Spinner
} from "@workspace/ui";
import { useState, Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	CreditCardIcon,
	Link01Icon,
	Invoice01Icon
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { authClient } from "@/auth/client";
import { Gate } from "@workspace/core";
import { paymentsQueryOptions, type DodoPayment } from "@/routes/-fn/auth";
import { PaymentItem } from "./-components/payment-item";
import { BillingSkeleton } from "./-components/billing-skeleton";

export const Route = createFileRoute("/(app)/_app/account/billing/")({
	beforeLoad: async ({ context }) => {
		const result = await Gate.can("billing.manage", {
			actor: context.session.user
		});

		if (!result.allowed) {
			setTimeout(() => toast.error(result.message || "Access denied"), 0);
			throw redirect({ to: "/overview" });
		}
	},
	component: AccountBillingPage
});

function AccountBillingPage() {
	const [isPortalLoading, setIsPortalLoading] = useState(false);

	const handleOpenPortal = async () => {
		setIsPortalLoading(true);
		try {
			const { data, error } = await (
				authClient.dodopayments as any
			).customer.portal();
			if (error) throw error;

			const url = data?.url;
			if (url) window.location.href = url;
			else throw new Error("No portal URL returned");
		} catch (err: any) {
			toast.error(err.message || "Failed to open billing portal");
		} finally {
			setIsPortalLoading(false);
		}
	};

	return (
		<div className="flex flex-col gap-0 w-full mt-2 pb-16">
			<Suspense fallback={<BillingSkeleton />}>
				<BillingContent
					handleOpenPortal={handleOpenPortal}
					isPortalLoading={isPortalLoading}
				/>
			</Suspense>

			<Separator />

			<section className="py-8">
				<Field orientation="horizontal" className="items-start">
					<div className="flex flex-col gap-1.5 flex-1 pr-4 pt-1">
						<FieldLabel>
							<FieldTitle className="text-sm font-medium text-foreground">
								Customer Portal
							</FieldTitle>
						</FieldLabel>
						<FieldDescription className="text-xs text-muted-foreground leading-relaxed max-w-sm">
							Access your full billing history, update payment
							methods, download invoices, and manage subscriptions
							in the Dodo Payments portal.
						</FieldDescription>
					</div>
					<div className="!flex-none pt-1">
						<Button
							onClick={handleOpenPortal}
							disabled={isPortalLoading}
							variant="outline"
							className="min-w-[160px]"
						>
							{isPortalLoading ? (
								<Spinner className="size-3.5 mr-2" />
							) : (
								<HugeiconsIcon
									icon={CreditCardIcon}
									className="size-3.5 mr-2"
								/>
							)}
							{isPortalLoading ? "Opening..." : "Open Portal"}
							{!isPortalLoading && (
								<HugeiconsIcon
									icon={Link01Icon}
									className="size-3.5 ml-2 opacity-40"
								/>
							)}
						</Button>
					</div>
				</Field>
			</section>
		</div>
	);
}

function BillingContent({
	handleOpenPortal,
	isPortalLoading
}: {
	handleOpenPortal: () => Promise<void>;
	isPortalLoading: boolean;
}) {
	const { data: paymentsData } = useSuspenseQuery(paymentsQueryOptions(5, 1));

	const payments = (paymentsData as { items: DodoPayment[] })?.items ?? [];

	return (
		<>
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
							<HugeiconsIcon
								icon={Link01Icon}
								className="size-3"
							/>
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
		</>
	);
}
