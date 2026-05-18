import { Link } from "@tanstack/react-router";
import { AppUserMenu } from "./app-user-menu";
import { ThemeToggle } from "./theme-toggle";

export function AppNavigation({ user }: { user?: any }) {
	return (
		<header className="flex h-14 items-center justify-between border-b px-4 lg:px-6">
			<div className="flex items-center gap-4">
				<Link
					to="/"
					className="flex flex-shrink-0 items-center justify-center border-[3px] border-foreground rounded-full h-6 w-6 hover:opacity-80 transition-opacity"
				>
					{/* Logo */}
				</Link>
			</div>

			<div className="flex items-center gap-2">
				<ThemeToggle />
				<AppUserMenu user={user} />
			</div>
		</header>
	);
}
