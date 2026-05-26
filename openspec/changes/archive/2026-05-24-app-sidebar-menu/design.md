## Context

The `AppSidebar` component was scaffolded but never completed. It references `@jajan/ui` (an alias that doesn't exist — the correct package is `@workspace/ui`), `NavMain`/`NavUser` sub-components that don't exist, a `MenuResponse` type from `@/types/menu` that doesn't exist, and a `getIconByName` utility that doesn't exist anywhere in the codebase.

The layout route (`route.tsx`) passes `menus={[]}` with an empty array but `AppSidebar` expects a typed `MenuResponse`. As a result the sidebar is structurally present but renders no navigation.

## Goals / Non-Goals

**Goals:**

- Make the sidebar render correctly with 5 nav items across 2 groups for `type: "user"` role
- Fix all broken imports and missing files
- Support future role-based menu variants (e.g., `type: "admin"`) without changing the sidebar component itself
- Active link state on nav items

**Non-Goals:**

- Collapsible sub-menu items (no items have nested `items` in the current config)
- Fetching menu config from the API — config is static in `route.tsx`
- Admin-specific menus (no admin group defined yet)

## Decisions

### D1: Type structure — `type`+`groups` vs flat `data`

The current `transformMenuData` expected `response.data.map(group => ...)` implying `{ data: Group[] }`. The actual menu data from the user uses `[{ type, groups }]` — a role-indexed array.

**Decision**: Redefine `MenuResponse` as `MenuConfig[]` where each entry has `type: string` (maps to user role) and `groups: MenuGroup[]`. `route.tsx` filters the config to the current user's role and passes the matching `MenuGroup[]` down. `AppSidebar` receives a flat `MenuGroup[]` and no longer needs to filter.

**Rationale**: Keeps `AppSidebar` dumb — it just renders what it receives. Role filtering belongs at the route level where `session.user.role` is available.

### D2: Icon lookup — registry map over dynamic import

Icons are referenced by string name (e.g., `"Home01Icon"`). Two options:

- **Registry map**: A `Record<string, IconType>` with explicit imports of the 5 needed icons
- **Dynamic import**: Runtime `import()` of icon chunks

**Decision**: Registry map in `apps/web/src/routes/-lib/icons.ts`. Explicit imports are tree-shakeable, type-safe, and synchronous — no async needed for a static config.

**Icons registered**: `Home01Icon`, `Wallet03Icon`, `FavouriteIcon`, `ShoppingBag01Icon`, `StarIcon` (all from `@hugeicons/core-free-icons`).

### D3: Active link state — `useMatch` over manual comparison

`NavMain` items link to routes. Active state needs to reflect current location.

**Decision**: Use TanStack Router's `Link` component with its built-in `activeProps` / `activeOptions` to apply active styling. No manual `useMatch` needed — `Link` handles it natively.

### D4: NavUser dropdown actions

Footer user card needs Settings and Sign out.

**Decision**: Use `DropdownMenu` from `@workspace/ui` with two items:

- **Pengaturan** → links to `/?modal=settings` (existing settings modal via search param)
- **Keluar** → calls `authClient.signOut()` then redirects to `/login`

## Risks / Trade-offs

- **`@jajan/ui` import** — if any other file in the project uses this alias, fixing only `app-sidebar.tsx` would leave others broken. The grep in exploration found no other files use it.
- **Static menu config** — if the app eventually needs server-driven menus (per-user feature flags, dynamic items), `MENU_CONFIG` in `route.tsx` would need to become a server function call. The `MenuResponse` type is designed to accommodate this without interface changes.
- **Role default** — if `session.user.role` is `null` or undefined (possible for new users before role assignment), filtering finds no match. Fallback: default to `"user"` type.
