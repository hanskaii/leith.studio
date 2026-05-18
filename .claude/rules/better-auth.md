# Better Auth Patterns

Better Auth handles authentication, sessions, API keys, OTP email, and billing integration. Follow these rules to use it correctly.

## 1. Session Access — Client vs Server

| Context                  | How to get session                          | Hook/Helper                                     |
| ------------------------ | ------------------------------------------- | ----------------------------------------------- |
| React component (client) | `authClient.useSession()`                   | Reactive, auto-updates on sign in/out           |
| Route `beforeLoad` (SSR) | `queryClient.fetchQuery(sessionsOptions())` | Throws redirect if unauthenticated              |
| Hono handler (API)       | `c.get("session")` / `c.get("user")`        | Set by `authMiddleware`                         |
| Server function (`-fn/`) | `getSessionFn()`                            | Calls `/api/auth/get-session`, forwards cookies |

```typescript
// ✅ React component — reactive
const { data: session } = authClient.useSession();

// ✅ Hono handler — typed via HonoEnv
const user = c.get("user"); // User
const session = c.get("session"); // Session

// ❌ wrong — calling Better Auth API manually in a handler
const { user } = await authService.resolve(c.req.raw.headers); // only authMiddleware should do this
```

---

## 2. Protecting Routes

### API (Hono)

Always compose `authMiddleware` then `protect()` in that order:

```typescript
// ✅ correct order
.post("/billing/manage", authMiddleware, protect("billing:manage"), handler)

// ❌ wrong — protect runs before session is set
.post("/billing/manage", protect("billing:manage"), authMiddleware, handler)
```

`authMiddleware` sets `c.get("user")` and `c.get("session")`. `protect()` reads `c.get("user")` — it must run after.

### Web (TanStack Router)

Protect routes in `beforeLoad`, not inside the component:

```typescript
// ✅ correct
export const Route = createFileRoute("/(app)/_app/dashboard")({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.fetchQuery(sessionsOptions());
    await Gate.assert("app.use", {
      role: session?.user?.role,
      subscriptionStatus: session?.user?.subscriptionStatus
    });
  }
});

// ❌ wrong — guards inside components can flash content before redirect
function Dashboard() {
  const { data: session } = authClient.useSession();
  if (!session) return <Redirect to="/login" />;
}
```

---

## 3. Database Hooks (`packages/auth/hooks/database.hooks.ts`)

Better Auth calls `before` and `after` hooks for every DB operation. Strict return contract:

### `before` hook

| Return value    | Effect                      |
| --------------- | --------------------------- |
| `false`         | Cancel the operation (deny) |
| `{ data: T }`   | Continue with modified data |
| `true` / `void` | Continue with original data |

**Pattern:** normalize data first, then check Gate policy, then return `{ data }`:

```typescript
// ✅ correct
before: async (user) => {
  // 1. Normalize (belongs here, not in policy)
  if (!user.name) user.name = user.email.split("@")[0] || "User";

  // 2. Policy check
  const result = await Gate.can("user.create:before", { userId: user.id, data: user, db });
  if (!result.allowed) return false;

  // 3. Return modified data explicitly
  return { data: user };
}

// ❌ wrong — returning boolean loses mutations
before: async (user) => {
  user.name = user.email.split("@")[0]; // mutation lost!
  const result = await Gate.can("user.create:before", { ... });
  return result.allowed; // Better Auth ignores the name mutation
}
```

### `after` hook

Fire-and-forget side effects only — never make decisions here:

```typescript
// ✅ correct — emit event after success
after: async (user) => {
	await Gate.emit("user.created", { userId: user.id, data: user, db });
};

// ❌ wrong — no allow/deny in after hooks
after: async (user) => {
	if (!user.emailVerified) return false; // after hooks can't cancel
};
```

---

## 4. Better Auth Routes Are NOT in the Hono Contract

Routes under `/api/auth/*` are handled by the Better Auth engine, not by Hono RPC. They must **not** appear in `contract.ts`.

Consequences:

- Do not use `InferRequestType` / `InferResponseType` for auth routes.
- Manual TypeScript interfaces are **allowed** for Better Auth response shapes (e.g., `DodoSubscription`, `ApiKey`, `AuthAccount`).
- Keep those interfaces in the relevant `routes/-fn/` file, close to their usage.

