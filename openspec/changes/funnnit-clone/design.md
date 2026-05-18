## Context

This is a greenfield feature set building a Leith-style member-only content platform on top of the existing Tanflare monorepo stack (Hono API on Cloudflare Workers, TanStack Start, better-auth, Drizzle + D1, Dodo Payments).

The platform targets a single creator publishing AI image creation breakdowns and tutorials. Access is sold once as a license key (no recurring subscription) via Dodo Payments' license key product. Members get permanent access after key activation.

Skills driving the UI implementation: `impeccable` (production-grade frontend craft), `shadcn` (component system), `design-taste-frontend` (post-cringe, asymmetric, DESIGN_VARIANCE:8 / MOTION_INTENSITY:6 aesthetic).

## Goals / Non-Goals

**Goals:**

- Public landing page that converts visitors to license key buyers
- License key purchase via Dodo Payments checkout, one-time product
- Key activation flow: user enters key → server validates via Dodo API → user role upgraded to `member`
- Member-only content feed (paginated posts) and individual post pages
- Creator (admin) dashboard for authoring and publishing posts
- Full Gate/RBAC authorization using existing policy pattern
- Design: "post-cringe" bold aesthetic — asymmetric layouts, kinetic typography, high DESIGN_VARIANCE

**Non-Goals:**

- Multi-creator support (single creator platform)
- Recurring subscription billing (license key = one-time purchase only)
- Comments, likes, or social features
- Email newsletter / drip campaigns
- Video hosting (images + text only in V1)
- Mobile app

## Decisions

### D1: License Key Model via Dodo Payments

**Decision**: Use Dodo Payments' License Keys product rather than a subscription plan.

**Rationale**: A one-time purchase removes subscription fatigue, fits the "pay once, access forever" positioning of the platform, and maps cleanly to `better-auth`'s `dodopayments` plugin's license key support. The existing `authClient.licenseKey.*` methods handle the end-to-end flow without custom webhooks for access control.

**Alternatives considered**:

- Recurring subscription: More revenue over time but friction for buyers; also more complex state management (`active` / `canceled` / `past_due`).
- Manual payment + code distribution: No automation; not scalable.

### D2: Role Upgrade Pattern for Access

**Decision**: On successful key activation, call `authClient.admin.setRole(userId, "member")`. The `member` role is added to `ROLE_PERMISSIONS` with `content:read` and `license:activate` permissions.

**Rationale**: Fits the existing Gate/RBAC pattern exactly. Gate policies check `actor.role` via `authorize("content:read")`. No custom session fields needed.

**Alternatives considered**:

- Store `licenseKeyActivated: boolean` on the user record: Requires a new `additionalField`, adds session bloat, and bypasses the permission system.
- Check Dodo API on every request: Adds latency; unnecessary after initial activation.

### D3: Content Storage — D1 + R2 for Images

**Decision**: Post body stored as Markdown in D1 `posts.body` (TEXT). Cover images and inline images uploaded to R2 via a creator upload endpoint, stored as R2 URLs.

**Rationale**: D1 TEXT column handles rich post body cheaply. R2 avoids base64 bloat in the DB and gives a CDN-like URL for images. Keeps the existing `packages/database` pattern.

**Alternatives considered**:

- MDX stored in D1: Extra parse complexity at runtime; overkill for single-creator publishing.
- External CMS (Contentful, Sanity): Introduces an external dependency; the creator dashboard already gives a sufficient editing experience.

### D4: Post Slug — Derived from Title at Creation

**Decision**: Slug is auto-generated from the title (kebab-case, unique) at creation time and is immutable once published.

**Rationale**: Avoids broken links after publish. Creator can edit title in draft state before publishing.

### D5: Frontend Route Structure

**Decision**:

```
/                           → public landing page
/activate                   → license key activation (auth required)
/(app)/_app/feed            → member-only content feed
/(app)/_app/posts/$slug     → individual post page
/(app)/_app/creator         → creator dashboard (admin only)
/(app)/_app/creator/$id     → edit single post
```

**Rationale**: Fits existing TanStack Router file convention. `/(app)/_app/` routes already have `authMiddleware` + `Gate.assert("app.use")` in `beforeLoad`. Member and creator routes add their own `beforeLoad` Gate assertions on top.

### D6: Design System — Impeccable + shadcn + design-taste-frontend

**Decision**: Apply `design-taste-frontend` baseline (DESIGN_VARIANCE:8, MOTION_INTENSITY:6, VISUAL_DENSITY:4) using shadcn/ui components customized with a "post-cringe" palette — off-black base (`zinc-950`), a single high-saturation accent (electric rose or chartreuse), Satoshi or Geist font, aggressive asymmetric layouts.

**Rationale**: leith's brand is intentionally "chill and fun, post-cringe." This maps to high design variance (asymmetric), moderate motion (fluid CSS transitions, Framer Motion reveals), and low-medium density (content-first, airy).

## Risks / Trade-offs

- **License key replay attacks** → Mitigation: Dodo Payments keys are single-use by default; server validates via Dodo API and marks used before upgrading role. Add idempotency check on the activation endpoint.
- **D1 full-text search on posts** → D1 doesn't support FTS. For V1, limit feed to date-sorted pagination with tag filtering. Add FTS in a later iteration via Cloudflare Vectorize or D1 FTS extension.
- **R2 upload without direct upload** → Creator upload goes through the Worker (memory limit 128MB). Sufficient for images. If video is added later, switch to R2 presigned URLs.
- **Markdown XSS in post body** → Sanitize with `DOMPurify` (or `rehype-sanitize`) on render in the web app. Body stored raw; sanitization happens at render time.

## Migration Plan

1. Add `member` role to `ROLE_PERMISSIONS` and `config/index.ts`.
2. Run `pnpm db:generate` + `pnpm db:migrate` for new `posts` table.
3. Deploy API with new routes (no traffic impact — new routes only).
4. Deploy web with new routes (landing replaces any existing `/` route).
5. Create Dodo Payments License Key product; copy product ID to env.

**Rollback**: Drop `posts` table migration. Revert role additions. New routes can be removed without affecting existing auth or billing flows.

## Open Questions

- Should posts support a "preview" section (first N paragraphs public, rest gated)? → Not in V1; keep it simple: full post gated.
- Do we need a search bar in the feed? → Tag filtering is sufficient for V1 given small corpus.
- Should the landing page show a post count / member count as social proof? → Yes, expose public `/api/v1/posts/stats` returning `{ postCount, memberCount }`.
