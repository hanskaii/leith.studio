## ADDED Requirements

### Requirement: Public landing page renders without authentication

The system SHALL display a fully public landing page at `/` that is accessible to unauthenticated visitors without redirect.

#### Scenario: Unauthenticated visitor lands on root

- **WHEN** a visitor navigates to `/` with no session
- **THEN** the landing page renders fully with no login redirect

#### Scenario: Authenticated member visits landing page

- **WHEN** a logged-in `member` visits `/`
- **THEN** the landing page renders with a "Go to feed" CTA replacing the purchase CTA

### Requirement: Landing page hero communicates value proposition

The landing page SHALL contain an above-the-fold hero section with: platform name, one-line value proposition, a primary CTA button linking to the Dodo Payments checkout URL, and a visual teaser of member content.

#### Scenario: Hero section is complete

- **WHEN** the landing page renders
- **THEN** the hero displays the platform name, value proposition text, a "Get Access" CTA button, and at least one blurred/locked content preview image

#### Scenario: CTA links to checkout

- **WHEN** an unauthenticated visitor clicks "Get Access"
- **THEN** the browser navigates to the Dodo Payments checkout URL for the license key product

### Requirement: Landing page shows locked content preview

The landing page SHALL display a teaser section showing 3 recent post titles and blurred cover images to demonstrate content value, with an overlay indicating member-only access.

#### Scenario: Preview cards render

- **WHEN** the landing page loads
- **THEN** 3 recent published post cards appear with blurred cover images and a lock icon overlay

#### Scenario: Preview card click prompts upgrade

- **WHEN** a non-member clicks a preview card
- **THEN** they are scrolled to the hero CTA section (no navigation away)

### Requirement: Landing page exposes public stats

The landing page SHALL display live stats fetched from `/api/v1/posts/stats` showing total published post count and total member count.

#### Scenario: Stats render successfully

- **WHEN** the stats endpoint returns `{ postCount, memberCount }`
- **THEN** both numbers are displayed in the landing page stats section

#### Scenario: Stats endpoint fails

- **WHEN** the stats endpoint returns an error
- **THEN** the stats section is hidden gracefully (no error shown to visitor)
