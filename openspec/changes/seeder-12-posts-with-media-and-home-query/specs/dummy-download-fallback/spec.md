## ADDED Requirements

### Requirement: Dev download fallback when R2 object absent
When the Cloudflare R2 storage object is not found for a given `fileKey`, and the env binding `ASSETS_DEV_FALLBACK` equals `"true"`, the download endpoint SHALL redirect the client to a public placeholder URL appropriate for the asset format instead of throwing a 404 error. This allows end-to-end download flow testing in local/dev environments without uploading real binary files to R2.

#### Scenario: Image asset fallback (jpg/png)
- **WHEN** `GET /api/v1/posts/:slug/download` is called for a published post
- **AND** `ASSETS_DEV_FALLBACK` is `"true"`
- **AND** `STORAGE.get(fileKey)` returns `null`
- **AND** the asset format is `jpg` or `png`
- **THEN** the endpoint SHALL return `302` with `Location` pointing to a public Unsplash placeholder image URL

#### Scenario: Video asset fallback (mp4/webm)
- **WHEN** `GET /api/v1/posts/:slug/download` is called for a published post
- **AND** `ASSETS_DEV_FALLBACK` is `"true"`
- **AND** `STORAGE.get(fileKey)` returns `null`
- **AND** the asset format is `mp4` or `webm`
- **THEN** the endpoint SHALL return `302` with `Location` pointing to a public sample video URL

#### Scenario: Production path unaffected
- **WHEN** `ASSETS_DEV_FALLBACK` is absent or not `"true"`
- **AND** `STORAGE.get(fileKey)` returns `null`
- **THEN** the endpoint SHALL throw `ApiError.notFound("Asset file not found.")`

#### Scenario: Real R2 object always wins
- **WHEN** `STORAGE.get(fileKey)` returns a non-null object
- **THEN** the endpoint SHALL stream the R2 object body regardless of `ASSETS_DEV_FALLBACK` value
