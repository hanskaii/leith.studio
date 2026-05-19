import { createFileRoute } from "@tanstack/react-router";
import { HeroSection } from "./-components/hero-section";
import { AssetGrid } from "./-components/asset-grid";
import { AllAccessSection } from "./-components/all-access-section";
import { FaqSection } from "./-components/faq-section";
import { FooterSection } from "./-components/footer-section";

export const Route = createFileRoute("/(app)/_home/")({
	component: LandingPage
});

function LandingPage() {
	return (
		<main className="flex flex-col flex-1 w-full pt-28">
			<HeroSection />
			<AssetGrid />
			<AllAccessSection />
			<FaqSection />
			<FooterSection />
		</main>
	);
}
