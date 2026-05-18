## 1. Foundation & Permissions

- [x] 1.1 Add `member` role to `ROLE_PERMISSIONS` in `config/permissions.ts` with permissions `content:read` and `license:activate`
- [x] 1.2 Add `content:manage` permission to `admin` role in `config/permissions.ts`
- [x] 1.3 Add `content.read`, `content.manage`, and `license.activate` Gate actions to `GateActions` interface in `config/index.ts`
- [x] 1.4 Create `config/policies/content.ts` with `ContentPolicy.read` (`authorize("content:read")`) and `ContentPolicy.manage` (`authorize("content:manage")`)
- [x] 1.5 Create `config/policies/license.ts` with `LicensePolicy.activate` (`authorize("license:activate")`)
- [x] 1.6 Register new policies in `Gate.policies({...})` in `config/index.ts`

## 2. Database Schema

- [x] 2.1 Add `posts` table to `packages/database/schema.ts` with columns: `id` (cuid), `slug` (text, unique), `title` (text), `body` (text), `coverImage` (text, nullable), `tags` (text, JSON array), `status` (text: `"draft"` | `"published"`), `publishedAt` (integer, nullable), `createdAt` (integer), `updatedAt` (integer)
- [x] 2.2 Run `pnpm db:generate` to generate the migration
- [ ] 2.3 Run `pnpm db:migrate` (local) to apply the migration to the local D1 dev database (requires running `wrangler dev` first to create .wrangler state directory)

## 3. API — Content Routes

- [x] 3.1 Create `apps/api/src/handlers/posts.handler.ts` with `GET /` (paginated published posts, auth + `content:read`), `GET /stats` (public), `GET /:slug` (single published post, auth + `content:read`)
- [x] 3.2 Implement slug uniqueness helper in `apps/api/src/lib/slug.ts` (kebab-case from title, append suffix on collision)
- [x] 3.3 Create `apps/api/src/handlers/creator.handler.ts` with `GET /posts`, `POST /posts`, `PATCH /posts/:id`, `DELETE /posts/:id`, `POST /upload` — all auth + `content:manage`
- [x] 3.4 Implement R2 upload logic in `creator.handler.ts`: validate file type (JPEG/PNG/WebP) and size (≤5MB), put to R2 bucket, return public URL
- [x] 3.5 Use `ApiResponse.ok/created` for all success responses; throw `ApiError.*` for all error cases (no manual `c.json()`)
- [x] 3.6 Register both handlers in `apps/api/src/contract.ts` under `/api/v1/posts` and `/api/v1/creator`; export updated `AppType`

## 4. API — License Key Routes

- [x] 4.1 Create `apps/api/src/handlers/license.handler.ts` with `POST /activate` (auth required, `license:activate` Gate check)
- [x] 4.2 Implement key validation logic: call Dodo Payments SDK to validate the key, check if already used, upgrade user role to `member` via `authClient.admin.setRole`, handle idempotency (already-member case)
- [x] 4.3 Add the license handler to `apps/api/src/contract.ts` under `/api/v1/license`

## 5. Web — Server Functions

- [x] 5.1 Create `apps/web/src/routes/-fn/posts.ts` with `getPostsFn` (feed list), `getPostFn` (single post by slug), `getPostStatsFn` (public stats) — all wrapped in `handleError()`
- [x] 5.2 Create `apps/web/src/routes/-fn/creator.ts` with `getCreatorPostsFn`, `createPostFn`, `updatePostFn`, `deletePostFn`, `uploadImageFn`
- [x] 5.3 Create `apps/web/src/routes/-fn/license.ts` with `activateLicenseFn`

## 6. Web — Landing Page

- [x] 6.1 Create `apps/web/src/routes/index.tsx` (public `/` route, no auth guard in `beforeLoad`) with `pendingComponent` skeleton
- [x] 6.2 Build hero section: asymmetric split layout (left: headline + CTA, right: teaser grid) using DESIGN.md — warm paper base, terracotta accent, Space Grotesk headline
- [x] 6.3 Build locked content preview section: 3 blurred post cards with lock icon overlay
- [x] 6.4 Build stats section showing `postCount` from `getPostStatsFn` (hidden on error)
- [x] 6.5 Wire "Get Access" CTA to Dodo Payments checkout URL (env var `VITE_DODO_CHECKOUT_URL`); replace CTA with "Go to feed" when user is `member`/`admin`
- [x] 6.6 Add Framer Motion staggered reveal animations on landing page sections

## 7. Web — License Key Activation Page

- [x] 7.1 Create `apps/web/src/routes/(app)/_app/activate.tsx` with `beforeLoad` redirecting unauthenticated users to `/login?redirect=/activate`
- [x] 7.2 Build activation form: single `Input` for key, submit `Button` with `Spinner` while pending, inline `FieldError` below input on error — using `useForm` + `useMutation` pattern
- [x] 7.3 On success: show `toast.success("Access granted!")`, invalidate session query, navigate to `/feed`
- [x] 7.4 Handle "already a member" response: show `toast.success("You already have access.")` and redirect to `/feed`

