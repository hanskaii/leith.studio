import {
	Avatar,
	AvatarFallback,
	AvatarImage,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem
} from "@workspace/ui";
import { Logout01Icon, Settings01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { useLogoutMutation } from "@/routes/-fn/auth";

export function NavUser({
	user
}: {
	user: {
		name: string;
		email: string;
		avatar: string;
	};
}) {
	const { logout } = useLogoutMutation();
	const fallback = user.name?.substring(0, 2)?.toUpperCase() || "AC";

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<Avatar className="h-8 w-8 rounded-lg">
								<AvatarImage
									src={user.avatar}
									alt={user.name}
								/>
								<AvatarFallback className="rounded-lg">
									{fallback}
								</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">
									{user.name}
								</span>
								<span className="truncate text-xs text-muted-foreground">
									{user.email}
								</span>
							</div>
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						side="top"
						align="start"
						className="w-56 p-1.5"
					>
						<DropdownMenuItem asChild className="cursor-pointer">
							<Link to="/" search={{ modal: "settings" }}>
								<HugeiconsIcon
									icon={Settings01Icon}
									strokeWidth={2}
									className="size-4"
								/>
								<span>Pengaturan</span>
							</Link>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							className="cursor-pointer text-red-600 dark:text-red-500 focus:text-red-600 dark:focus:text-red-500"
							onClick={() => logout()}
						>
							<HugeiconsIcon
								icon={Logout01Icon}
								strokeWidth={2}
								className="size-4"
							/>
							<span>Keluar</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
