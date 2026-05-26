## 1. Delete dead routes

- [x] 1.1 Deleted `apps/web/src/routes/(app)/_app/chat/`
- [x] 1.2 Deleted `apps/web/src/routes/(app)/_app/creator/`
- [x] 1.3 Deleted `apps/web/src/routes/(app)/_app/studio/review/`

## 2. Move admin routes from /s/\* to flat URLs

- [x] 2.1 Moved users to `_app/users/`
- [x] 2.2 Moved events to `_app/events/` (incl. `-lib/event-utils.ts`)
- [x] 2.3 Added `beforeLoad` admin guard via `Gate.can("admin.access", { actor: session.user })`
- [x] 2.4 Imports OK (no relative path shifts needed)

## 3. Merge /s/overview into /overview

- [x] 3.1 Extracted admin overview into `_app/overview/-components/admin-overview.tsx`
- [x] 3.2 Created `creator-overview-placeholder.tsx` (empty state, "coming soon")
- [x] 3.3 Updated `overview/index.tsx` to branch on role

## 4. Dissolve \_admin layout

- [x] 4.1 Deleted `apps/web/src/routes/(app)/_admin/` entirely

## 5. Update sidebar MENU_CONFIG

- [x] 5.1 Added `{ type: "admin", groups: [...] }` to MENU_CONFIG (Overview/Users/Events)
- [x] 5.2 Role filter in `LayoutComponent` already matches by role correctly
- [x] 5.3 Icons added to registry: `Activity01Icon`, `DashboardSpeed01Icon`, `UserMultiple02Icon`

## 6. Audit hard-coded URLs

- [x] 6.1 Grep `/s/*` — only `routeTree.gen.ts` had stale refs (regenerated)
- [x] 6.2 Updated `app-user-menu.tsx` admin items to flat URLs
- [x] 6.3 Updated `studio-agent-header.tsx` (removed `/studio/review` link → `/overview`); recovered `chat-message.tsx` + `tool-part-view.tsx` into `studio/agent/-components/`

## 7. Verification

- [x] 7.1 `pnpm tsc --noEmit` passes cleanly on both apps
- [ ] 7.2 Manual test: admin sees admin items (user verification)
- [ ] 7.3 Manual test: user blocked from admin URLs (user verification)
- [ ] 7.4 Manual test: `/overview` admin vs creator branch (user verification)
- [ ] 7.5 Manual test: old URLs 404 cleanly (user verification)
