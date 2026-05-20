## ADDED Requirements

### Requirement: Feed page fetches live posts instead of static array
The `/feed` route (`_home/feed/index.tsx`) SHALL replace the static `FEED_ASSETS` import with a live `useSuspenseQuery` call using `postsQueryOptions(page)`, where `page` is derived from URL search params. Client-side filter (type, tag, search query) and sort (newest, popular) SHALL be applied to the fetched items after a `toFeedAsset()` mapping, preserving the existing UX.

#### Scenario: Feed loads real posts
- **WHEN** a user visits `/feed`
- **THEN** the feed grid SHALL show a skeleton until the API responds
- **AND** SHALL render the fetched posts mapped to `FeedAsset` shape

#### Scenario: Type filter works on live data
- **WHEN** the user selects the "image" type filter
- **THEN** only posts with format `jpg` or `png` SHALL be displayed
- **WHEN** the user selects the "video" type filter
- **THEN** only posts with format `mp4` or `webm` SHALL be displayed

#### Scenario: Tag filter works on live data
- **WHEN** a tag pill is selected (e.g., "Loop")
- **THEN** only posts whose `tags` array contains that tag SHALL be shown

#### Scenario: Sort by popular uses downloadCount
- **WHEN** the user selects sort "popular"
- **THEN** posts SHALL be sorted descending by `downloadCount`

#### Scenario: Static FEED_ASSETS removed
- **WHEN** the feed page renders
- **THEN** it SHALL NOT import or reference `FEED_ASSETS` from `-lib/feed-data.ts`
