## Why

There's no existing member-only content platform in this project. We need to build a Leith-style platform where a creator publishes exclusive AI image creation breakdowns, tutorials, and behind-the-scenes content that is gated behind a one-time license key purchase via Dodo Payments — removing the recurring subscription friction entirely.

## What Changes

- **New**: Public landing page that previews the content aesthetic and drives license key purchases
- **New**: License key purchase flow via Dodo Payments; key is validated on the server and grants permanent member access
- **New**: Member-only content library — a feed of posts (AI image breakdowns, process walkthroughs, commentary) visible only after license key activation
- **New**: Individual content post page with rich media (images, text, inline AI prompts/notes)
- **New**: Creator dashboard for publishing, editing, and unpublishing content posts
- **New**: License key activation flow — user enters key, server validates via Dodo API, role is upgraded to `member`

## Capabilities

### New Capabilities

- `landing-page`: Public marketing page with above-the-fold hero, content preview teaser (blurred/locked), and CTA to purchase a license key
- `member-access`: License key purchase via Dodo Payments checkout, key activation endpoint, and server-side validation that upgrades the user's role to `member`
- `content-library`: Member-only paginated feed of content posts; gated behind `member` role; each post has title, cover image, body (MDX/rich text), tags, and published date
- `content-publishing`: Creator-only dashboard (role: `admin`) to create, edit, preview, and publish/unpublish content posts

### Modified Capabilities

<!-- None — this is a greenfield feature set -->

## Impact

- **`apps/api`**: New route groups — `/api/v1/posts` (CRUD, gated), `/api/v1/license` (activate key)
- **`apps/web`**: New routes — `/` (landing), `/activate` (key entry), `/(app)/_app/feed` (member content), `/(app)/_app/posts/[slug]` (single post), `/(app)/_app/creator` (admin dashboard)
- **`packages/database`**: New `posts` table (id, slug, title, coverImage, body, tags, publishedAt, status)
- **`config/permissions.ts`**: New permissions — `content:read`, `content:manage`, `license:activate`; new role `member` added between `user` and `admin`
- **`packages/auth`**: `before` hook to gate content routes; user role upgraded to `member` after license key activation
- **Dependencies**: `@dodopayments/sdk` (already available via better-auth plugin), `@mdx-js/react` or `react-markdown` for body rendering
