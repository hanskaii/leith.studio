import React from "react";
import { cn } from "@workspace/ui/lib/cn";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from "@workspace/ui";
import { Link } from "@tanstack/react-router";
import { useLogoutMutation } from "@/routes/-fn/auth";
import { hasPermission } from "@workspace/config";
import {
	Book02Icon,
	Mail01Icon,
	DashboardSpeed01Icon,
	UserMultiple02Icon,
	Calendar01Icon,
	Home01Icon,
	Logout01Icon,
	Settings01Icon
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function AppUserMenu({ user }: { user?: any }) {
	const fallbackName = user?.name?.substring(0, 2)?.toUpperCase() || "AC";
	const { logout } = useLogoutMutation();

	interface MenuItem {
		label: string;
		to?: string;
		href?: string;
		onClick?: () => void;
		icon: any;
		iconClassName?: string;
		danger?: boolean;
	}

	const menuSections: MenuItem[][] = [
		[
			{
				label: "Account",
				to: "/account/profile",
				icon: Settings01Icon,
				iconClassName: "text-muted-foreground/60"
			}
		],
		hasPermission(user?.role, "admin:access")
			? [
					{
						label: "Overview",
						to: "/s/overview",
						icon: DashboardSpeed01Icon
					},
					{
						label: "Users",
						to: "/s/users",
						icon: UserMultiple02Icon
					},
					{ label: "Events", to: "/s/events", icon: Calendar01Icon }
				]
			: [
					{ label: "Docs", href: "/docs", icon: Book02Icon },
					{ label: "Contact", to: "/contact", icon: Mail01Icon }
				],
		[
			{ label: "Homepage", to: "/", icon: Home01Icon },
			{
				label: "Log out",
				onClick: () => logout(),
				icon: Logout01Icon,
				danger: true
			}
		]
	];

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="rounded-full h-8 w-8 text-muted-foreground/50 hover:text-foreground"
				>
					<Avatar className="h-8 w-8">
						<AvatarImage src={user?.avatar || ""} />
						<AvatarFallback>{fallbackName}</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-55 p-1.5 space-y-0.5">
				<div className="flex items-center justify-start gap-2.5 p-1.5 mb-1.5">
					<Avatar className="h-8 w-8">
						<AvatarImage src={user?.avatar || ""} />
						<AvatarFallback>{fallbackName}</AvatarFallback>
					</Avatar>
					<div className="flex flex-col space-y-0.5 leading-tight">
						<p className="font-medium text-sm">
							{user?.name || "Account"}
						</p>
						{user?.email && (
							<p className="w-35 truncate text-xs text-muted-foreground">
								{user.email}
							</p>
						)}
					</div>
				</div>

				{menuSections.map((section, sectionIdx) => (
					<React.Fragment key={sectionIdx}>
						<DropdownMenuSeparator className="-mx-1.5 opacity-60" />
						{section.map((item) => (
							<DropdownMenuItem
								key={item.label}
								asChild={!!(item.to || item.href)}
								className="flex justify-between cursor-pointer py-1.5 px-2"
								onClick={item.onClick}
							>
								{item.to ? (
									<Link to={item.to}>
										<span className="text-sm">
											{item.label}
										</span>
										<HugeiconsIcon
											icon={item.icon}
											className={cn(
												item.iconClassName ||
													"size-4 text-muted-foreground"
											)}
										/>
									</Link>
								) : item.href ? (
									<a href={item.href}>
										<span className="text-sm">
											{item.label}
										</span>
										<HugeiconsIcon
											icon={item.icon}
											className={cn(
												item.iconClassName ||
													"size-4 text-muted-foreground"
											)}
										/>
									</a>
								) : (
									<>
										<span
											className={cn(
												"text-sm",
												item.danger &&
													"text-red-600 dark:text-red-500 font-medium"
											)}
										>
											{item.label}
										</span>
										<HugeiconsIcon
											icon={item.icon}
											className={cn(
												item.danger
													? "size-4 text-red-600 dark:text-red-500"
													: item.iconClassName ||
															"size-4 text-muted-foreground"
											)}
										/>
									</>
								)}
							</DropdownMenuItem>
						))}
					</React.Fragment>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
