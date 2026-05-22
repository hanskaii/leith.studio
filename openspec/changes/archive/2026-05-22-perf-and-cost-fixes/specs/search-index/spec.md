## MODIFIED Requirements

### Requirement: Reindex endpoint completes within Worker time budget

`POST /api/v1/studio/search/reindex` MUST process R2 writes concurrently in chunks of 20 rather than sequentially. Each chunk MUST be awaited before the next starts so backpressure is maintained. The endpoint MUST complete within the 60-second Workers wall-clock limit for catalogs up to 500 published posts.

#### Scenario: Reindex a catalog of 100 posts

- **WHEN** `POST /api/v1/studio/search/reindex` is called with 100 published ready posts in D1
- **THEN** the endpoint writes all 100 R2 documents
- **AND** returns `{ indexed: 100 }` within 60 seconds
- **AND** writes are issued in parallel batches of 20

#### Scenario: Sequential writes are NOT used

- **WHEN** the reindex endpoint executes
- **THEN** R2 PUT operations within each chunk run concurrently via `Promise.all`
- **AND** the endpoint does NOT `await` each individual `search.index()` call in a serial loop

#### Scenario: Partial failure within a chunk

- **WHEN** one R2 PUT in a chunk rejects
- **THEN** the `Promise.all` for that chunk rejects
- **AND** the endpoint returns a 500 error indicating partial failure
- **AND** the `indexed` count is NOT returned (failure is explicit)
