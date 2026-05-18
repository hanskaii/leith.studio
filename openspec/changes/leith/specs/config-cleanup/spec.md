## ADDED Requirements

### Requirement: Single All Access payment plan

`config/app.ts` SHALL contain exactly one entry in the `payments` array: the `all-access` plan with `type: "standard"` and `interval: "one-time"`. The `appConfig.name` SHALL be updated to `"Leith"`.

#### Scenario: Config has one plan

- **WHEN** `appConfig.payments` is read
- **THEN** it returns an array of length 1 with `slug: "all-access"`, `interval: "one-time"`, `type: "standard"`

#### Scenario: Old plans removed

- **WHEN** the config is read
- **THEN** there is no plan with `slug: "starter"`, `slug: "pro-subscription"`, or `slug: "prepaid-credits"`

---

### Requirement: Plan features list reflects asset platform

The All Access plan's `features` array SHALL describe the asset download product, not a boilerplate kit.

#### Scenario: Features are product-specific

- **WHEN** the landing page renders the pricing section using `appConfig.payments[0].features`
- **THEN** features describe unlimited downloads, all asset types, and lifetime access — not developer tooling

## REMOVED Requirements

### Requirement: Pro monthly subscription plan

The `pro-subscription` plan with `interval: "month"` is removed. Leith is a one-time purchase product with no recurring billing for end users.

**Reason**: Leith uses a license key activation model (matching the existing `license.handler.ts`). Monthly subscriptions require webhook-based role management and cancellation flows that are out of scope.

**Migration**: Remove the plan entry from `config/app.ts`. No DB migration needed — no subscription records exist in production.

---

### Requirement: Prepaid Credits plan

The `prepaid-credits` plan with `type: "credits"` is removed.

**Reason**: Leith has no AI token consumption or credit-gated features.

**Migration**: Remove the plan entry from `config/app.ts`. Remove `creditAmount` and `unit` references from any pricing UI.