## 8. Web — Member Content Feed

- [x] 8.1 Create `apps/web/src/routes/(app)/_app/feed/index.tsx` with `beforeLoad` asserting `Gate.can("content.read", { actor: user })`; redirects to `/activate`
- [x] 8.2 Build `<PostCard>` component in `feed/-components/post-card.tsx`: cover image, title, tag `<Badge>` list, relative published date
- [x] 8.3 Build feed grid using asymmetric CSS Grid (`grid-template-columns: 2fr 1fr` on `md:`) with `<Suspense fallback={<FeedSkeleton />}>`
- [x] 8.4 Implement tag filter bar above grid (derived from fetched post tags); updates `?tag=` search param
- [x] 8.5 Implement `<Pagination>` component at bottom updating `?page=` search param; uses `useSuspenseQuery` with page/tag params as query keys

## 9. Web — Individual Post Page

- [x] 9.1 Create `apps/web/src/routes/(app)/_app/feed/$slug.tsx` with same `beforeLoad` Gate assertion as feed
- [x] 9.2 Fetch post via `getPostFn(slug)` with `useSuspenseQuery`; wrap in `<Suspense fallback={<PostSkeleton />}>`
- [x] 9.3 Render post: full-width cover image (aspect-ratio 16:9), title (display scale tracking-tighter), tag badges, formatted date, body via TipTap read-only editor
- [x] 9.4 Add "Back to feed" link that preserves previous `?page=` and `?tag=` state via TanStack Router `search` param passthrough
- [x] 9.5 Install `@tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-image` via `pnpm add` in `apps/web`

## 10. Web — Creator Dashboard

- [x] 10.1 Create `apps/web/src/routes/(app)/_app/creator/index.tsx` with `beforeLoad` asserting `Gate.can("content.manage", { actor: user })`
- [x] 10.2 Build posts management `<Table>` with columns: Title, Status (badge), Published At, Actions (Edit / Publish / Unpublish / Delete buttons)
- [x] 10.3 Implement Publish/Unpublish as inline `useMutation` calls with optimistic `toast` feedback and query invalidation
- [x] 10.4 Implement Delete with `<AlertDialog>` confirmation before calling `deletePostFn`
- [x] 10.5 Create `apps/web/src/routes/(app)/_app/creator/$id.tsx` (edit/create post form route)
- [x] 10.6 Build split-pane post editor: left pane (`useForm` with title `Input`, tags `Input`, cover image upload zone, body TipTap editor), right pane (live TipTap preview)
- [x] 10.7 Implement cover image upload: file input triggers `uploadImageFn`, preview thumbnail renders after upload, URL stored in form field
- [x] 10.8 Wire "Save Draft" and "Publish" buttons to `createPostFn`/`updatePostFn` with correct `status` field; show `Spinner` while `mutation.isPending`

## 11. Design Polish

- [x] 11.1 Run `npx impeccable teach` to set up PRODUCT.md and DESIGN.md for the funnnit-clone brand context (completed in prior session)
- [x] 11.2 Apply consistent typography: Space Grotesk Variable + Instrument Sans Variable; set in `packages/ui/src/styles/globals.css`
- [x] 11.3 Configure shadcn theme tokens in globals.css: Funnnit Amber Archive palette (terracotta primary, warm paper background, OKLCH neutrals)
- [ ] 11.4 Add Framer Motion page-entry animations on feed, post, and creator routes (staggered children, `layout` props on card grid for smooth pagination transitions)
- [ ] 11.5 Run `/impeccable polish` on landing page and feed page; address any flagged issues
- [x] 11.6 Ensure all new pages pass responsive checks: single-column layout on `< 768px`, no `h-screen` (use `min-h-[100dvh]`), no horizontal scroll

## 12. Wiring & Config

- [x] 12.1 Add `DODO_LICENSE_PRODUCT_ID` and `DODO_CHECKOUT_URL` to `apps/api/.dev.vars.example` and `apps/web/.env.example`; document in example files
- [x] 12.2 R2 bucket binding: existing `STORAGE` binding in `wrangler.jsonc` is reused for content images (consistent with upload.service.ts pattern)
- [x] 12.3 Register new Gate event in `apps/api/src/boot.ts`: `Gate.after("license.activated", ...)` to log activation
- [x] 12.4 Verify `AppType` export from `contract.ts` covers all new routes; `apps/api` tsc passes clean
- [ ] 12.5 Run `pnpm test` and fix any failing tests; write unit tests for slug generation helper and Gate policies (`content.read`, `license.activate`)
