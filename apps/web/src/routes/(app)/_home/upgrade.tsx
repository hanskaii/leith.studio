import { createFileRoute, redirect } from "@tanstack/react-router";
import { Badge, Button, Card, Separator, Spinner, toast } from "@workspace/ui";
import { HugeiconsIcon } from "@hugeicons/react";
import { FlashIcon } from "@hugeicons/core-free-icons";
import { motion } from "framer-motion";
import { useState } from "react";
import { authClient } from "@/auth/client";
import { sessionsOptions, useLogoutMutation } from "@/routes/-fn/auth";
import { Gate } from "@workspace/core";
import { appConfig, type PricingPlan } from "@workspace/config";

export const Route = createFileRoute("/(app)/_home/upgrade")({
	beforeLoad: async ({ context }) => {
		const session = await context.queryClient.fetchQuery(sessionsOptions());
		if (!session?.user) throw redirect({ to: "/login" });

		// Already subscribed — send them to the app
		const result = await Gate.can("app.use", { actor: session.user });
		if (result.allowed) throw redirect({ to: "/overview" });

		return { session };
	},
	component: UpgradePage
});

function UpgradePage() {
	const { session } = Route.useRouteContext();
	const user = session.user;
	const { logout, isPending: isLogoutPending } = useLogoutMutation();
	const [isCheckoutLoading, setIsCheckoutLoading] = useState<string | null>(
		null
	);

	const handleCheckout = async (plan: PricingPlan) => {
		setIsCheckoutLoading(plan.name);
		try {
			const { data, error } =
				await authClient.dodopayments.checkoutSession({
					slug: plan.slug,
					customer: {
						name:
							user?.name ||
							user?.email?.split("@")[0] ||
							"Customer",
						email: user?.email || ""
					}
				} as any);

			if (error) {
				toast.error(error.message || "Failed to initiate checkout");
				return;
			}

			if (data?.url) {
				window.location.href = data.url;
			}
		} catch {
			toast.error("Something went wrong. Please try again.");
		} finally {
			setIsCheckoutLoading(null);
		}
	};

	return (
		<div className="relative flex min-h-screen flex-col items-center justify-center bg-background overflow-hidden px-6 py-16">
			{/* Background */}
			<div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
				<div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-30" />
				<div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-30" />
			</div>

			<div className="relative z-10 w-full max-w-7xl flex flex-col items-center gap-12">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4 }}
					className="flex flex-col items-center text-center gap-3"
				>
					<Badge
						variant="secondary"
						className="px-3 py-0.5 bg-primary/5 text-primary border-primary/20 text-[10px] uppercase tracking-wider font-bold"
					>
						Subscription Required
					</Badge>
					<h1 className="text-3xl font-bold tracking-tight">
						Upgrade to get access
					</h1>
					<p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
						Choose a plan to unlock the app. Already subscribed?{" "}
						<button
							onClick={() => window.location.reload()}
							className="text-primary underline-offset-4 hover:underline"
						>
							Refresh the page.
						</button>
					</p>
				</motion.div>

				{/* Pricing cards — columns match plan count, max 4 */}
				<div
					className={`grid w-full gap-6 grid-cols-1 sm:grid-cols-2 ${{ 1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" }[appConfig.payments.length as 1 | 2 | 3 | 4] ?? "lg:grid-cols-3"}`}
				>
					{appConfig.payments.map((plan: any, i: number) => (
						<motion.div
							key={plan.name}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.4, delay: 0.1 * i }}
							className="flex h-full"
						>
							<Card
								className={`relative flex flex-col w-full p-6 transition-all border-none bg-muted/20 ring-1 backdrop-blur-sm overflow-hidden text-left ${plan.popular ? "ring-primary/40 bg-primary/[0.03]" : "ring-border/50"}`}
							>
								{plan.popular && (
									<div className="absolute top-0 right-0">
										<div className="bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-tighter">
											Most Popular
										</div>
									</div>
								)}
								<div className="flex flex-col gap-1.5 mb-6">
									<h3 className="font-bold text-lg leading-tight">
										{plan.name}
									</h3>
									<div className="flex flex-col gap-0.5">
										<div className="flex items-center gap-2">
											{plan.originalPrice && (
												<span className="text-sm font-medium text-muted-foreground line-through opacity-50">
													{plan.originalPrice}
												</span>
											)}
											<span className="text-3xl font-black">
												{plan.price}
											</span>
											<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
												{plan.currency}
											</span>
										</div>
										<span className="text-[10px] text-primary font-bold uppercase tracking-tight">
											{plan.interval === "one-time"
												? plan.type === "credits"
													? `Refillable (${plan.unit})`
													: "Pay once, build unlimited"
												: `/ ${plan.interval}`}
										</span>
									</div>
									<p className="text-[11px] text-muted-foreground leading-relaxed mt-4 h-12">
										{plan.description}
									</p>
								</div>

								<Separator className="mb-6 opacity-40" />

								<div className="flex flex-col gap-4 mb-8 flex-1">
									{plan.features.map((feature: string) => (
										<div
											key={feature}
											className="flex items-center gap-2.5"
										>
											<div className="flex items-center justify-center size-4 rounded-full bg-primary/10">
												<HugeiconsIcon
													icon={FlashIcon}
													className="size-2 text-primary"
												/>
											</div>
											<span className="text-[11px] font-medium text-foreground/80">
												{feature}
											</span>
										</div>
									))}
								</div>

								<Button
									size="sm"
									variant={
										plan.popular ? "default" : "outline"
									}
									className={`w-full rounded-xl text-xs h-9 font-bold transition-all ${plan.popular ? "shadow-lg shadow-primary/20" : ""}`}
									onClick={() => handleCheckout(plan)}
									disabled={isCheckoutLoading !== null}
								>
									{isCheckoutLoading === plan.name ? (
										<Spinner className="size-3.5 mr-2" />
									) : null}
									{isCheckoutLoading === plan.name
										? "Preparing..."
										: plan.cta}
								</Button>

								<p className="text-center text-[9px] text-muted-foreground mt-4 opacity-60">
									{plan.footer}
								</p>
							</Card>
						</motion.div>
					))}
				</div>

				{/* Footer */}
				<div className="flex flex-col items-center gap-2">
					<p className="text-xs text-muted-foreground">
						Signed in as{" "}
						<span className="font-medium text-foreground">
							{user?.email}
						</span>
					</p>
					<Button
						variant="ghost"
						size="sm"
						onClick={logout}
						disabled={isLogoutPending}
						className="text-xs text-muted-foreground"
					>
						{isLogoutPending ? "Logging out..." : "Log out"}
					</Button>
				</div>
			</div>
		</div>
	);
}
