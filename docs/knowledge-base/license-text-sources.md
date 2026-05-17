# License Text Sources

When building tools that work with software licenses, you need access to authoritative, machine-readable license texts. Several sources provide this data, each with different levels of coverage, format options, and trust guarantees.

The most comprehensive source is the SPDX License List Data repository, which provides the complete catalog in multiple formats. The GitHub Licenses API offers a convenient REST interface with metadata like permissions and conditions. Other sources like choosealicense.com and OSI license pages serve complementary roles.

Choosing the right source depends on your needs: SPDX for completeness and authority, GitHub API for convenience and metadata, and choosealicense.com for human-readable descriptions.

## Topics

- [SPDX License List Data](spdx-license-list-data.md) — the official, comprehensive data repository
- [GitHub Licenses API](github-licenses-api.md) — REST API with license text and metadata
- [Other Sources](other-sources.md) — choosealicense.com and OSI license pages
- [Source Trust and Verification](source-trust-and-verification.md) — why these sources are trustworthy

## Source Comparison

| Source | Coverage | Formats | Auth Required | Rate Limits |
|--------|----------|---------|--------------|-------------|
| SPDX License List Data | Full SPDX catalog (600+) | JSON, HTML, text, template, RDFa | No | None (static files) |
| GitHub Licenses API | ~40+ popular licenses | JSON | No (optional) | 60/hr (unauth), 5000/hr (auth) |
| choosealicense.com | ~30 popular licenses | YAML + text | No | None (static files) |
| OSI License Pages | All OSI-approved | HTML | No | None |

## See Also

- [SPDX Standard](spdx-standard.md) — the specification behind the SPDX license catalog
- [Caching and Retrieval](caching-and-retrieval.md) — strategies for fetching and caching license data
