# Source Trust and Verification

When fetching license texts programmatically, the source must be trustworthy. An incorrect or tampered license text could have legal consequences. This document explains why the recommended sources are authoritative and how to verify their integrity.

## Trust Hierarchy

| Source | Maintained By | Trust Factor |
|--------|--------------|-------------|
| SPDX License List | Linux Foundation (SPDX Legal Team) | ISO standard (ISO/IEC 5962:2021); used by all major ecosystems |
| GitHub Licenses API | GitHub (Microsoft) | Backed by choosealicense.com; uses SPDX IDs |
| choosealicense.com | GitHub (open source) | Community-reviewed; linked from GitHub UI |
| OSI License Pages | Open Source Initiative | The organization that defines "open source" |
| FSF License Pages | Free Software Foundation | Maintains the GPL family of licenses |

## Verification Mechanisms

### SPDX Data

- License texts are **reviewed by the SPDX Legal Team** before inclusion in the catalog
- Each license entry includes `seeAlso` URLs pointing to the canonical source (e.g., `opensource.org`, `gnu.org`)
- The `crossRef` field in detail files includes validity flags: `isWayBackLink`, `isLive`, `isValid`
- The SPDX GitHub repository can be verified via **git commit signatures**

### GitHub API

- Data comes from the choosealicense.com repository, which is community-reviewed and open-source
- The API uses SPDX identifiers, ensuring alignment with the ISO standard
- Requests can be authenticated with tokens for audit trails

## Transport Security

All recommended sources are served over HTTPS:

| Source | URL |
|--------|-----|
| SPDX API | `https://spdx.org/licenses/` |
| SPDX GitHub repo | `https://github.com/spdx/license-list-data` |
| GitHub API | `https://api.github.com/licenses` |
| choosealicense.com | `https://choosealicense.com` |
| OSI | `https://opensource.org/licenses` |

## Canonical Source Tracing

The SPDX detail files provide a `crossRef` array that traces each license text back to its canonical source:

```json
"crossRef": [
  {
    "url": "https://opensource.org/licenses/MIT",
    "isValid": true,
    "isLive": true,
    "isWayBackLink": false,
    "match": "N/A",
    "timestamp": "2024-01-01T00:00:00Z",
    "order": 0
  }
]
```

This allows tools to verify that a fetched license text matches the original published by the license author.

## See Also

- [SPDX License List Data](spdx-license-list-data.md) — the most authoritative source
- [GitHub Licenses API](github-licenses-api.md) — the convenience API
- [Other Sources](other-sources.md) — choosealicense.com, OSI, FSF
- [SPDX Standard](spdx-standard.md) — the ISO standard behind the trust model
