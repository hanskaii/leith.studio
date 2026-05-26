## ADDED Requirements

### Requirement: Role-filtered menu groups render in sidebar

The sidebar SHALL display navigation groups and items filtered to the current user's role. Items outside the matching role type SHALL NOT be rendered.

#### Scenario: User role sees UTAMA and RIWAYAT groups

- **WHEN** the authenticated user has role `"user"` (or no role)
- **THEN** the sidebar renders two groups: "UTAMA" with items Beranda and Dompet, and "RIWAYAT" with items Donasi, Pesanan, and Membership

#### Scenario: No matching role type falls back to user menus

- **WHEN** `session.user.role` is `null`, `undefined`, or does not match any `type` in `MENU_CONFIG`
- **THEN** the sidebar defaults to the `"user"` type menu groups

### Requirement: Nav items link to correct routes with active state

Each nav item SHALL render as a navigable link to its configured `url`. The currently active item SHALL be visually distinguished.

#### Scenario: Beranda item links to /dashboard

- **WHEN** the user clicks "Beranda"
- **THEN** the router navigates to `/dashboard`

#### Scenario: Active item is highlighted

- **WHEN** the current route matches a nav item's `url`
- **THEN** that item renders with active styling (background highlight, text emphasis)

#### Scenario: Inactive items render without highlight

- **WHEN** the current route does not match a nav item's `url`
- **THEN** that item renders without active styling

### Requirement: Nav items render their configured icon

Each nav item SHALL display an icon resolved from the string name in the menu config.

#### Scenario: Known icon name renders icon

- **WHEN** a menu item has `icon: "Home01Icon"`
- **THEN** the `Home01Icon` from `@hugeicons/core-free-icons` is rendered via `HugeiconsIcon`

#### Scenario: Icons registered for all current menu items

- **WHEN** any of the 5 configured items renders (Home01Icon, Wallet03Icon, FavouriteIcon, ShoppingBag01Icon, StarIcon)
- **THEN** the correct Hugeicons icon object is resolved without error

### Requirement: Sidebar header links to creator profile page

The sidebar header SHALL display the current user's username and link to their public profile.

#### Scenario: User with username sees profile link

- **WHEN** `session.user.username` is set
- **THEN** the header links to `/$username` with `@{username}` as the param and displays the username below "Lihat Halaman"

#### Scenario: User without username sees setup prompt

- **WHEN** `session.user.username` is null or undefined
- **THEN** the header links to `/settings/profile` and shows "Setup Profile" as the subtitle

### Requirement: Sidebar footer shows user card with actions dropdown

The sidebar footer SHALL display the authenticated user's name, email, and avatar. A dropdown SHALL provide access to Settings and Sign out.

#### Scenario: User card shows name and email

- **WHEN** the sidebar footer renders
- **THEN** the user's `name` and `email` are visible in the footer card

#### Scenario: Settings action opens settings modal

- **WHEN** the user clicks "Pengaturan" in the footer dropdown
- **THEN** navigation occurs to `/?modal=settings`

#### Scenario: Sign out action ends session

- **WHEN** the user clicks "Keluar" in the footer dropdown
- **THEN** `authClient.signOut()` is called and the user is redirected to `/login`
