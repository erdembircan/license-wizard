# Caching and Retrieval

When building tools that fetch license texts from remote sources, a well-designed retrieval and caching strategy reduces network requests, improves performance, and provides resilience against source outages.

## Data Flow

```
1. Fetch (or use cached) licenses.json from SPDX
2. Parse into a lookup map: { licenseId → detailsUrl }
3. User requests a license by SPDX ID (e.g., "MIT")
4. Look up detailsUrl from the map
5. Fetch the license detail JSON
6. Extract licenseText field
7. Replace template variables ([year], [fullname], etc.)
8. Write LICENSE file to project directory
```

The key principle: **no hardcoded URLs**. The application reads the `licenses.json` index at runtime to build a mapping from identifiers to detail URLs. This means the tool automatically picks up new licenses when SPDX publishes updates.

## Caching Strategy

### Index File (`licenses.json`)

- Cache locally with a TTL (e.g., 7 days)
- SPDX publishes new versions roughly every few months
- Use the `licenseListVersion` field to detect updates without re-downloading everything
- If the cached version matches the remote version, skip the download

### Individual License Texts

- License texts **rarely change** between SPDX releases
- Cache more aggressively (e.g., 30 days or until the index version changes)
- Store by `licenseId` for O(1) lookup

### Cache Location

Common approaches:
- User-level cache directory (e.g., `~/.cache/license-wizard/`)
- Project-level cache (e.g., `node_modules/.cache/`)
- In-memory cache for single-session tools

## Fallback Sources

If the primary source is unavailable, fall back in this priority order:

| Priority | Source | Why |
|----------|--------|-----|
| 1 | SPDX License List Data | Most comprehensive, official ISO standard |
| 2 | GitHub Licenses API | Convenient REST API, includes metadata |
| 3 | choosealicense.com repo | Good descriptions, covers popular licenses |

### Bundled Fallback

For offline use, the 5-10 most commonly used license texts (MIT, Apache 2.0, BSD 2-Clause, BSD 3-Clause, ISC, GPL v2, GPL v3) can be bundled with the tool as static files. This eliminates the network dependency for the most common cases.

## Update Detection

The `licenseListVersion` field in `licenses.json` is a semantic version (e.g., `3.25.0`). To check for updates:

1. Read the cached `licenseListVersion`
2. Fetch only the headers or the first few bytes of the remote `licenses.json`
3. Compare versions
4. If different, re-download the full index

This avoids downloading the entire index on every run.

## See Also

- [SPDX License List Data](spdx-license-list-data.md) — the primary data source
- [GitHub Licenses API](github-licenses-api.md) — the secondary source with rate limits
- [Other Sources](other-sources.md) — the tertiary fallback
- [License Text Sources](license-text-sources.md) — overview and comparison of all sources
