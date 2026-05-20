## ADDED Requirements

### Requirement: AssetGrid fetches live posts from API
The `AssetGrid` component on the landing page (`_home/index.tsx`) SHALL fetch and render assets from the live posts API using `useSuspenseQuery` backed by `postsQueryOptions(1)`, replacing the static `ASSETS` array. The component SHALL be wrapped in `<Suspense>` with a grid skeleton fallback so the page shell (hero, nav) renders immediately.

#### Scenario: Assets load from API
- **WHEN** a visitor loads the landing page
- **THEN** the `AssetGrid` section SHALL display a grid skeleton until the API responds
- **AND** SHALL render the fetched posts (up to 12) as `FeedCard` components

#### Scenario: API data maps to FeedCard props
- **WHEN** the API returns a post with format `mp4` or `webm`
- **THEN** the card SHALL display `type: "video"`
- **WHEN** the API returns a post with format `jpg` or `png`
- **THEN** the card SHALL display `type: "image"`
- **AND** `tags[0]` SHALL be used as the `tag` prop
- **AND** `downloadCount` SHALL be used as `popularity`

#### Scenario: Static ASSETS array removed
- **WHEN** the `AssetGrid` component is rendered
- **THEN** it SHALL NOT import or reference the static `ASSETS` array from `home-data.ts`