```typescript
// ✅ allowed — manual interface for Better Auth response
export interface ApiKey {
	id: string;
	name: string;
	key: string;
	createdAt: Date;
}

// ✅ allowed — calling Better Auth endpoint directly
const { data, error } = await authClient.apiKey.listApiKeys();

// ❌ wrong — trying to add auth routes to contract.ts
const contract = new Hono<HonoEnv>().route("/api/auth", authHandler); // breaks isomorphism
```

---

## 5. Plugins — What's Enabled

| Plugin         | Purpose                         | Client method prefix        |
| -------------- | ------------------------------- | --------------------------- |
| `admin`        | User management (ban, role)     | `authClient.admin.*`        |
| `apiKey`       | API key CRUD + auth             | `authClient.apiKey.*`       |
| `emailOTP`     | OTP-based email verification    | `authClient.emailOtp.*`     |
| `multiSession` | Max 5 concurrent sessions       | `authClient.multiSession.*` |
| `oneTap`       | Google One Tap                  | `authClient.oneTap.*`       |
| `dodopayments` | Billing, subscriptions, credits | `authClient.subscription.*` |

Do not call raw `/api/auth/*` endpoints directly in server functions — always use the typed `authClient.*` methods.

---

## 6. Email OTP

OTP emails are environment-aware:

- **Development:** OTP is logged to console, no email sent.
- **Production:** Sent via Resend using the template in `packages/auth/emails/templates/otp.ts`.

Never hardcode OTP logic in handlers. Always use `authClient.emailOtp.sendVerificationOtp()` and `authClient.emailOtp.verifyEmail()`.

---

## 7. Custom User Fields

Better Auth is extended with these fields on the `user` table:

| Field                | Type      | Set by                | How                                                     |
| -------------------- | --------- | --------------------- | ------------------------------------------------------- |
| `username`           | `string?` | User (profile update) | `additionalFields`                                      |
| `role`               | `string?` | Admin plugin          | `admin()` plugin — **do NOT add to `additionalFields`** |
| `dodoCustomerId`     | `string?` | Dodo Payments webhook | `additionalFields`                                      |
| `subscriptionStatus` | `string?` | Dodo Payments webhook | `additionalFields`                                      |
| `subscriptionId`     | `string?` | Dodo Payments webhook | `additionalFields`                                      |
| `subscriptionPlanId` | `string?` | Dodo Payments webhook | `additionalFields`                                      |
| `credits`            | `number?` | Credit hooks          | `additionalFields`                                      |

### Rule: never add `role` to `additionalFields`

`role` is managed exclusively by the `admin()` plugin. Defining it again in `additionalFields` with `required: false` overwrites the plugin's type and makes it `string | null | undefined` instead of a proper union.

```typescript
// ❌ wrong — duplicates admin plugin, breaks role type
user: {
  additionalFields: {
    role: { type: "string", required: false } // never do this
  }
}

// ✅ correct — admin plugin handles role automatically
plugins: [admin(), ...]
```

### Passing user to Gate

The `User` type from Better Auth is structurally compatible with `Actor`. Pass `actor: user` directly — no manual field spreading:

```typescript
// ✅ correct — user satisfies Actor interface
await Gate.assert("app.use", { actor: user });
await Gate.assert("feature.use", { actor: user });

// ❌ wrong — unnecessary spreading
await Gate.assert("feature.use", {
	userId: user.id,
	role: user.role,
	subscriptionStatus: user.subscriptionStatus
});
```

---

## 8. Session Query Options

Use `sessionsOptions()` from `routes/-fn/auth.ts` everywhere session data is needed in the web app. It has `staleTime: 5min` and `refetchOnMount: "always"` — do not create ad-hoc session queries.

```typescript
// ✅ correct — shared query key and options
const { data: session } = useSuspenseQuery(sessionsOptions());

// ❌ wrong — custom session fetch breaks cache sharing
const { data: session } = useSuspenseQuery({
	queryKey: ["session"],
	queryFn: () => authClient.getSession()
});
```
