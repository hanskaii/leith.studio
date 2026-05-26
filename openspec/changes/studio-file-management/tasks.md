## 1. Schema — enrichment status

- [x] 1.1 Added `enrichmentStatus` column to `posts` schema (nullable, enum)
- [ ] 1.2 Run `pnpm db:generate` and `pnpm db:migrate` (user to run after this change)

## 2. API — upload + create endpoint

- [x] 2.1 Added `POST /api/v1/creator/upload` — multipart file → R2 + posts + post_assets + enrichment trigger; returns `{ postId, post }`
- [x] 2.2 Validation: 200MB limit + format whitelist
- [x] 2.3 Fire-and-forget trigger of `AI_ENRICH_WORKFLOW`
- [x] 2.4 Registered via existing creator handler chain (in contract)
- [x] 2.5 Renamed existing `/upload` → `/upload-cover` (still used by cover editor); old `uploadImageFn` updated

## 3. AI enrichment workflow

- [x] 3.1 Created `apps/api/src/workflows/ai-enrich.workflow.ts` — STUB: fills `Untitled upload` + placeholder description, marks done
- [x] 3.2 Reuses the studio-approve update pattern; only fills empty fields so manual edits survive
- [x] 3.3 No retry logic in stub (workflow framework handles retries on throw)
- [x] 3.4 Registered in `wrangler.jsonc` + `index.ts` + `hono.types.ts`

## 4. Web — studio grid

- [x] 4.1 Created `_app/studio/index.tsx` with `?selected` search param
- [x] 4.2 Created `studio-grid.tsx` (fetches via useSuspenseQuery, renders responsive grid)
- [x] 4.3 Created `studio-grid-skeleton.tsx`
- [x] 4.4 Wrapped grid in `<Suspense>` in route file
- [x] 4.5 Added `/studio` entry to user MENU_CONFIG with FolderLibraryIcon

## 5. Web — file card

- [x] 5.1 Created `file-card.tsx` — cover thumb, title, status badge, native checkbox
- [x] 5.2 Badge computation derived from `(status, mediaStatus, enrichmentStatus)`
- [x] 5.3 Click handler updates `?selected` via TanStack Router

## 6. Web — upload zone

- [x] 6.1 Created `upload-zone.tsx` — drag-and-drop + click-to-browse, multi-file
- [x] 6.2 Per-file `uploadStudioFn` call; mutation invalidates posts query on success
- [x] 6.3 Per-file error toast; other files continue

## 7. Web — edit drawer

- [x] 7.1 Created `edit-drawer.tsx` using `Sheet` from `@workspace/ui`
- [x] 7.2 Fields: title, body (textarea), access (free/premium pills)
- [x] 7.3 Save-on-blur for text, immediate for access toggle; PATCH via `useMutation`; toast on error
- [x] 7.4 Close removes `?selected` from URL

## 8. Web — batch publish

- [x] 8.1 Multi-select state in grid (Set<string>)
- [x] 8.2 `action-bar.tsx` appears when 1+ selected; "Publish selected" button + clear
- [x] 8.3 Parallel PATCH for drafts only; summary toast on settle

## 9. Web — enrichment polling

- [x] 9.1 5s setInterval refetch when any visible card is in pending/processing
- [x] 9.2 Cleanup on unmount, paused via document.hidden visibility check

## 10. Verification

- [x] 10.1 Both `pnpm tsc --noEmit` apps pass clean
- [ ] 10.2 Manual: drop 3 files → 3 cards appear → AI titles populate (user verifies)
- [ ] 10.3 Manual: edit drawer → blur → card title updates (user verifies)
- [ ] 10.4 Manual: select drafts → bulk publish (user verifies)
- [ ] 10.5 Manual: refresh with drawer open → drawer reopens (user verifies)
- [ ] 10.6 Verify `/studio/agent` continues to work unchanged (user verifies)
