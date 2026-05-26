import { HugeiconsIcon } from "@hugeicons/react";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem
} from "@workspace/ui";
import { Link } from "@tanstack/react-router";

type NavItem = {
	title: string;
	url: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	icon: any;
};

export function NavMain({
	items,
	groupLabel
}: {
	items: NavItem[];
	groupLabel?: string;
}) {
	return (
		<SidebarGroup>
			{groupLabel && <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>}
			<SidebarGroupContent>
				<SidebarMenu>
					{items.map((item) => (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton asChild>
								<Link
									to={item.url}
									activeProps={{
										className:
											"bg-sidebar-accent text-sidebar-accent-foreground font-medium"
									}}
									activeOptions={{ exact: true }}
								>
									{item.icon && (
										<HugeiconsIcon
											icon={item.icon}
											strokeWidth={2}
											className="size-4"
										/>
									)}
									<span>{item.title}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
