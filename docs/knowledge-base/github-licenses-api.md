# GitHub Licenses API

GitHub provides a REST API for retrieving license information. It is backed by the choosealicense.com dataset and uses SPDX identifiers.

## Endpoints

### List All Licenses

```
GET https://api.github.com/licenses
```

Returns a JSON array of license objects with SPDX IDs, names, and URLs.

### Get a Specific License

```
GET https://api.github.com/licenses/{spdx_id}
```

The `spdx_id` parameter is case-insensitive (e.g., `mit`, `MIT`, and `Mit` all work).

## Response Fields

| Field | Description |
|-------|-------------|
| `key` | Short lowercase key (e.g., `mit`) |
| `spdx_id` | Official SPDX identifier (e.g., `MIT`) |
| `name` | Full name (e.g., `MIT License`) |
| `body` | Full license text, ready to write to a LICENSE file |
| `permissions` | Array of permitted actions (e.g., `commercial-use`, `modifications`) |
| `conditions` | Array of required actions (e.g., `include-copyright`) |
| `limitations` | Array of disclaimers (e.g., `liability`, `warranty`) |
| `html_url` | Link to the choosealicense.com page |

## Placeholders in the Body

The `body` field contains the complete license text with placeholder markers:

- `[year]` — to be replaced with the copyright year
- `[fullname]` — to be replaced with the copyright holder's name

These are the GitHub/choosealicense convention. They differ from the SPDX template syntax (`<<var;...>>`) but serve the same purpose.

## Rate Limits

| Authentication | Rate Limit |
|---------------|------------|
| Unauthenticated | 60 requests per hour |
| Authenticated (token) | 5,000 requests per hour |

For a tool that fetches licenses on demand, the unauthenticated limit is usually sufficient. Authentication is only needed for high-volume or CI/CD usage.

## Coverage

The GitHub Licenses API covers approximately 40+ of the most commonly used licenses. It does **not** include the full SPDX catalog (which has 600+ entries). For uncommon or niche licenses, the SPDX License List Data repository is the better source.

## Metadata

The `permissions`, `conditions`, and `limitations` arrays provide structured metadata that is useful for:

- Building license comparison UIs
- Helping users understand what a license allows and requires
- Generating human-readable summaries

This metadata comes from the choosealicense.com dataset and is not available from the SPDX data repository directly.

## See Also

- [SPDX License List Data](spdx-license-list-data.md) — the more comprehensive alternative
- [Copyright Line Formats](copyright-line-formats.md) — how to fill in the `[year]` and `[fullname]` placeholders
- [Caching and Retrieval](caching-and-retrieval.md) — strategies for efficient API usage
- [Other Sources](other-sources.md) — choosealicense.com (the dataset behind this API)
