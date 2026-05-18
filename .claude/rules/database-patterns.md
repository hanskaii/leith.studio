# Database & Drizzle Patterns

We use Drizzle ORM with Cloudflare D1. Follow these patterns for consistency.

## 1. Querying Data

- Use **Relational Queries** (`db.query.table.findFirst`) for reading data whenever possible. It's cleaner and handles joins better.
- Use **SQL-like Syntax** (`db.select().from()...`) only for complex queries or performance-critical operations.

## 2. Schema Changes

- **DO NOT** modify schema files without running `pnpm db:generate`.
- Always check `packages/database/schema.ts` before assuming field names.
- Common Fields: All tables should use `id` (text/cuid) and `createdAt`/`updatedAt`.

## 3. Handlers & Transactions

- Keep database operations inside handlers or dedicated service files.
- Use `db.transaction()` if performing multiple related writes to ensure atomicity.
