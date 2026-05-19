import { createFileRoute } from "@tanstack/react-router";
import { FooterSection } from "../-components/footer-section";

export const Route = createFileRoute("/(app)/_home/legals/privacy-policy")({
	component: PrivacyPage
});

function PrivacyPage() {
	return (
		<>
			<main className="px-4 sm:px-6 pb-32 pt-24">
				<div className="mx-auto max-w-2xl">
					<h1 className="font-heading font-bold text-3xl tracking-tight text-foreground mb-2">
						Privacy Policy
					</h1>
					<p className="text-sm text-muted-foreground mb-10">
						Last updated January 2024
					</p>
					<div className="prose prose-sm text-foreground/80 space-y-6 leading-relaxed">
						<p>
							Leith collects only the information necessary to
							process purchases and deliver assets. We do not sell
							your data to third parties.
						</p>
						<h2 className="font-heading font-semibold text-lg text-foreground mt-8">
							What we collect
						</h2>
						<p>
							Email address (for account and purchase receipts),
							payment details processed securely via Dodo
							Payments, and basic usage analytics to improve the
							product.
						</p>
						<h2 className="font-heading font-semibold text-lg text-foreground mt-8">
							Cookies
						</h2>
						<p>
							We use session cookies for authentication only. No
							tracking or advertising cookies are set.
						</p>
						<h2 className="font-heading font-semibold text-lg text-foreground mt-8">
							Your rights
						</h2>
						<p>
							You may request deletion of your account and
							associated data at any time by emailing{" "}
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
