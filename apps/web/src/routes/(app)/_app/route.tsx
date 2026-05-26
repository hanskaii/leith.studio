import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { AppLayout } from "@/routes/-components/layouts/app-layout";
import { AppModalProvider } from "@/routes/-components/providers/app-modal-provider";
import { sessionsOptions } from "@/routes/-fn/auth";
import { SidebarInset, SidebarProvider } from "@workspace/ui";
import { AppSidebar } from "@/routes/-components/layouts/app-sidebar";
import type { MenuResponse } from "@/types/menu";

const MENU_CONFIG: MenuResponse = [
	{
		type: "user",
		groups: [
			{
				label: "UTAMA",
				items: [
					{ title: "Beranda", url: "/dashboard", icon: "Home01Icon" },
					{
						title: "Studio",
						url: "/studio",
						icon: "FolderLibraryIcon"
					},
					{ title: "Dompet", url: "/wallet", icon: "Wallet03Icon" }
				]
			},
			{
				label: "RIWAYAT",
				items: [
					{
						title: "Donasi",
						url: "/history/donations",
						icon: "FavouriteIcon"
					},
					{
						title: "Pesanan",
						url: "/history/orders",
						icon: "ShoppingBag01Icon"
					},
					{
						title: "Membership",
						url: "/history/memberships",
						icon: "StarIcon"
					}
				]
			}
		]
	},
	{
		type: "admin",
		groups: [
			{
				label: "ADMIN",
				items: [
					{
						title: "Overview",
						url: "/overview",
						icon: "DashboardSpeed01Icon"
					},
					{
						title: "Users",
						url: "/users",
						icon: "UserMultiple02Icon"
					},
					{ title: "Events", url: "/events", icon: "Activity01Icon" }
				]
			}
		]
	}
];

const appSearchSchema = z.object({
	modal: z.enum(["settings"]).optional(),
	tab: z.enum(["profile", "general", "security", "api-keys"]).optional()
});

export const Route = createFileRoute("/(app)/_app")({
	validateSearch: (search) => appSearchSchema.parse(search),
	beforeLoad: async ({ context, location }) => {
		const session = await context.queryClient.fetchQuery({
			...sessionsOptions(),
			staleTime: 0
		});

		if (!session?.user) {
			throw redirect({
				to: "/login",
				search: {
					redirect: location.href
				}
			});
		}

		return { session };
	},
	component: LayoutComponent
});

function LayoutComponent() {
	const { session } = Route.useRouteContext();
	const userRole = session.user.role ?? "user";
	const matched =
		MENU_CONFIG.find((c) => c.type === userRole) ??
		MENU_CONFIG.find((c) => c.type === "user");
	const menus = matched?.groups ?? [];

	return (
		<div className="[&_[data-slot='sidebar-container']]:!sticky [&_[data-slot='sidebar-container']]:!top-0 [&_[data-slot='sidebar-container']]:!z-[3] [&_[data-slot='sidebar-container']]:!left-0 [&_[data-slot='sidebar-container']]:!inset-y-[unset] mx-auto w-full max-w-7xl bg-background [--header-height:calc(--spacing(14))]">
			<AppModalProvider>
				<SidebarProvider>
					<AppSidebar
						className="pt-6"
						user={session.user}
						menus={menus}
					/>
					<SidebarInset>
						<AppLayout />
					</SidebarInset>
				</SidebarProvider>
			</AppModalProvider>
		</div>
	);
}
