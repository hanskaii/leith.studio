import { UserCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem
} from "@workspace/ui";
import { Link } from "@tanstack/react-router";
import type * as React from "react";
import type { MenuGroup } from "@/types/menu";
import { getIconByName } from "@/routes/-lib/icons";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

function transformMenuData(groups: MenuGroup[]) {
	return groups.map((group) => ({
		label: group.label,
		items: group.items.map((item) => ({
			...item,
			icon: getIconByName(item.icon),
			items: item.items ?? undefined
		}))
	}));
}

export function AppSidebar({
	user,
	menus,
	...props
}: React.ComponentProps<typeof Sidebar> & {
	user: {
		name: string;
		email: string;
		username?: string | null;
		image?: string | null;
	};
	menus: MenuGroup[];
}) {
	const menuGroups = transformMenuData(menus);

	return (
		<Sidebar {...props} variant="sidebar">
			<SidebarHeader className="py-3">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							{user?.username ? (
								<a href={`/@${user.username}`}>
									<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
										<HugeiconsIcon
											icon={UserCircleIcon}
											strokeWidth={2}
											className="size-4"
										/>
									</div>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-medium">
											Lihat Halaman
										</span>
										<span className="truncate text-xs">
											{`@${user.username}`}
										</span>
									</div>
								</a>
							) : (
								<Link to="/account/profile">
									<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
										<HugeiconsIcon
											icon={UserCircleIcon}
											strokeWidth={2}
											className="size-4"
										/>
									</div>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-medium">
											Lihat Halaman
										</span>
										<span className="truncate text-xs">
											Setup Profile
										</span>
									</div>
								</Link>
							)}
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				{menuGroups.map((group, index) => (
					<NavMain
						key={group.label || `group-${index}`}
						items={group.items}
						groupLabel={group.label || undefined}
					/>
				))}
			</SidebarContent>
			<SidebarFooter>
				<NavUser
					user={{
						name: user.name,
						email: user.email,
						avatar: user.image || ""
					}}
				/>
			</SidebarFooter>
		</Sidebar>
	);
}
