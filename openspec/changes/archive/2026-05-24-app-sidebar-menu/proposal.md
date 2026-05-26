## Why

The `(app)/_app` layout has an `AppSidebar` component that is currently non-functional: it references non-existent packages (`@jajan/ui`), missing component files (`nav-main.tsx`, `nav-user.tsx`), a missing type (`MenuResponse`), and a missing icon utility (`getIconByName`). The sidebar renders nothing and the menu config in `route.tsx` is an empty array.

## What Changes

- Create `apps/web/src/types/menu.ts` — `MenuItem`, `MenuGroup`, `MenuConfig`, and `MenuResponse` type definitions
- Create `apps/web/src/routes/-lib/icons.ts` — `getIconByName` registry mapping icon name strings to Hugeicons icon objects
- Create `apps/web/src/routes/-components/layouts/nav-main.tsx` — renders a labeled sidebar group with nav items (icon + title + active link state)
- Create `apps/web/src/routes/-components/layouts/nav-user.tsx` — renders the user avatar/name footer card with a dropdown for Settings and Sign out
- Fix `apps/web/src/routes/-components/layouts/app-sidebar.tsx` — replace broken `@jajan/ui` imports with `@workspace/ui`, update `transformMenuData` to handle the `type`+`groups` structure
- Update `apps/web/src/routes/(app)/_app/route.tsx` — define `MENU_CONFIG` with the full user menu, filter by `session.user.role`, pass filtered groups to `AppSidebar`

## Capabilities

### New Capabilities

- `app-sidebar-nav`: Role-filtered sidebar navigation with grouped menu items, active link highlighting, icon support, and a user footer with sign-out

### Modified Capabilities

<!-- none — no existing spec-level behavior is changing -->

## Impact

- **Files modified**: `route.tsx`, `app-sidebar.tsx`
- **Files created**: `types/menu.ts`, `-lib/icons.ts`, `nav-main.tsx`, `nav-user.tsx`
- **Dependencies**: `@workspace/ui` (sidebar primitives, avatar, dropdown), `@hugeicons/core-free-icons` (icon objects), `@tanstack/react-router` (Link + useMatch for active state)
- **No API changes** — purely frontend layout wiring
