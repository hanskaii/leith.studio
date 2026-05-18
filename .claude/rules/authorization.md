# Authorization System (Gate & RBAC)

This project uses a centralized authorization system combining **RBAC (Role-Based Access Control)** for static permissions and a **Gate (Policy-Based)** for dynamic logic.

## 1. Core Architecture

- **Permissions**: Defined in `config/permissions.ts`. Uses colon notation (e.g., `post:create`).
- **Policies**: Defined in `config/policies/*.ts`. Pure functions — no DB queries, no side effects.
- **Gate**: The orchestrator in `packages/core/gate.ts`. Uses dot notation (e.g., `post.create`).
- **Actor**: The standard identity shape passed to every Gate call — `{ id, role?, subscriptionStatus? }`.

## 2. The `Actor` Type

Every Gate call receives an `actor` — a minimal, framework-agnostic identity slice. The `User` type from Better Auth is structurally compatible with `Actor`, so pass it directly:

```typescript
// ✅ correct — User satisfies Actor, no spreading needed
await Gate.assert("app.use", { actor: user });
await Gate.assert("post.delete", {
	actor: user,
	resource: { authorId: post.userId }
});

// ❌ wrong — manual spreading is boilerplate
await Gate.assert("app.use", {
	userId: user.id,
	role: user.role,
	subscriptionStatus: user.subscriptionStatus
});
```

Policy context shape follows a consistent pattern:

```typescript
// Base — all policies have actor
interface BasePolicyContext {
	actor: Actor; // { id, role?, subscriptionStatus? }
}

// With resource — for ownership / resource-scoped checks
interface PostDeleteContext extends BasePolicyContext {
	resource: { authorId: string };
}
```

## 3. Implementation Rules

### A. The "Single Entry" Requirement

- **NEVER** use `hasRole()` or `hasPermissionTo()` directly in components or handlers.
- **ALWAYS** use `Gate.assert()` (throws `PolicyError` → caught by `onError` → 403) or `Gate.can()` (returns `{ allowed: boolean }`).
- **`protect()` middleware** is a thin wrapper over `Gate.assert()` — use it for route-level guards.

### B. Admin Bypass — One Place Only

The global admin bypass lives in `Gate.before()` inside `apps/api/src/boot.ts`. Individual policies **must not** check for admin role — the bypass happens before they run:

```typescript
// apps/api/src/boot.ts
Gate.before(async (action, ctx: any) => {
	if (ctx.actor?.role === "admin") return allow(); // bypass all policies
});
```

This means every policy can be written as if admins don't exist. Clean, composable, no repetition.

### C. Policies Are Pure Functions

Policies receive context, return `allow()` or `deny()`. **No DB queries inside policies.**

If the policy needs data (e.g., `createdAt` for grace period), the **caller** fetches it and passes it in context — not the policy itself.

```typescript
// ✅ correct — caller passes createdAt, policy stays pure
const user = await db.query.users.findFirst(...);
await Gate.assert("account.delete.grace-period", {
  actor: currentUser,
  resource: { createdAt: user.createdAt }
});

// ❌ wrong — policy fetches from DB
definePolicy("account.delete.grace-period", async (ctx) => {
  const user = await ctx.db.query.users.findFirst(...); // breaks isomorphism
});
```

### D. Adding a New Action

**Every action always follows all 4 steps — no exceptions.**

`ROLE_PERMISSIONS` is the single source of truth for "what roles can do what." Skipping step 1 means capabilities are scattered across policy files instead of one place. If you ever add a new role, you'd have to hunt through every policy to figure out what it can do.

1. **Permission**: Add `"resource:action"` to every applicable role in `ROLE_PERMISSIONS` in `config/permissions.ts`.
2. **Policy**: Add to a relevant file in `config/policies/` using `definePolicy`. Always start with `authorize("resource:action")` via `combine()`. Keep it pure — no DB queries.
3. **Registration**:
    - Extend `GateActions` interface in `config/index.ts` via `InferPolicyActions`.
    - Register in `Gate.policies({...})` in `config/index.ts`.

## 4. Coding Patterns

### Policy with subscription check

Every policy starts with `authorize()` — role capability first, dynamic check second:

```typescript
// config/permissions.ts — step 1: declare capability
export const ROLE_PERMISSIONS = {
  admin: ["app:use", ...],
  user:  ["app:use", ...],
} as const;

// config/policies/app.ts — step 2: role check + dynamic check
export const AppPolicy = {
  use: definePolicy<BasePolicyContext, "app.use">(
    "app.use",
    combine(
      authorize("app:use"),                              // role has capability?
      (ctx) => {
        const s = ctx.actor.subscriptionStatus;
        if (s === "active" || s === "lifetime") return allow();
        return deny({ code: "SUBSCRIPTION_REQUIRED", message: "..." });
      }
    )
  )
};
```

### Ownership check with `combine`

```typescript
// config/policies/post.ts
export const PostPolicy = {
	delete: definePolicy<PostDeleteContext, "post.delete">(
		"post.delete",
		combine(
			authorize("post:delete"), // RBAC first
			(ctx) =>
				ctx.actor.id === ctx.resource.authorId
					? allow()
					: deny("Not your post.")
		)
	)
};
```

### Server-Side Enforcement (Hono handler)

```typescript
// ✅ fetch resource first, then assert with actor + resource
.delete("/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  const post = await db.query.posts.findFirst({ where: eq(posts.id, c.req.param("id")) });
  if (!post) throw ApiError.notFound("Post not found");

  await Gate.assert("post.delete", { actor: user, resource: { authorId: post.userId } });

  await db.delete(posts).where(eq(posts.id, post.id));
  return ApiResponse.ok(c, "Post deleted");
})
```

### Route-level guard via `protect()`

```typescript
// protect() is a thin wrapper — use for simple permission checks
.post("/billing/manage", authMiddleware, protect("app.use"), handler)
```

### Client-Side Enforcement (TanStack Router `beforeLoad`)

```typescript
// ✅ correct — assert in beforeLoad, not inside component
beforeLoad: async ({ context }) => {
  const session = await context.queryClient.fetchQuery(sessionsOptions());
  if (!session?.user) throw redirect({ to: "/login" });

  await Gate.assert("app.use", { actor: session.user });
},
errorComponent: ({ error }) => {
  if (error instanceof PolicyError) return <UpgradePage message={error.message} />;
  return <DefaultErrorComponent error={error} />;
}
```

### Client-Side Hint (show/hide UI — not enforcement)

```typescript
// Gate.can() for UI hints only — real enforcement is always server-side
const { data: session } = useSuspenseQuery(sessionsOptions());
const { allowed } = Gate.can("app.use", { actor: session.user });

if (!allowed) return <UpgradeBanner />;
```

## 5. Verification Requirements

- When modifying authorization logic, **ALWAYS** run related tests.
- If no tests exist for the new policy, **WRITE THEM** in a `.test.ts` file.
- Policies are pure functions — they're easy to unit test without DB or HTTP setup.

## 6. API Response Standard

- Use `ApiResponse.ok(c, message, data)` for success responses.
- Authorization failures propagate automatically: `PolicyError` → `onError` → 403 JSON response.
