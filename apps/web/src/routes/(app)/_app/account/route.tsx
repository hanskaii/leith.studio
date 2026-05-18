import {
	createFileRoute,
	Outlet,
	Link,
	useLocation
} from "@tanstack/react-router";
import { cn } from "@workspace/ui/lib/cn";

export const Route = createFileRoute("/(app)/_app/account")({
	component: AccountLayout
});

function AccountLayout() {
	const location = useLocation();

	const checkActive = (path: string) => {
		return location.pathname.includes(path);
	};

	const navItems = [
		{ name: "Profile", path: "/account/profile" },
		{ name: "Security", path: "/account/security" },
		{ name: "API Keys", path: "/account/api-key" },
		{ name: "Billing", path: "/account/billing" }
	];

	return (
		<div className="flex flex-col gap-10 w-full max-w-2xl mx-auto min-h-screen">
			<div className="w-full flex-shrink-0 flex flex-col items-center text-center gap-1.5">
				<h1 className="text-2xl font-semibold text-foreground">
					Account Settings
				</h1>
				<p className="text-sm text-muted-foreground">
					Manage your Account
				</p>
			</div>

			<div className="w-full flex flex-col">
				<nav className="flex items-center gap-6 w-full border-b border-border overflow-x-auto">
					{navItems.map((item) => (
						<Link
							key={item.path}
							to={item.path}
							className={cn(
								"pb-3 text-sm transition-colors whitespace-nowrap border-b-2 -mb-[1px]",
								checkActive(item.path)
									? "border-foreground text-foreground font-medium"
									: "border-transparent hover:text-foreground text-muted-foreground font-medium"
							)}
						>
							{item.name}
						</Link>
					))}
				</nav>
			</div>

			<main className="flex-1 pt-2">
				<Outlet />
			</main>
		</div>
	);
}
