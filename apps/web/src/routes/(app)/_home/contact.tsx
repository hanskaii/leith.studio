import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Badge,
	Card,
	CardHeader,
	CardTitle,
	CardDescription
} from "@workspace/ui";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Book02Icon,
	TelegramIcon,
	GithubIcon,
	Mail01Icon,
	MessageQuestionIcon
} from "@hugeicons/core-free-icons";

export const Route = createFileRoute("/(app)/_home/contact")({
	component: ContactPage
});

function ContactCard({
	title,
	description,
	icon,
	href,
	isExternal = false
}: {
	title: string;
	description: string;
	icon: any;
	href: string;
	isExternal?: boolean;
}) {
	const Content = (
		<Card className="flex flex-col items-center bg-muted/20 border-border/50 hover:bg-muted/30 transition-all cursor-pointer group h-full">
			<CardHeader className="flex flex-col items-center text-center gap-2 py-4 px-3">
				<div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
					<HugeiconsIcon
						icon={icon}
						className="size-4 text-foreground/80"
					/>
				</div>
				<div className="flex flex-col gap-0.5">
					<CardTitle className="text-sm font-bold tracking-tight">
						{title}
					</CardTitle>
					<CardDescription className="text-[10px] leading-relaxed opacity-60 px-2">
						{description}
					</CardDescription>
				</div>
			</CardHeader>
		</Card>
	);

	if (isExternal) {
		return (
			<a
				href={href}
				target="_blank"
				rel="noreferrer"
				className="block h-full"
			>
				{Content}
			</a>
		);
	}

	return (
		<Link to={href} className="block h-full">
			{Content}
		</Link>
	);
}

const faqs = [
	{
		question: "How do I get an API Key?",
		answer: "You can generate and manage your API keys in your Account Settings under the API Keys tab. Make sure to keep your secret keys safe."
	},
	{
		question: "Is there a rate limit for the API?",
		answer: "Yes, our public API has a rate limit of 100 requests per minute per API key to ensure stability."
	},
	{
		question: "Where can I find the full documentation?",
		answer: "Our comprehensive API reference is available on the /docs page, featuring guides and examples."
	}
];

function ContactPage() {
	return (
		<div className="relative flex flex-col items-center w-full max-w-3xl mx-auto p-6 pt-24 pb-32 min-h-screen z-10">
			{/* Background Decoration */}
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(var(--primary),0.03),transparent_100%)] pointer-events-none -z-10" />

			<div className="flex flex-col gap-3 text-center mb-16">
				<Badge
					variant="outline"
					className="w-fit mx-auto rounded-full px-3 py-0.5 bg-primary/5 text-primary border-primary/20 text-[9px] uppercase tracking-widest font-bold"
				>
					Support
				</Badge>
				<h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
					How can we help?
				</h1>
				<p className="text-muted-foreground text-xs sm:text-sm max-w-md mx-auto leading-relaxed opacity-80 text-balance">
					Questions about setup, billing, or roadmap? We're here to
					help you build faster.
				</p>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-28">
				<ContactCard
					title="Documentation"
					description="Guides, API reference, and more."
					icon={Book02Icon}
					href="/docs"
				/>
				<ContactCard
					title="Telegram"
					description="Fastest way to reach the team."
					icon={TelegramIcon}
					href="https://t.me/hudasaja"
					isExternal
				/>
				<ContactCard
					title="GitHub"
					description="Open issues or contribute code."
					icon={GithubIcon}
					href="https://github.com/hudasaja"
					isExternal
				/>
			</div>

			<div className="flex flex-col items-center gap-10 w-full">
				<div className="flex flex-col items-center gap-2 text-center">
					<div className="flex items-center justify-center p-2 rounded-lg bg-primary/5 text-primary mb-2">
						<HugeiconsIcon
							icon={MessageQuestionIcon}
							className="size-4"
						/>
					</div>
					<h2 className="text-xl font-bold tracking-tight">
						Frequently asked questions
					</h2>
					<p className="text-muted-foreground text-[11px] opacity-70">
						Quick answers to common questions about Tanflare.
					</p>
				</div>

				<div className="grid grid-cols-1 gap-6 w-full max-w-2xl">
					{faqs.map((faq, i) => (
						<div
							key={i}
							className="flex flex-col gap-1.5 p-4 rounded-xl border border-border/40 bg-muted/5 hover:bg-muted/10 transition-colors"
						>
							<h3 className="font-bold text-sm tracking-tight">
								{faq.question}
							</h3>
							<p className="text-[11px] text-muted-foreground leading-relaxed opacity-80">
								{faq.answer}
							</p>
						</div>
					))}
				</div>

				<div className="mt-8 flex flex-col items-center gap-4 p-8 rounded-2xl border border-dashed border-border/60 bg-muted/5 w-full">
					<div className="flex flex-col items-center gap-1 text-center">
						<h3 className="font-bold text-sm">
							Still have questions?
						</h3>
						<p className="text-[10px] text-muted-foreground opacity-70">
							We're generally available via email for more formal
							inquiries.
						</p>
					</div>
					<a
						href="mailto:support@tanflare.com"
						className="flex items-center gap-2 text-xs font-semibold text-primary hover:opacity-80 transition-opacity"
					>
						<HugeiconsIcon icon={Mail01Icon} className="size-3.5" />
						support@tanflare.com
					</a>
				</div>
			</div>
		</div>
	);
}
