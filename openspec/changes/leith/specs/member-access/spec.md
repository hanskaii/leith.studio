## MODIFIED Requirements

### Requirement: asset.download Gate action

A new Gate action `asset.download` SHALL be added to the system. The action takes context `{ actor: Actor, resource: { access: "free" | "premium" } }`.

Policy logic:

- Step 1: `authorize("asset:download:free")` — requires the actor to have the `asset:download:free` permission (all logged-in roles have this)
- Step 2: if `resource.access === "free"`, `allow()`; if `resource.access === "premium"`, allow only if actor has `asset:download:premium` permission (member/admin); otherwise `deny({ code: "ACCESS_REQUIRED", message: "All Access pass required." })`

#### Scenario: Free asset, user role

- **WHEN** `Gate.can("asset.download", { actor: { role: "user" }, resource: { access: "free" } })` is called
- **THEN** `allowed: true`

#### Scenario: Premium asset, user role

- **WHEN** `Gate.can("asset.download", { actor: { role: "user" }, resource: { access: "premium" } })` is called
- **THEN** `allowed: false`, `code: "ACCESS_REQUIRED"`

#### Scenario: Premium asset, member role

- **WHEN** `Gate.can("asset.download", { actor: { role: "member" }, resource: { access: "premium" } })` is called
- **THEN** `allowed: true`

#### Scenario: Premium asset, admin role

- **WHEN** `Gate.can("asset.download", { actor: { role: "admin" }, resource: { access: "premium" } })` is called
- **THEN** `allowed: true` (admin bypass in `Gate.before()`)

---

### Requirement: RBAC permissions for asset download

`ROLE_PERMISSIONS` in `config/permissions.ts` SHALL be updated:

- `user` role: add `"asset:download:free"`
- `member` role: add `"asset:download:free"` and `"asset:download:premium"`
- `admin` role: add `"asset:download:free"` and `"asset:download:premium"`

#### Scenario: user role permissions

- **WHEN** `ROLE_PERMISSIONS["user"]` is read
- **THEN** it includes `"asset:download:free"` and does NOT include `"asset:download:premium"`

#### Scenario: member role permissions

- **WHEN** `ROLE_PERMISSIONS["member"]` is read
- **THEN** it includes both `"asset:download:free"` and `"asset:download:premium"`

---

### Requirement: GateActions interface updated

`GateActions` in `config/index.ts` SHALL include `"asset.download"` via `InferPolicyActions<typeof AssetPolicy>`. `AssetPolicy` SHALL be registered in `Gate.policies({...})`.

#### Scenario: TypeScript type safety

- **WHEN** a handler calls `Gate.assert("asset.download", ctx)`
- **THEN** TypeScript enforces that `ctx` includes `{ actor: Actor, resource: { access: "free" | "premium" } }`
