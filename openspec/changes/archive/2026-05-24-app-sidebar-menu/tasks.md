## 1. Types & Utilities

- [x] 1.1 Create `apps/web/src/types/menu.ts` — define `MenuItem`, `MenuGroup`, `MenuConfig`, `MenuResponse` types matching the `[{ type, groups }]` structure
- [x] 1.2 Create `apps/web/src/routes/-lib/icons.ts` — import `Home01Icon`, `Wallet03Icon`, `FavouriteIcon`, `ShoppingBag01Icon`, `StarIcon` from `@hugeicons/core-free-icons` and export `getIconByName(name: string)` registry lookup

## 2. Sub-Components

- [x] 2.1 Create `apps/web/src/routes/-components/layouts/nav-main.tsx` — accepts `{ items: TransformedItem[], groupLabel?: string }`, renders `SidebarGroup` > `SidebarGroupLabel` (if label) > `SidebarMenu` > `SidebarMenuItem` × items, each as a `Link` with `HugeiconsIcon` and title; use `Link`'s `activeProps` for active styling
- [x] 2.2 Create `apps/web/src/routes/-components/layouts/nav-user.tsx` — accepts `{ user: { name, email, avatar } }`, renders `SidebarMenu` > `SidebarMenuItem` > `DropdownMenuTrigger` with `Avatar` + name/email; dropdown items: "Pengaturan" (navigate to `/?modal=settings`) and "Keluar" (`authClient.signOut()` then redirect to `/login`)

## 3. Fix AppSidebar

- [x] 3.1 Replace all `@jajan/ui` imports with `@workspace/ui` in `app-sidebar.tsx`
- [x] 3.2 Replace `@jajan/ui/utils` import of `getIconByName` with `@/routes/-lib/icons`
- [x] 3.3 Update `transformMenuData` signature to accept `MenuGroup[]` (flat, pre-filtered) instead of `MenuResponse` — remove the `response.data` wrapper
- [x] 3.4 Remove `"use client"` directive (not needed in TanStack Start)
- [x] 3.5 Remove `console.log(user)` debug statement

## 4. Wire Route

- [x] 4.1 Add `MENU_CONFIG: MenuResponse` constant to `route.tsx` with the full user menu (UTAMA: Beranda + Dompet; RIWAYAT: Donasi + Pesanan + Membership)
- [x] 4.2 In `LayoutComponent`, filter `MENU_CONFIG` by `session.user.role` (fallback to `"user"` if no match), extract `.groups`, and pass as `menus` prop to `AppSidebar`
