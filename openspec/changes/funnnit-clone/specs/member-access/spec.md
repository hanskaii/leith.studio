## ADDED Requirements

### Requirement: License key checkout redirects to Dodo Payments

The system SHALL redirect the user to the Dodo Payments checkout URL for the configured license key product when they click the purchase CTA. The checkout URL is constructed server-side using the Dodo Payments SDK with the `licenseKey` product type.

#### Scenario: Successful checkout redirect

- **WHEN** a visitor clicks "Get Access" on the landing page
- **THEN** the browser navigates to the Dodo Payments hosted checkout page for the license key product

#### Scenario: Checkout URL construction fails

- **WHEN** the Dodo Payments SDK returns an error building the checkout URL
- **THEN** the API returns a 500 error and the frontend shows a toast: "Could not start checkout. Please try again."

### Requirement: License key activation endpoint validates and upgrades user

The system SHALL expose `POST /api/v1/license/activate` (auth required) that accepts `{ key: string }`, validates the key against the Dodo Payments API, marks the key as used, upgrades the authenticated user's role to `member`, and returns a success response.

#### Scenario: Valid unused key activates membership

- **WHEN** an authenticated `user` posts a valid, unused license key to `/api/v1/license/activate`
- **THEN** the server validates the key with Dodo Payments, sets the user's role to `member`, and returns `200 { success: true, message: "Access granted" }`

#### Scenario: Already-used key is rejected

- **WHEN** an authenticated user posts a key that has already been activated
- **THEN** the server returns `409 { success: false, message: "This key has already been used." }`

#### Scenario: Invalid key format is rejected

- **WHEN** the `key` field is missing or not a non-empty string
- **THEN** `zValidator` returns a 400 validation error before the handler runs

#### Scenario: Already a member attempts to activate

- **WHEN** a user with role `member` or `admin` calls the activate endpoint
- **THEN** the server returns `200 { success: true, message: "You already have access." }` without re-processing the key

#### Scenario: Dodo Payments API unreachable

- **WHEN** the Dodo Payments API times out or returns a 5xx during key validation
- **THEN** the server returns `503 { success: false, message: "Could not verify key. Please try again shortly." }` and does NOT upgrade the user's role

### Requirement: License key activation UI

The system SHALL provide an `/activate` page (auth required) with a single text input for the license key and a submit button. On success, the user is redirected to `/feed`. On error, an inline error message is shown below the input.

#### Scenario: Successful activation redirects to feed

- **WHEN** a `user` submits a valid key on the `/activate` page
- **THEN** the mutation succeeds, a success toast is shown, and TanStack Router navigates to `/feed`

#### Scenario: Invalid key shows inline error

- **WHEN** the user submits an invalid or already-used key
- **THEN** an inline error message appears below the input field; the user remains on `/activate`

#### Scenario: Unauthenticated visitor accesses /activate

- **WHEN** a visitor without a session navigates to `/activate`
- **THEN** `beforeLoad` redirects them to `/login` with a `redirect=/activate` search param

### Requirement: Member access is enforced via Gate policy

The system SHALL enforce `content:read` permission for all member-only routes via `Gate.assert("content.read", { actor: user })` in `beforeLoad`. Users without the `member` or `admin` role SHALL be redirected to `/activate`.

#### Scenario: Non-member attempts to access /feed

- **WHEN** a `user` role navigates to `/feed`
- **THEN** `Gate.assert` throws `PolicyError`, the `errorComponent` renders, and a "Get Access" button links to `/activate`

#### Scenario: Member accesses /feed

- **WHEN** a `member` role navigates to `/feed`
- **THEN** `Gate.assert("content.read")` passes and the feed renders

#### Scenario: Admin accesses /feed

- **WHEN** an `admin` role navigates to `/feed`
- **THEN** the global admin bypass in `Gate.before()` passes and the feed renders
