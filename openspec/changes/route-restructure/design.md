## Context

Today the app has two layouts:

- `_app/` — sidebar+main shell for authenticated members/creators
- `_admin/` — separate shell for admin routes under `/s/` prefix

These layouts duplicate sidebar, header, and `beforeLoad` patterns. The `/s/` URL prefix is opaque (users wonder what `s` means), and the split forces admin to context-switch between two layouts when navigating between admin tools and their own account.

Several routes are also being removed as part of the broader platform redesign:

- `/chat` — never wired into the main UX
- `/creator` + `/creator/$id` — replaced by the upcoming unified `/studio` workspace
- `/studio/review` — also superseded by the new `/studio`

This change handles only the structural reshuffling. The new `/studio` UI is a separate change (`studio-file-management`).

## Goals / Non-Goals

**Goals:**

- One layout (`_app`) for all authenticated routes — member, creator, admin
- Flat admin URLs (`/users`, `/events`) — no `/s/` prefix
- Role-based sidebar — admin sees additional items; users see only the user variant
- Role-based `/overview` — admin sees existing admin dashboard, creator sees a placeholder
- Single `Gate.assert` pattern in `beforeLoad` for admin guards

**Non-Goals:**

- Creator overview implementation — placeholder only; real implementation is a future change
- New `/studio` UI — separate change
- Backend API changes — none, only frontend routing
- Backward-compatible redirects from `/s/*` — explicit BREAKING; old URLs return 404

## Decisions

### D1: Single layout via role-based sidebar, not separate layouts

Two ways to support admin content:

- **Keep separate layouts** with shared components — visual consistency but duplicated `beforeLoad`/sidebar wiring
- **One layout, conditional sidebar items** — single source of truth, sidebar reads `session.user.role` to decide which menu groups to render

**Decision**: Single layout. The `MENU_CONFIG` array in `_app/route.tsx` already supports role-based filtering via the `type` field — adding an `{ type: "admin", groups: [...] }` entry plus a small filter tweak gives admins their additional items without a second layout.

### D2: `/overview` branches by role inside the component

Two ways to serve different content at the same URL:

- **Two separate components** mounted conditionally in the route file
- **One component** that internally branches by role

**Decision**: One component, internal branch. The admin dashboard (formerly `/s/overview`) is moved into a `-components/admin-overview.tsx` co-located file; creator gets a `-components/creator-overview-placeholder.tsx`. The route's `component` renders one or the other based on `session.user.role`.

### D3: Admin guards live in `beforeLoad`, not in components

`Gate.assert("admin:access")` runs in `beforeLoad` for every admin route. A user without admin access is redirected before the component mounts — avoiding flicker. No component-level checks needed.

### D4: `_admin` directory removed entirely, not soft-archived

The TanStack Router file-based plugin discovers routes from the filesystem. Leaving `_admin/` in place would either generate orphan routes or require explicit ignore config. Cleanest: delete the directory. Git history preserves the old code.

## Risks / Trade-offs

- **[Risk] Hard-coded old URLs everywhere** → audit `apps/web/src/**` for any string literal containing `/s/users`, `/s/events`, `/s/overview`, `/chat`, `/creator`; update or remove. Specifically check `app-user-menu.tsx` which has `to: "/s/overview"` etc
- **[Risk] External bookmarks to `/s/*` URLs break** → accepted. This is pre-launch enough that we don't need 301 redirects
- **[Risk] `creator.handler.ts` API endpoint still exists but no UI calls it** → leave the API endpoint for the upcoming `/studio` UI to use (just under a different URL). The frontend `/creator/$id` route is gone but the backend handler stays
- **[Risk] `studio/agent/` continues to exist as `/studio/agent`** → confirmed intentional; keep as-is
- **[Risk] Existing `app-sidebar-nav` spec needs an `admin` MENU_CONFIG entry** → covered in the modified capability; tasks include updating the MENU_CONFIG constant
