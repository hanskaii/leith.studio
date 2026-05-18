# Monorepo Boundaries & Import Rules

This project is a monorepo. Each package has a specific purpose and strict isolation rules.

## 1. Import Conventions

- **NEVER** use relative paths to import from another package (e.g., `import {..} from "../../packages/core"` is FORBIDDEN).
- **ALWAYS** use workspace aliases:
    - `@workspace/core` -> Shared logic, Gate, Policy engine.
    - `@workspace/database` -> Drizzle schema and DB instance.
    - `@workspace/ui` -> Shared React components (shadcn).
    - `@workspace/api` -> Hono types and contract.

## 2. Package Responsibilities

- **`packages/core`**: Must remain agnostic. No business logic, no database schema access.
- **`packages/database`**: The only place to define Drizzle schemas.
- **`apps/api`**: Handles HTTP, validation, and calling policies.
- **`apps/web`**: Handles UI and calling API via server functions.

## 3. Environment Variables

- **API (Cloudflare)**: Access via `c.env` or `env` passed to factory functions. Do not use `process.env`.
- **WEB (Vite)**: Use `import.meta.env.VITE_*` for client-side variables.
