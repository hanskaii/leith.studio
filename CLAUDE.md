# Tanflare — Claude Rules

## Architecture Overview

Monorepo (pnpm + Turborepo): `apps/api` (Hono on Cloudflare Workers), `apps/web` (TanStack Start + React), `config/` (app-level policies + RBAC), `packages/core` (Gate, policy primitives), `packages/auth` (better-auth hooks), `packages/database` (Drizzle + D1).

---

## Gate System (`@workspace/core`)

### `Gate.can()` — policy check, returns `{ allowed: boolean }`

Use only for **allow/deny decisions**. Never put data transformation or side effects inside a policy function.

```ts
// ✅ correct — policy makes a guard decision
definePolicy("user.create:before", async (ctx) => {
	if (App.hasFeature("waitlist")) return deny("Waitlist mode active");
	return allow();
});

// ❌ wrong — data transformation inside a policy
definePolicy("user.create:before", async (ctx) => {
	ctx.data.name = ctx.data.email.split("@")[0]; // mutating data is not a policy concern
	return allow();
});
```

### `Gate.emit()` — fire-and-forget event

Use for **notifications and side effects** that happen after something succeeded. Never use to make decisions.

```ts
// ✅ correct — notify after user is created
Gate.after("user.created", async (ctx) => {
	await sendWelcomeEmail(ctx.email);
});

// ❌ wrong — emit cannot block or return a decision
const result = await Gate.emit("user.created", ctx);
```

### `Gate.after()` — side effect hooks

Register in `apps/api/src/boot.ts`. Used for DB sync, emails, logging after events.

### `Gate.before()` — global interceptor

Runs before every `Gate.can()`. Use for cross-cutting concerns like admin bypass.

```ts
// ✅ correct usage in boot.ts
Gate.before(async (action, ctx) => {
	if ((ctx as any).role === "admin") return allow();
});
```

---

## better-auth Database Hooks (`packages/auth/hooks/database.hooks.ts`)

### `before` hook return values

| Return value    | Effect                                   |
| --------------- | ---------------------------------------- |
| `false`         | Cancel the DB operation                  |
| `{ data: T }`   | Continue with **modified** data          |
| `true` / `void` | Continue with original data (no changes) |

**Always return `{ data: user }` when you mutate data in a before hook.** Returning only `result.allowed` (boolean) means better-auth will use the original data even if you mutated it.

```ts
// ✅ correct — normalize then check policy, return modified data
before: async (user) => {
  // Data normalization belongs HERE, not in a policy
  if (!user.name) {
    user.name = user.email.split("@")[0] || "User"
  }

  const result = await Gate.can("user.create:before", { userId: user.id, data: user, db })
  if (!result.allowed) return false
  return { data: user }  // ← must return modified data explicitly
}

// ❌ wrong — returns only boolean, mutations are lost
before: async (user) => {
  const result = await Gate.can("user.create:before", { ... })
  return result.allowed  // better-auth ignores any mutations you made
}
```

### Rule: Data transformation vs. policy

| Concern                                              | Where it belongs                         |
| ---------------------------------------------------- | ---------------------------------------- |
| Set default field values                             | `before` hook body, before `Gate.can()`  |
| Normalize input                                      | `before` hook body, before `Gate.can()`  |
| Allow/deny based on role, feature flag, subscription | `definePolicy` in `config/policies/`     |
| Side effects after success (emails, DB sync)         | `Gate.after()` in `apps/api/src/boot.ts` |

---

## RBAC & Permissions (`config/permissions.ts`)

- **Permissions**: Defined as static strings in `ROLE_PERMISSIONS` (e.g., `billing:manage`).
- **Hierarchy**: Handled by `RBAC` factory. Higher level roles inherit permissions (if configured).

### Rules:

1. **Never check roles directly**: Do not use `if (user.role === 'admin')`. Use `Gate.can` or `Gate.assert`.
2. **Naming**: Use **colon notation** for permissions (`resource:action`) and **dot notation** for Gate actions (`resource.action`).
3. **Integration**: Always wrap RBAC permissions inside a Gate policy using the `authorize()` helper.

```ts
// ✅ correct — Gate integrates RBAC check
export const UserPolicy = {
	update: definePolicy("user.update", authorize("profile:update"))
};
```

---

## Hono Route Handlers (`apps/api/src/handlers/`)

### Always use method chaining for RPC type inference

```ts
// ✅ correct — chaining enables hc<AppType> type inference
const uploadHandler = new Hono<HonoEnv>()
  .post("/avatar", authMiddleware, zValidator("form", schema), async (c) => {
    return c.json({ success: true, data })
  })

// ❌ wrong — imperative calls break type inference
const uploadHandler = new Hono<HonoEnv>()
uploadHandler.post("/avatar", ...)  // loses chaining
```

### Use `ApiResponse` helper for standardized responses

Always use `ApiResponse` (from `@/helpers/response.helper`) to ensure consistent JSON structure and type inference.

