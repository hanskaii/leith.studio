import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge, Button, Card, Separator } from "@workspace/ui";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	FlashIcon,
	Shield01Icon,
	CodeIcon,
	GlobeIcon,
	GithubIcon,
	ArrowRight01Icon,
	Book02Icon,
	Clock01Icon,
	Coins01Icon,
	CheckmarkCircle01Icon
} from "@hugeicons/core-free-icons";
import { authClient } from "@/auth/client";
import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast, Spinner } from "@workspace/ui";
import { appConfig } from "@workspace/config";

export const Route = createFileRoute("/(app)/_home/")({
	component: HomePage
});

const features = [
	{
		title: "Edge-Native Performance",
		description:
			"Built on Cloudflare Workers for ultra-low latency and global scalability at its core.",
		icon: GlobeIcon,
		color: "text-blue-500"
	},
	{
		title: "End-to-End Type Safety",
		description:
			"Powered by TanStack Router and Hono for a seamless, compile-time safe development experience.",
		icon: CodeIcon,
		color: "text-purple-500"
	},
	{
		title: "Secure by Default",
		description:
			"Integrated with Better Auth and Drizzle ORM for robust authentication and high-performance DB access.",
		icon: Shield01Icon,
		color: "text-green-500"
	},
	{
		title: "Next-Gen Tooling",
		description:
			"Optimized with Vite, Turborepo, and Biome to ensure a fast, consistent DX throughout your project.",
		icon: FlashIcon,
		color: "text-yellow-500"
	}
];

// Pricing plans are now managed in app.config.ts
import { type PricingPlan } from "@workspace/config";

