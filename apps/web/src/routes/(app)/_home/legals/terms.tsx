import { createFileRoute } from "@tanstack/react-router";
import { FooterSection } from "../-components/footer-section";

export const Route = createFileRoute("/(app)/_home/legals/terms")({
	component: TermsPage
});

function TermsPage() {
	return (
		<>
			<main className="px-4 sm:px-6 pb-32 pt-24">
				<div className="mx-auto max-w-2xl">
					<h1 className="font-heading font-bold text-3xl tracking-tight text-foreground mb-2">
						Terms of Service
					</h1>
					<p className="text-sm text-muted-foreground mb-10">
						Last updated January 2024
					</p>
					<div className="prose prose-sm text-foreground/80 space-y-6 leading-relaxed">
						<p>
							By purchasing or downloading any asset from Leith,
							you agree to these terms. All assets are licensed
							for personal and commercial use in streaming, video
							production, and broadcast projects.
						</p>
						<h2 className="font-heading font-semibold text-lg text-foreground mt-8">
							License
						</h2>
						<p>
							Free assets are available under a royalty-free
							license with attribution encouraged. All Access
							assets are licensed for unlimited personal and
							commercial projects. Redistribution or resale of
							assets is prohibited.
						</p>
						<h2 className="font-heading font-semibold text-lg text-foreground mt-8">
							Refunds
						</h2>
						<p>
							Digital products are non-refundable once downloaded.
							If you experience a technical issue, contact support
							within 7 days of purchase.
						</p>
						<h2 className="font-heading font-semibold text-lg text-foreground mt-8">
							Contact
						</h2>
						<p>
							Questions? Reach us at{" "}
							<a
								href="mailto:hello@leith.co"
								className="text-primary underline underline-offset-4"
							>
								hello@leith.co
							</a>
							.
						</p>
					</div>
				</div>
			</main>
			<FooterSection />
		</>
	);
}