```ts
// ✅ correct
.get("/status", async (c) => {
  return ApiResponse.ok(c, "System online", { version: "1.0.0" });
})

// ❌ wrong — manual JSON loses consistency
.get("/status", async (c) => {
  return c.json({ success: true, message: "OK" }, 200);
})
```

### Use `zValidator` for typed input

### `HonoEnv` already has Variables and Bindings — don't redefine

```ts
// ✅ correct — use HonoEnv directly
const handler = new Hono<HonoEnv>().get("/", async (c) => {
	const user = c.get("user"); // typed as User
	const db = c.get("db"); // typed as DatabaseInstance
});

// ❌ wrong — creating ContractEnv or custom env types is redundant
const handler = new Hono<{ Variables: { user: any } }>();
```

---

## `apps/api/src/contract.ts` — RPC boundary

Only routes that use method chaining + `zValidator` + return `ApiResponse` directly belong in `contract.ts`. This file is compiled by `apps/web` — keep it free of API-specific bindings (`AI`, `DODO_PAYMENTS_API_KEY`) and `@/` aliases.

### Rules:

1. **Always export `AppType`**: This is used by the frontend for full type inference.
2. **Method Chaining is Mandatory**: Never use imperative route registration; it breaks the RPC type flow.
3. **Isomorphic Only**: No database or cloud-provider specific code in this file.

See `.claude/rules/rpc-inference.md` for detailed implementation guide.

```ts
// ✅ correct — minimal, clean boundary
const contract = new Hono<HonoEnv>().route("/api/upload", uploadHandler);

export type AppType = typeof contract;
```

---

## TanStack Router File Conventions (`apps/web/src/routes/`)

### `-` prefix = non-route files (co-located with routes)

```
_home/docs/
├── -components/   ← components used only by this route subtree
├── -content/      ← MDX content files
├── -lib/          ← utilities used only by this route subtree
├── index.tsx      ← route file
└── $.tsx          ← catch-all route file
```

Don't put route-specific components/lib in top-level `src/components/` or `src/lib/` — co-locate them using the `-` prefix next to the routes that own them.

---

## Web UI Pattern (`apps/web/src/routes/`)

### Component Co-location

- **Rule**: If a component is only used in one route, place it in a `-components/` folder inside that route's directory.
- **Rule**: Only global, truly reusable components go into `packages/ui` or `apps/web/src/components`.
- **Rule**: **ALL** `createServerFn` (Server Functions) must be placed in `apps/web/src/routes/-fn/` and grouped by domain.
- **Rule**: **Data Fetching** must always use `useSuspenseQuery` or `useSuspenseInfiniteQuery`.
- **Rule**: **Granular Loading**: Prefer wrapping data-dependent components in `<Suspense fallback={<Skeleton />}>` rather than using `pendingComponent` in the route definition.
- **Rule**: **Form Implementation**: Always combine `useForm` with `useMutation`. Use Zod for validation and standardized UI components from `@workspace/ui`.
- **Reason**: This ensures a smooth UX, consistent error handling, and type safety from form input to API call.

See `.claude/rules/form-patterns.md` and `.claude/rules/frontend-patterns.md` for more details.

```
routes/(app)/_app/posts/
├── -components/
│   └── post-card.tsx
└── index.tsx
```

---

## Error Handling (`apps/api` + `apps/web`)

See `.claude/rules/error-handling.md` for the full guide.

- **Always throw `ApiError.*`** from handlers and middleware — never return `c.json()` for errors.
- **`onError` in `index.ts`** is the single place that formats and sends error responses.
- **`ApiResponse.ok/created/error`** for all success responses in handlers.
- **Web server functions** must wrap logic with `handleError()` from `routes/-fn/handle-error.ts`.

---

## Better Auth (`packages/auth`)

See `.claude/rules/better-auth.md` for the full guide.

- **Client components**: use `authClient.useSession()`.
- **Hono handlers**: use `c.get("user")` / `c.get("session")` (set by `authMiddleware`).
- **Route guards**: protect in `beforeLoad` via `Gate.assert()`, not inside components.
- **`/api/auth/*` routes** are NOT part of `contract.ts` — manual interfaces allowed for Better Auth shapes.
- **`before` hooks**: normalize data → Gate.can() → return `{ data }` (not boolean).
- **`after` hooks**: `Gate.emit()` only — never make allow/deny decisions here.

---

## Package Boundaries

| Package               | Purpose                                   | Do not import         |
| --------------------- | ----------------------------------------- | --------------------- |
| `@workspace/core`     | Gate, policy primitives, App, types       | App-specific config   |
| `@workspace/config`   | App policies, RBAC, appConfig             | API-specific bindings |
| `@workspace/auth`     | better-auth setup, email templates, hooks | Web-specific code     |
| `@workspace/database` | Drizzle schema, D1 utils                  | Auth or config        |
| `@workspace/ui`       | shadcn components                         | Business logic        |