function HomePage() {
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const [isCheckoutLoading, setIsCheckoutLoading] = useState<string | null>(
		null
	);

	const handleCheckout = async (plan: PricingPlan) => {
		if (!session?.user) {
			router.navigate({ to: "/login" });
			return;
		}

		setIsCheckoutLoading(plan.name);
		try {
			const { data, error } =
				await authClient.dodopayments.checkoutSession({
					slug: plan.slug,
					customer: {
						name:
							session?.user?.name ||
							session?.user?.email?.split("@")[0] ||
							"Customer",
						email: session?.user?.email || ""
					}
				} as any);

			if (error) {
				toast.error(error.message || "Failed to initiate checkout");
				return;
			}

			if (data?.url) {
				window.location.href = data.url;
			}
		} catch (error) {
			toast.error("Something went wrong. Please try again.");
		} finally {
			setIsCheckoutLoading(null);
		}
	};

	return (
		<div className="relative flex min-h-screen flex-col items-center bg-background selection:bg-primary/20 overflow-hidden">
			{/* Background Decoration */}
			<div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
				<div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-30" />
				<div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-30" />
				<div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
			</div>

			<nav className="fixed top-0 z-50 flex w-full justify-center border-b border-border/40 bg-background/60 backdrop-blur-xl">
				<div className="flex h-14 w-full max-w-3xl items-center justify-between px-6">
					<div className="flex items-center gap-2">
						<Link
							to="/"
							className="flex items-center gap-2 transition-opacity hover:opacity-80"
						>
							<div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
								<HugeiconsIcon
									icon={FlashIcon}
									className="size-4 text-primary-foreground"
								/>
							</div>
							<span className="font-bold text-lg tracking-tight">
								Tanflare
							</span>
						</Link>
						<Badge
							variant="outline"
							className="text-[10px] py-0 px-1.5 opacity-60"
						>
							Beta
						</Badge>
					</div>
					<div className="flex items-center gap-6">
						<a
							href="/docs"
							className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
						>
							Docs
						</a>
						<div className="flex items-center gap-3">
							<Button
								variant="ghost"
								size="sm"
								asChild
								className="hidden sm:flex h-8 text-[11px]"
							>
								<a
									href="https://github.com"
									target="_blank"
									rel="noreferrer"
								>
									<HugeiconsIcon
										icon={GithubIcon}
										className="size-3.5 mr-2"
									/>
									GitHub
								</a>
							</Button>
							<Button
								size="sm"
								asChild
								className="h-8 text-[11px] px-3"
							>
								<Link to={appConfig.authDefaultRedirect}>
									Dashboard
								</Link>
							</Button>
						</div>
					</div>
				</div>
			</nav>

			<main className="relative z-10 mt-28 mb-32 flex w-full max-w-5xl flex-col items-center px-6">
				{/* HERO */}
				<section className="flex flex-col items-center text-center gap-8 mb-24">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
						className="flex flex-col items-center gap-6"
					>
						<Badge
							variant="secondary"
							className="px-3 py-0.5 bg-primary/5 text-primary border-primary/20 text-[10px] uppercase tracking-wider font-bold"
						>
							Next-Gen Edge Template
						</Badge>
						<h1 className="max-w-2xl font-extrabold text-4xl leading-tight tracking-tight sm:text-5xl">
							Fast, Secure & <br />{" "}
							<span className="bg-linear-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
								Edge-Native Framework
							</span>
						</h1>
						<p className="max-w-xl text-balance text-sm text-muted-foreground sm:text-base leading-relaxed">
							A modern full-stack starter built on Cloudflare
							Workers and TanStack. Deploy ultra-fast apps with
							zero-latency worker communication and end-to-end
							type safety.
						</p>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.5, delay: 0.2 }}
						className="flex flex-wrap items-center justify-center gap-3"
					>
						<Button
							size="sm"
							className="rounded-full px-6 h-10 text-xs"
							asChild
						>
							<Link to={appConfig.authDefaultRedirect}>
								Get Started
								<HugeiconsIcon
									icon={ArrowRight01Icon}
									className="size-3.5 ml-2"
								/>
							</Link>
						</Button>
						<Button
							size="sm"
							variant="outline"
							className="rounded-full px-6 h-10 text-xs"
							asChild
						>
							<a href="/docs">
								<HugeiconsIcon
									icon={Book02Icon}
									className="size-3.5 mr-2"
								/>
								Read Docs
							</a>
						</Button>
					</motion.div>
				</section>

				{/* FEATURES */}
				<div className="grid w-full gap-4 sm:grid-cols-2">
					{features.map((feature, i) => (
						<motion.div
							key={feature.title}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.4, delay: 0.1 * i }}
						>
							<Card className="group relative h-full flex flex-col gap-4 border-none bg-muted/20 p-6 pt-8 ring-1 ring-border/50 transition-all hover:ring-primary/40 backdrop-blur-sm overflow-hidden text-left">
								<div
									className={`absolute top-0 right-0 p-4 opacity-5 transition-transform group-hover:scale-110 ${feature.color}`}
								>
									<HugeiconsIcon
										icon={feature.icon}
										className="size-16"
									/>
								</div>
								<div
									className={`flex items-center justify-center w-9 h-9 rounded-xl bg-background ring-1 ring-border transition-colors group-hover:ring-primary/20 ${feature.color}`}
								>
									<HugeiconsIcon
										icon={feature.icon}
										className="size-4.5"
									/>
								</div>
								<div className="flex flex-col gap-2">
									<h3 className="font-bold text-base leading-tight">
										{feature.title}
									</h3>
									<p className="text-[11px] text-muted-foreground leading-relaxed text-balance">
										{feature.description}
									</p>
								</div>
							</Card>
						</motion.div>
					))}
				</div>

				{/* TECH HIGHLIGHTS */}
				<div className="mt-32 w-full flex flex-col gap-12 items-center">
					<div className="flex flex-col items-center text-center gap-3">
						<h2 className="text-2xl font-bold tracking-tight">
							Built with the Best
						</h2>
						<p className="text-muted-foreground text-[11px] max-w-sm px-4 leading-relaxed">
							Our stack is curated for maximum speed, type-safety,
							and developer experience.
						</p>
					</div>

					<div className="grid grid-cols-2 sm:grid-cols-3 gap-x-12 gap-y-8 items-center justify-center opacity-60 grayscale transition-all hover:grayscale-0 px-6">
						<TechLogo name="TanStack" />
						<TechLogo name="Cloudflare" />
						<TechLogo name="Hono" />
						<TechLogo name="Better Auth" />
						<TechLogo name="Vite" />
						<TechLogo name="Drizzle" />
					</div>
				</div>

				{/* TIME SAVINGS SECTION */}
				<section className="mt-40 w-full flex flex-col gap-12 items-center">
					<div className="flex flex-col items-center text-center gap-6">
						<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/20 border border-border/50 text-[11px] font-medium backdrop-blur-sm">
							<Badge
								variant="default"
								className="bg-foreground text-background hover:bg-foreground px-2 py-0 h-5 text-[9px] uppercase font-bold tracking-tighter"
							>
								Build vs Buy
							</Badge>
							<span className="text-muted-foreground mr-1">
								Focus on your product, not infrastructure
							</span>
						</div>
						<h2 className="text-4xl font-extrabold tracking-tight">
							Skip months of infrastructure work
						</h2>
						<p className="max-w-xl text-balance text-sm text-muted-foreground leading-relaxed px-6">
							See how much time you save by starting with a
							production-ready foundation instead of building
							everything from scratch.
						</p>
					</div>

					<div className="w-full overflow-hidden rounded-2xl border border-border/50 bg-muted/5 backdrop-blur-xl">
						<table className="w-full text-left text-[11px] border-collapse">
							<thead>
								<tr className="border-b border-border/50 bg-muted/20">
									<th className="p-5 font-bold text-foreground/60 uppercase tracking-wider text-[9px]">
										Component
									</th>
									<th className="p-5 font-bold text-foreground/60 text-right uppercase tracking-wider text-[9px]">
										<div className="flex items-center justify-end gap-2">
											<HugeiconsIcon
												icon={Clock01Icon}
												className="size-3.5 text-orange-400"
											/>
											Build Yourself
										</div>
									</th>
									<th className="p-5 font-bold text-foreground/60 text-right uppercase tracking-wider text-[9px]">
										<div className="flex items-center justify-end gap-2 text-primary">
											<HugeiconsIcon
												icon={FlashIcon}
												className="size-3.5"
											/>
											With Tanflare
										</div>
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border/30">
								{[
									[
										"Authentication (email, OAuth, MFA)",
										"2-4 weeks",
										"Pre-built"
									],
									[
										"Dodo Payments & Billing",
										"2-3 weeks",
										"Pre-built"
									],
									[
										"Multi-tenant organizations",
										"3-4 weeks",
										"Pre-built"
									],
									[
										"Role-based access control",
										"1-2 weeks",
										"Pre-built"
									],
									[
										"Super admin dashboard",
										"2-3 weeks",
										"Pre-built"
									],
									[
										"Team invitations & management",
										"1-2 weeks",
										"Pre-built"
									],
									[
										"Transactional emails",
										"1 week",
										"Pre-built"
									],
									[
										"Blog & documentation CMS",
										"1-2 weeks",
										"Pre-built"
									],
									[
										"Dark mode & theming",
										"3-5 days",
										"Pre-built"
									],
									[
										"Responsive UI components",
										"2-3 weeks",
										"Pre-built"
									],
									[
										"Next.js/React version upgrades",
										"Ongoing (2-4 weeks/year)",
										"Included"
									],
									[
										"Security patches & fixes",
										"Ongoing (unpredictable)",
										"Included"
									],
									[
										"Dependency updates",
										"Ongoing (1-2 weeks/year)",
										"Included"
									],
									[
										"New features & best practices",
										"Your time to research",
										"Included"
									]
								].map(([component, self, maker], i) => (
									<tr
										key={i}
										className="hover:bg-muted/10 transition-all duration-300"
									>
										<td className="p-5 font-medium text-foreground/90">
											{component}
										</td>
										<td className="p-5 text-muted-foreground text-right tabular-nums opacity-60 font-medium">
											{self}
										</td>
										<td className="p-5 font-bold text-right text-emerald-500 tabular-nums">
											<div className="flex items-center justify-end gap-2">
												<HugeiconsIcon
													icon={CheckmarkCircle01Icon}
													className="size-4"
												/>
												{maker}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div className="grid w-full gap-5 sm:grid-cols-3">
						<div className="rounded-2xl border border-border/50 bg-muted/10 p-6 flex flex-col items-center text-center gap-4 group transition-all hover:bg-muted/20">
							<div className="flex items-center justify-center size-12 rounded-full bg-orange-400/10 transition-transform group-hover:scale-110">
								<HugeiconsIcon
									icon={Clock01Icon}
									className="size-6 text-orange-400"
								/>
							</div>
							<div className="flex flex-col gap-1">
								<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
									Build from scratch
								</span>
								<h4 className="text-2xl font-black tabular-nums">
									3-6 months
								</h4>
								<p className="text-[10px] text-muted-foreground font-medium">
									500+ hours of development
								</p>
							</div>
						</div>

						<div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-6 flex flex-col items-center text-center gap-4 group transition-all hover:bg-primary/[0.05]">
							<div className="flex items-center justify-center size-12 rounded-full bg-primary/10 transition-transform group-hover:scale-110">
								<HugeiconsIcon
									icon={FlashIcon}
									className="size-6 text-primary"
								/>
							</div>
							<div className="flex flex-col gap-1">
								<span className="text-[10px] font-bold text-primary uppercase tracking-widest">
									With Tanflare
								</span>
								<h4 className="text-2xl font-black tabular-nums">
									Day 1
								</h4>
								<p className="text-[10px] text-muted-foreground font-medium">
									Start building features immediately
								</p>
							</div>
						</div>

						<div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/[0.03] p-6 flex flex-col items-center text-center gap-4 group transition-all hover:bg-yellow-500/[0.05]">
							<div className="flex items-center justify-center size-12 rounded-full bg-yellow-500/10 transition-transform group-hover:scale-110">
								<HugeiconsIcon
									icon={Coins01Icon}
									className="size-6 text-yellow-500"
								/>
							</div>
							<div className="flex flex-col gap-1">
								<span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">
									Estimated savings
								</span>
								<h4 className="text-2xl font-black tabular-nums">
									$15k - $50k
								</h4>
								<p className="text-[10px] text-muted-foreground font-medium">
									Developer time & opportunity cost
								</p>
							</div>
						</div>
					</div>
				</section>

				{/* PRICING SECTION */}
				<div
					id="pricing"
					className="mt-40 w-full flex flex-col gap-12 items-center"
				>
					<div className="flex flex-col items-center text-center gap-3">
						<Badge
							variant="secondary"
							className="px-3 py-0.5 bg-primary/5 text-primary border-primary/20 text-[10px] uppercase tracking-wider font-bold"
						>
							Pricing
						</Badge>
						<h2 className="text-3xl font-bold tracking-tight">
							Scale without boundaries
						</h2>
						<p className="text-muted-foreground text-[11px] max-w-sm px-4 leading-relaxed">
							Choose the plan that's right for your organization's
							growth.
						</p>
					</div>

					<div
						className={`grid w-full gap-6 sm:grid-cols-2 max-w-7xl ${{ 1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" }[appConfig.payments.length as 1 | 2 | 3 | 4] ?? "lg:grid-cols-3"}`}
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
												<span className="text-sm font-medium text-muted-foreground line-through opacity-50">
													{plan.originalPrice}
												</span>
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
														? `Refillable (${(plan as any).unit})`
														: "Pay once, build unlimited"
													: plan.type === "usage"
														? `/ ${(plan as any).unit}`
														: `/ ${plan.interval}`}
											</span>
										</div>
										<p className="text-[11px] text-muted-foreground leading-relaxed mt-4 h-12">
											{plan.description}
										</p>
									</div>

									<Separator className="mb-6 opacity-40" />

									<div className="flex flex-col gap-4 mb-8 flex-1">
										{plan.features.map(
											(feature: string) => (
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
											)
										)}
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
				</div>

				<Separator className="mt-40 mb-20 opacity-40" />

				{/* CORE BENEFITS SECTION */}
				<section className="w-full flex flex-col items-center gap-12 py-20 px-6">
					<div className="flex flex-col items-center gap-6 text-center">
						<div className="flex items-center justify-center size-14 rounded-2xl bg-primary/10 border border-primary/20 shadow-xl shadow-primary/5">
							<HugeiconsIcon
								icon={FlashIcon}
								className="size-8 text-primary"
							/>
						</div>
						<h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight max-w-lg leading-[1.1]">
							Ship your SaaS in a week, not months.
						</h2>
					</div>

					<div className="flex flex-col gap-5 max-w-xl w-full">
						{[
							{
								title: "Lifetime access",
								desc: "to your stack of choice"
							},
							{
								title: "Build",
								desc: "unlimited applications",
								bold: "unlimited"
							},
							{ title: "Continuous updates", desc: "" },
							{
								title: "Access to the",
								desc: "Discord community",
								bold: "Discord"
							},
							{
								title: "The",
								desc: "best support in the SaaS Starter kits market, period.",
								bold: "best support"
							},
							{
								title: "Community and",
								desc: "Chat support",
								bold: "Chat"
							},
							{
								title: "Community-based",
								desc: "feature requests and Request for Comments.",
								bold: "feature requests"
							},
							{
								title: "One-time",
								desc: "payment, no subscriptions",
								bold: "One-time"
							},
							{
								title: "Includes access to our",
								desc: "free Figma UI kit",
								bold: "free Figma UI kit"
							}
						].map((item, i) => (
							<motion.div
								key={i}
								initial={{ opacity: 0, x: -10 }}
								whileInView={{ opacity: 1, x: 0 }}
								transition={{ delay: i * 0.05 }}
								viewport={{ once: true }}
								className="flex items-start gap-4 group"
							>
								<div className="mt-1 flex items-center justify-center size-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 transition-transform group-hover:scale-110">
									<HugeiconsIcon
										icon={CheckmarkCircle01Icon}
										className="size-3 text-emerald-500"
									/>
								</div>
								<p className="text-sm sm:text-base text-muted-foreground/80 leading-relaxed">
									<span className="font-bold text-foreground">
										{item.title}
									</span>{" "}
									{item.desc}
								</p>
							</motion.div>
						))}
					</div>
				</section>

				<Separator className="mt-20 mb-20 opacity-40" />

				{/* CTA SECTION */}
				<section className="relative w-full overflow-hidden rounded-2xl bg-primary/5 border border-primary/20 p-8 sm:p-10 py-16 text-center flex flex-col items-center gap-6">
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(var(--primary),0.01),transparent)]" />
					<h2 className="relative z-10 text-2xl sm:text-3xl font-bold tracking-tight">
						Ready to build your next big thing?
					</h2>
					<p className="relative z-10 max-w-md text-muted-foreground px-4 text-[11px] sm:text-xs leading-relaxed">
						Start building high-performance edge applications today
						with the ultimate full-stack template.
					</p>
					<Button
						size="sm"
						className="relative z-10 rounded-full px-10 h-11 text-xs font-semibold"
						asChild
					>
						<Link to={appConfig.authDefaultRedirect}>
							Start Coding
						</Link>
					</Button>
				</section>
			</main>

			<footer className="w-full border-t border-border/40 py-12 bg-muted/5 mt-auto flex justify-center">
				<div className="flex w-full max-w-3xl flex-col md:flex-row items-center justify-between px-6 gap-8">
					<div className="flex flex-col gap-2 items-center md:items-start text-center md:text-left">
						<div className="flex items-center gap-2">
							<HugeiconsIcon
								icon={FlashIcon}
								className="size-3.5 text-primary"
							/>
							<span className="font-bold text-sm">Tanflare</span>
						</div>
						<p className="text-muted-foreground text-[9px] uppercase tracking-widest font-medium opacity-60">
							© 2026 Tanflare Platform
						</p>
					</div>
					<div className="flex flex-wrap justify-center md:justify-end gap-x-10 gap-y-6">
						<div className="flex flex-col gap-2 min-w-[80px]">
							<h4 className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground opacity-50">
								Platform
							</h4>
							<a
								href="/docs"
								className="text-xs text-muted-foreground hover:text-foreground"
							>
								Docs
							</a>
							<Link
								to="/contact"
								className="text-xs text-muted-foreground hover:text-foreground"
							>
								Support
							</Link>
						</div>
						<div className="flex flex-col gap-2 min-w-[80px]">
							<h4 className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground opacity-50">
								Legal
							</h4>
							<a
								href="#"
								className="text-xs text-muted-foreground hover:text-foreground"
							>
								Terms
							</a>
							<a
								href="#"
								className="text-xs text-muted-foreground hover:text-foreground"
							>
								Privacy
							</a>
						</div>
						<div className="flex flex-col gap-2 min-w-[80px]">
							<h4 className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground opacity-50">
								Social
							</h4>
							<a
								href="#"
								className="text-xs text-muted-foreground hover:text-foreground"
							>
								X
							</a>
							<a
								href="#"
								className="text-xs text-muted-foreground hover:text-foreground"
							>
								GitHub
							</a>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}

function TechLogo({ name }: { name: string }) {
	return (
		<div className="flex items-center justify-center font-bold text-lg sm:text-xl tracking-tighter text-foreground/80 lowercase">
			{name}
		</div>
	);
}
