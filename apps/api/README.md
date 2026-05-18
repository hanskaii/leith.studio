```txt
npm install
npm run dev
```

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>();
```

packages/
database
ui

- organizations-only

Sign-up automatically creates an organization for the user
Users always operate in an organization context
Personal account routes are hidden
Billing attaches to organizations (seats, team plans)
All data belongs to organizations

- Magic link (passwordless) authentication
- OAuth providers (Google by default, others via extension)
- Secure session management
- Rate limiting and captcha protection

import \* as z from 'zod';

const turnstileSecretKey = z
.string()
.min(1)
.optional()
.parse(process.env.TURNSTILE_SECRET_KEY);

export async function createCaptchaPlugin() {
if (!turnstileSecretKey) {
return [] as never;
}

const { captcha } = await import('better-auth/plugins');

return [
captcha({
provider: 'cloudflare-turnstile',
secretKey: turnstileSecretKey,
}),
];
}
