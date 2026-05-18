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
	Invoice01Icon,
	DollarSquareIcon,
	ArrowRight01Icon
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { authClient } from "@/auth/client";
import { Gate } from "@workspace/core";
import {
	paymentsQueryOptions,
	subscriptionsQueryOptions,
	type DodoSubscription,
	type DodoPayment
} from "@/routes/-fn/auth";
import { StatusBadge } from "./-components/status-badge";
import { SubscriptionItem } from "./-components/subscription-item";
import { PaymentItem } from "./-components/payment-item";
import { BillingSkeleton } from "./-components/billing-skeleton";
import { formatDate } from "./-components/format-utils";

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
			// @ts-ignore - Better-Auth plugin type inference issue with union types
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

			{/* ── Customer Portal ────────────────────────────────── */}
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
	const { data: subscriptionsData } = useSuspenseQuery(
		subscriptionsQueryOptions(10, 1)
	);
	const { data: paymentsData } = useSuspenseQuery(paymentsQueryOptions(5, 1));

	const subscriptions =
		(subscriptionsData as { items: DodoSubscription[] })?.items ?? [];
	const payments = (paymentsData as { items: DodoPayment[] })?.items ?? [];
	const activeSubscription = subscriptions.find((s) => s.status === "active");

	return (
		<>
			{/* ── Current Plan ───────────────────────────────────── */}
			<section className="flex flex-col gap-5 py-8">
				<div className="flex flex-col gap-0.5">
					<h2 className="text-sm font-semibold text-foreground">
						Current Plan
					</h2>
					<p className="text-xs text-muted-foreground">
						Your active subscription.
					</p>
				</div>

				<div className="rounded-xl border border-border bg-muted/10 p-5 flex items-center justify-between gap-4">
					<div className="flex items-center gap-4">
						<div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 shrink-0">
							<HugeiconsIcon
								icon={DollarSquareIcon}
								className="size-5 text-primary"
							/>
						</div>
						<div className="flex flex-col gap-1">
							{activeSubscription ? (
								<>
									<p className="text-sm font-semibold leading-tight">
										{activeSubscription.productName ??
											activeSubscription.planName ??
											"Active Plan"}
									</p>
									<div className="flex items-center gap-2">
										<StatusBadge status="active" />
										{activeSubscription.currentPeriodEnd && (
											<span className="text-[11px] text-muted-foreground">
												Renews{" "}
												{formatDate(
													activeSubscription.currentPeriodEnd
												)}
											</span>
										)}
									</div>
								</>
							) : (
								<>
									<p className="text-sm font-semibold text-muted-foreground leading-tight">
										No Active Plan
									</p>
									<StatusBadge status={undefined} />
								</>
							)}
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						{!activeSubscription && (
							<Button
								size="sm"
								className="h-8 text-xs px-3"
								asChild
							>
								<Link to="/">Upgrade</Link>
							</Button>
						)}
						<Button
							size="sm"
							variant="outline"
							className="h-8 text-xs px-3"
							onClick={handleOpenPortal}
							disabled={isPortalLoading}
						>
							{isPortalLoading ? (
								<Spinner className="size-3 mr-1.5" />
							) : (
								<HugeiconsIcon
									icon={CreditCardIcon}
									className="size-3.5 mr-1.5"
								/>
							)}
							{isPortalLoading ? "Opening..." : "Manage Billing"}
							{!isPortalLoading && (
								<HugeiconsIcon
									icon={Link01Icon}
									className="size-3 ml-1.5 opacity-40"
								/>
							)}
						</Button>
					</div>
				</div>
			</section>

			<Separator />

			{/* ── Subscriptions ──────────────────────────────────── */}
			<section className="flex flex-col gap-5 py-8">
				<div className="flex flex-col gap-0.5">
					<h2 className="text-sm font-semibold text-foreground">
						Subscriptions
					</h2>
					<p className="text-xs text-muted-foreground">
						All your active subscriptions.
					</p>
				</div>

				{subscriptions.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-3 py-10 rounded-xl border border-dashed border-border text-center">
						<HugeiconsIcon
							icon={CreditCardIcon}
							className="size-7 text-muted-foreground/40"
						/>
						<div className="flex flex-col gap-1">
							<p className="text-sm font-medium text-muted-foreground">
								No subscriptions yet
							</p>
							<p className="text-xs text-muted-foreground/60">
								Purchase a plan to get started.
							</p>
						</div>
						<Button size="sm" className="h-8 text-xs mt-1" asChild>
							<Link to="/">
								View Plans
								<HugeiconsIcon
									icon={ArrowRight01Icon}
									className="size-3.5 ml-1.5"
								/>
							</Link>
						</Button>
					</div>
				) : (
					<div className="flex flex-col divide-y divide-border rounded-xl border border-border overflow-hidden">
						{subscriptions.map((sub) => (
							<SubscriptionItem
								key={sub.subscriptionId}
								sub={sub}
							/>
						))}
					</div>
				)}
			</section>

			<Separator />

			{/* ── Payment History ────────────────────────────────── */}
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
