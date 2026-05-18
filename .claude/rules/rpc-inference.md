# RPC & Type Inference Guidelines (Hono + TanStack Start)

This project uses Hono HC (Hono Client) for full-stack type safety. Follow these rules to ensure frontend types are automatically inferred from the backend.

## 1. Backend: Handler & Contract (`apps/api/src/`)

### Method Chaining

Handlers **MUST** use method chaining. Assigning the Hono instance to a variable and then calling methods on it separately breaks type inference.

```typescript
// ✅ CORRECT - Chaining preserves types
export const postsHandler = new Hono<HonoEnv>()
  .get("/", async (c) => ...)
  .post("/", zValidator("json", schema), async (c) => ...);

// ❌ WRONG - Imperative calls break hc<AppType>
const postsHandler = new Hono<HonoEnv>();
postsHandler.get("/", ...);
```

### The Contract Boundary (`contract.ts`)

`apps/api/src/contract.ts` is the single source of truth for the frontend.

- Only export `AppType = typeof contract`.
- Keep this file "isomorphic" (no D1, AI, or Node-specific imports).
- Always use `.route("/path", handler)` to aggregate handlers.

## 2. Frontend: Server Functions (`apps/web/src/routes/-fn/`)

### Location Rule

- **ALWAYS** define `createServerFn` inside the `apps/web/src/routes/-fn/` directory.
- Group functions by domain (e.g., `posts.ts`, `analytics.ts`, `auth.ts`).
- This ensures a clean separation between UI components and data fetching logic.

### Creating the Client

Always use `hc<AppType>("")` for type inference only. Actual requests should use `createApiClient()`.

```typescript
// apps/web/src/routes/-fn/example.ts
import type { AppType } from "@workspace/api";
import { hc } from "hono/client";

const client = hc<AppType>(""); // Used for type inference ONLY
```

### Type Inference Helpers

Use `InferRequestType` and `InferResponseType` from `hono/client` to avoid manual interfaces.

```typescript
// ✅ CORRECT - Infer types from the route
const route = client.api.v1.posts.$get;
type PostsResponse = InferResponseType<typeof route, 200>;

export const getPostsFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const api = createApiClient();
		const res = await api.api.v1.posts.$get();
		const json = (await res.json()) as PostsResponse; // Explicit cast with inferred type
		return json.data;
	}
);
```

## 3. Exceptions & Best Practices

### Better Auth Exception

- **Better Auth Endpoints**: Routes under `/api/auth/*` are handled by the Better Auth engine and are **NOT** part of the Hono RPC contract (`AppType`).
- **Manual Interfaces**: For these routes ONLY, manual type definitions (like `DodoSubscription`, `AuthAccount`) are **ALLOWED**.
- **Placement**: Keep these manual interfaces inside the relevant `routes/-fn/` file to keep them close to their usage.

### Best Practices

1. **Explicit 200 Status**: Always specify the status code in `InferResponseType<typeof route, 200>` to get the correct success data type.
2. **Standardized Responses**: Always use `ApiResponse.ok(c, ...)` in handlers. It is pre-typed to return a consistent `{ success, message, data, statusCode }` structure.
3. **No Manual Interfaces for Custom Routes**: If a route is defined in `contract.ts`, NEVER write manual interfaces. Use `InferResponseType`.
4. **Zod Validation**: Use `zValidator` in Hono to ensure the `InferRequestType` on the frontend is accurate.

```typescript
// ✅ Correct Input Validation
.post("/", zValidator("json", CreatePostSchema), async (c) => {
  const data = c.req.valid("json"); // This type will flow to the frontend
  return ApiResponse.created(c, "Created", data);
})
```
