import { useEffect, useState } from "react";

function getDevice(): "mobile" | "tablet" | "desktop" | null {
	if (typeof window === "undefined") return null;

	return window.matchMedia("(min-width: 1024px)").matches
		? "desktop"
		: window.matchMedia("(min-width: 768px)").matches
			? "tablet"
			: "mobile";
}

function getDimensions() {
	if (typeof window === "undefined") return null;

	return { width: window.innerWidth, height: window.innerHeight };
}

export function useMediaQuery() {
	const [mounted, setMounted] = useState(false);
	const [device, setDevice] = useState<
		"mobile" | "tablet" | "desktop" | null
	>(null);
	const [dimensions, setDimensions] = useState<{
		width: number;
		height: number;
	} | null>(null);

	useEffect(() => {
		setMounted(true);

		const checkDevice = () => {
			setDevice(getDevice());
			setDimensions(getDimensions());
		};

		// Initial detection
		checkDevice();

		// Listener for windows resize
		window.addEventListener("resize", checkDevice);

		// Cleanup listener
		return () => {
			window.removeEventListener("resize", checkDevice);
		};
	}, []);

	// During SSR and before mounting, assume desktop to prevent hydration mismatch
	const safeDevice = mounted ? device : "desktop";

	return {
		device: safeDevice,
		width: dimensions?.width,
		height: dimensions?.height,
		isMobile: safeDevice === "mobile",
		isTablet: safeDevice === "tablet",
		isDesktop: safeDevice === "desktop",
		mounted
	};
}
