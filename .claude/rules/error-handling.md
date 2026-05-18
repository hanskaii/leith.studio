# Error Handling Patterns

This project uses a unified error model: throw on the API, catch once in `onError`, normalize on the web.

## 1. API Layer — Throwing Errors

**Always throw `ApiError.*`** from handlers, middleware, and services. Never return an error response manually.

```typescript
// ✅ correct — throw and let onError format it
.get("/:id", authMiddleware, async (c) => {
  const post = await db.query.posts.findFirst({ where: eq(posts.id, c.req.param("id")) });
  if (!post) throw ApiError.notFound("Post not found");
  return ApiResponse.ok(c, "OK", post);
})

// ❌ wrong — manual error response bypasses onError
.get("/:id", async (c) => {
  return c.json({ success: false, message: "Not found" }, 404);
})
```

### Available `ApiError` static methods

| Method                              | Status | When to use                              |
| ----------------------------------- | ------ | ---------------------------------------- |
| `ApiError.badRequest(msg, errors?)` | 400    | Invalid input not caught by `zValidator` |
| `ApiError.unauthorized(msg?)`       | 401    | No valid session                         |
| `ApiError.forbidden(msg?)`          | 403    | Session exists but permission denied     |
| `ApiError.notFound(msg?)`           | 404    | Resource doesn't exist                   |
| `ApiError.conflict(msg?)`           | 409    | Duplicate resource (e.g. username taken) |
| `ApiError.validation(msg, errors?)` | 400    | Zod-formatted validation errors          |
| `ApiError.tooManyRequests(msg?)`    | 429    | Rate limit exceeded                      |
| `ApiError.server(msg?)`             | 500    | Unexpected server-side failure           |

### Rule: use `zValidator`, not manual validation

`zValidator("json", schema)` from `@hono/zod-validator` automatically returns 400 on failure. Only use `ApiError.validation()` for complex cross-field validation that Zod can't express inline.

---

## 2. The `onError` Handler — Single Formatting Point

`apps/api/src/index.ts` is the **only** place allowed to call `c.json()` for error responses. It handles:

1. `PolicyError` → 403 (`{ success: false, message, code: "FORBIDDEN" }`)
2. `ApiError` → dynamic status (`{ success: false, message, code, errors }`)
3. Unhandled → 500 (`{ success: false, message, code: "INTERNAL_SERVER_ERROR" }`)

**Do not add another `onError` or top-level catch that returns `c.json()`.** Let errors propagate to the central handler.

---

## 3. API Success Responses

All success responses **must** use `ApiResponse`:

```typescript
// ✅ correct
return ApiResponse.ok(c, "Profile updated", user); // 200
return ApiResponse.created(c, "Post created", post); // 201
return ApiResponse.error(c, "Custom error message"); // 500 (rare — prefer throw)

// ❌ wrong
return c.json({ success: true, data: user });
```

The exception is `ApiResponse.error()` — prefer `throw ApiError.*` instead. `ApiResponse.error()` is reserved for cases where you need to return (not throw) in a try/catch, like the Better Auth handler fallback.

---

## 4. Middleware Errors

Always **throw** from middleware, never return:

```typescript
// ✅ correct — throw propagates to onError
export const authMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
	const { session } = await authService.resolve(c.req.raw.headers);
	if (!session) throw ApiError.unauthorized();
	await next();
});

// ❌ wrong — return bypasses onError formatting
if (!session) return c.json({ error: "Unauthorized" }, 401);
```

---

## 5. Web Layer — Server Functions

Server functions (`createServerFn`) must wrap async logic with `handleError()` from `apps/web/src/routes/-fn/handle-error.ts`. This normalizes API errors into `ServerError` with a consistent shape the frontend can handle.

```typescript
// ✅ correct
export const getPostFn = createServerFn({ method: "GET" }).handler(
	handleError(async () => {
		const api = createApiClient();
		const res = await api.api.v1.posts.$get();
		const json = await res.json();
		return json.data;
	})
);

// ❌ wrong — unhandled rejections leak raw error shapes
export const getPostFn = createServerFn({ method: "GET" }).handler(async () => {
	const api = createApiClient();
	const res = await api.api.v1.posts.$get();
	return (await res.json()).data;
});
```

---

## 6. Frontend Error Boundaries

- **Route-level errors:** TanStack Router catches them via `errorComponent`. The global default is `DefaultErrorComponent` in `__root.tsx`. Do not add per-route `errorComponent` unless the route needs custom recovery UI.
- **Component-level errors:** Use React `<ErrorBoundary>` only for isolated widgets that must not crash the page.
- **Mutations:** Always provide `onError` in `useMutation` with a `toast.error()`. Never let mutation failures be silent.

```typescript
// ✅ correct mutation error handling
const mutation = useMutation({
	mutationFn: updateProfile,
	onSuccess: () => toast.success("Saved"),
	onError: (err) => toast.error(err.message || "Something went wrong")
});
```

---

## 7. What NOT to do

- **Never** use `console.error` as the only error handling — it's invisible to users.
- **Never** swallow errors with an empty `catch {}`.
- **Never** throw plain `new Error()` from handlers — use `ApiError.*` so `onError` can format it correctly.
- **Never** add `try/catch` around a handler just to return `c.json()` — throw instead.
