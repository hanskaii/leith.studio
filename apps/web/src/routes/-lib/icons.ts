import {
	Activity01Icon,
	DashboardSpeed01Icon,
	FavouriteIcon,
	FolderLibraryIcon,
	Home01Icon,
	ShoppingBag01Icon,
	StarIcon,
	UserMultiple02Icon,
	Wallet03Icon
} from "@hugeicons/core-free-icons";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_REGISTRY: Record<string, any> = {
	Activity01Icon,
	DashboardSpeed01Icon,
	FavouriteIcon,
	FolderLibraryIcon,
	Home01Icon,
	ShoppingBag01Icon,
	StarIcon,
	UserMultiple02Icon,
	Wallet03Icon
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getIconByName(name: string): any {
	return ICON_REGISTRY[name];
}
