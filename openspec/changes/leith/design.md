## Context

Leith extends the existing Tanflare stack (Hono API on Cloudflare Workers, TanStack Start web, Drizzle + D1, R2 for storage). The leith-clone change already established the Gate policies, posts table, creator dashboard, and member-only feed. Leith builds on top of that foundation rather than replacing it — the posts entity becomes dual-purpose: rich text breakdowns and/or downloadable asset files.

Current state: posts have `body` (TipTap JSON), `coverImage` (R2 URL), `tags`, `status`. No concept of downloadable files or access tiers per post.

## Goals / Non-Goals

**Goals**

- Posts optionally carry a downloadable file (stored in R2, key only in DB — never exposed)
- Two download tiers: `free` (any logged-in user) and `premium` (all-access pass holder)
- Download proxied through API worker — client never sees R2 key or signed URL
- Creator can upload the asset file from the post editor
- Feed/detail shows asset metadata (format, resolution, duration, loop)
- `config/app.ts` contains exactly one payment plan: All Access, one-time

**Non-Goals**

- Per-asset pricing (no individual product IDs per post)
- Public (unauthenticated) downloads — always require account
- Video transcoding or thumbnail generation
- Download expiry or per-device limits

## Decisions

### 1. Three-table model: `posts` + `post_metadata` + `post_stats`

**Decision**: Asset-specific fields live in a separate `post_metadata` table (one-to-one with `posts`), not as columns on `posts`. Download events live in `post_stats` (one-to-many). `posts` stays clean — only content and publishing fields.

```
posts               post_metadata (1:1)        post_stats (1:N)
─────────────────   ──────────────────────     ──────────────────
id                  postId (FK, unique)        id
slug                format                     postId (FK)
title               resolution                 userId (FK)
body                duration                   downloadedAt
coverImage          isLoop
tags                fileKey
status              fileSize
publishedAt         access
createdAt
updatedAt
```

**Rationale**: Every post on Leith is an asset — a downloadable file is not optional, it IS the product. `posts` stays clean as the publishing/content entity (slug, title, body, tags, status). `post_metadata` is always present (1:1, mandatory), holding the asset-specific fields. This keeps concerns separated and makes asset fields independently extensible without touching the core posts table.

**Alternative considered**: Asset columns directly on `posts`. Rejected: mixes publishing concerns with asset concerns in one table — harder to extend, harder to reason about, no logical separation between "what this post says" and "what file it ships with".

---

### 2. Download via API proxy, not presigned R2 URL

**Decision**: `GET /api/v1/posts/:slug/download` fetches from R2 via `STORAGE.get(fileKey)`, streams the response body back to the client.

**Rationale**: R2 keys and bucket structure are never exposed. Auth + Gate check happens in the same request. Download count can be incremented atomically in the same handler. Presigned URLs leak the key to the client and require an extra SDK call.

**Alternative considered**: Presigned URLs (time-limited). Rejected: key leaks to browser network tab, harder to increment download count reliably, adds Durable Object or KV complexity for invalidation.

**Web layer**: `downloadAssetFn` server function calls `fetchApiWithAuth("/api/v1/posts/:slug/download")` → returns the raw `Response` (not JSON) so TanStack Start can forward the stream/blob to the browser.

---

### 3. Gate: two download permissions, one policy action

**Decision**: Two RBAC permissions (`asset:download:free`, `asset:download:premium`) + one Gate action `asset.download` with a `combine()` policy that checks `post.access` against the actor's permissions.

```
AssetPolicy.download = combine(
  authorize("asset:download:free"),       // all logged-in users pass this
  (ctx) => {
    if (ctx.resource.access === "free") return allow();
    return ctx.actor.role === "member" || ctx.actor.role === "admin"
      ? allow()
      : deny({ code: "ACCESS_REQUIRED", message: "All Access pass required." });
  }
)
```

`user` role gets `asset:download:free`. `member` and `admin` get both. The `resource` context carries `{ access: "free" | "premium" }` fetched by the handler before calling Gate.

---

### 4. `config/app.ts` — single plan, `PaymentPlan` type unchanged

**Decision**: Keep the existing `PaymentPlan` type in `packages/core/app.ts`. Only change the `payments` array in `config/app.ts` to a single `all-access` entry (`type: "standard"`, `interval: "one-time"`).

**Rationale**: No type changes needed — `standard` + `one-time` already exists in the union. Avoids touching shared types in `packages/core`.

---

### 5. `post_stats` — events table, count derived

**Decision**: A separate `post_stats` table stores one row per download event (`id`, `postId` FK, `userId` FK, `downloadedAt`). Download count is derived via `SELECT COUNT(*) FROM post_stats WHERE postId = ?`. `downloadCount` is NOT a column on `posts`.

**Rationale**: Events table gives history (who downloaded, when), enables idempotency checks ("user already downloaded this"), and supports future analytics (downloads per day, per user). A denormalized counter column on `posts` would require atomic SQL expression updates and loses all history. The COUNT query on D1 is fast for realistic download volumes.

**Insert pattern**: After R2 stream starts, `db.insert(postStats).values({ id: uuid(), postId, userId, downloadedAt: new Date() })` — fire-and-forget, does not block the stream.

**Drizzle relations**: `posts` → `postStats` (one-to-many); `users` → `postStats` (one-to-many). Count fetched separately or via subquery when needed in list views.

## Risks / Trade-offs

| Risk                                                                   | Mitigation                                                                                               |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Large file (100MB+) held in memory by API Worker                       | Use `STORAGE.get().body` (ReadableStream), pipe directly — never buffer into ArrayBuffer                 |
| R2 key collision on upload                                             | Same `uniqueSlug` pattern: `posts/${postId}/${originalFilename}` — postId is UUID, no collision possible |
| Creator uploads wrong file type                                        | Validate MIME type in creator handler before `STORAGE.put()`                                             |
| `post_stats` COUNT query slow at large scale                           | Acceptable for D1 at realistic download volumes; add index on `postId`                                   |
| `fileKey` null on posts without assets — download endpoint returns 404 | Handler checks `if (!post.fileKey) throw ApiError.notFound()`                                            |

## Migration Plan

1. Run `pnpm db:generate` after updating `packages/database/schema/posts.ts`
2. Run `pnpm db:migrate` (local D1 via `wrangler dev`) — new columns are nullable, zero downtime
3. Existing posts retain `fileKey: null`, `access: "premium"` (default) — no data migration needed
4. Deploy API first, then web — API is backwards-compatible with old web during deploy window
