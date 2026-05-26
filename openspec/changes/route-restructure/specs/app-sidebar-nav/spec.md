## MODIFIED Requirements

### Requirement: Role-filtered menu groups render in sidebar

The sidebar SHALL display navigation groups and items filtered to the current user's role. The `MENU_CONFIG` SHALL include at minimum two entries: `type = "user"` and `type = "admin"`. For users with role `"admin"`, the admin entry's groups SHALL render. For all other roles (or no role), the user entry's groups SHALL render as the default. Items outside the matching role type SHALL NOT be rendered.

#### Scenario: User role sees user menu only

- **WHEN** the authenticated user has role `"user"` (or no role)
- **THEN** the sidebar renders the `type = "user"` groups; the `type = "admin"` groups are not visible

#### Scenario: Admin role sees admin menu items

- **WHEN** the authenticated user has role `"admin"`
- **THEN** the sidebar renders the `type = "admin"` groups, which include navigation items for `/users` and `/events` at minimum, plus the shared `/overview` entry

#### Scenario: No matching role type falls back to user menus

- **WHEN** `session.user.role` is `null`, `undefined`, or does not match any `type` in `MENU_CONFIG`
- **THEN** the sidebar defaults to the `"user"` type menu groups

## ADDED Requirements

### Requirement: Admin sidebar entry exists in MENU_CONFIG

The `MENU_CONFIG` in `(app)/_app/route.tsx` SHALL include a `type = "admin"` entry whose groups expose the flat admin routes (`/overview`, `/users`, `/events`). The admin sidebar SHALL NOT contain any URLs prefixed with `/s/`.

#### Scenario: Admin menu has flat URLs

- **WHEN** the admin user opens the sidebar
- **THEN** each admin nav item links to a URL without the `/s/` prefix

#### Scenario: Admin sees overview, users, and events

- **WHEN** an admin user is signed in
- **THEN** the sidebar contains entries linking to `/overview`, `/users`, and `/events`
