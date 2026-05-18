import {
	Desktop,
	GlobeIcon,
	SmartPhone01Icon
} from "@hugeicons/core-free-icons";

export const getDeviceIcon = (userAgent?: string) => {
	if (!userAgent) return GlobeIcon;
	const ua = userAgent.toLowerCase();
	if (
		ua.includes("mobile") ||
		ua.includes("iphone") ||
		ua.includes("android") ||
		ua.includes("ipad")
	) {
		return SmartPhone01Icon;
	}
	return Desktop;
};

export const getDeviceName = (userAgent?: string) => {
	if (!userAgent) return "Unknown Device";
	if (userAgent.includes("iPhone")) return "iPhone";
	if (userAgent.includes("iPad")) return "iPad";
	if (userAgent.includes("Macintosh")) return "Mac";
	if (userAgent.includes("Windows")) return "Windows PC";
	if (userAgent.includes("Android")) return "Android Device";
	return "Unknown Device";
};

export const getOSVersion = (userAgent?: string) => {
	if (!userAgent) return "";
	const iosMatch = userAgent.match(/OS (\d+_\d+(_\d+)?)/);
	if (iosMatch) return `iOS ${iosMatch[1].replace(/_/g, ".")}`;
	const macMatch = userAgent.match(/Mac OS X (\d+_\d+(_\d+)?)/);
	if (macMatch) return `macOS ${macMatch[1].replace(/_/g, ".")}`;
	return "";
};
