# Other Sources

Beyond the SPDX License List Data and the GitHub Licenses API, two additional sources provide useful license data.

## choosealicense.com

A GitHub-maintained website that helps developers pick a license. The underlying data is open-source and provides structured license information.

**Website**: https://choosealicense.com
**Repository**: https://github.com/github/choosealicense.com

### Data Format

License files in the `_licenses/` directory use YAML front matter followed by the license text:

```yaml
---
title: MIT License
spdx-id: MIT
featured: true
hidden: false
description: A short and simple permissive license...
how: Create a text file (typically named LICENSE or LICENSE.txt)...
permissions:
  - commercial-use
  - modifications
  - distribution
  - private-use
conditions:
  - include-copyright
limitations:
  - liability
  - warranty
---
MIT License

Copyright (c) [year] [fullname]

Permission is hereby granted, free of charge...
```

### Strengths

- **Human-readable descriptions** (`description`, `how` fields) that explain what a license does in plain language
- **Permissions/conditions/limitations metadata** in a structured format
- **Curated** — covers the most popular licenses with opinionated guidance
- **Same data** that powers the GitHub Licenses API

### Limitations

- Covers only the most popular licenses (roughly 30)
- Not an ISO standard; it is a GitHub community project
- Placeholder format (`[year]`, `[fullname]`) differs from SPDX template syntax

## Open Source Initiative (OSI) License Pages

The OSI is the organization that defines "open source." Their website hosts the canonical text of all OSI-approved licenses.

**Website**: https://opensource.org/licenses

### Strengths

- **Canonical source** for OSI-approved license texts
- **Authoritative** — the OSI is the defining body for open-source licensing
- Referenced by the SPDX `seeAlso` field as a canonical URL for many licenses

### Limitations

- HTML format only (not machine-readable JSON)
- No structured metadata (no permissions/conditions/limitations)
- Designed for human reading, not automated consumption

## Free Software Foundation (FSF)

The FSF maintains the GPL family of licenses and provides guidance on license compatibility.

**Website**: https://www.gnu.org/licenses/

### Strengths

- **Canonical source** for GPL, LGPL, AGPL, and FDL license texts
- Authoritative guidance on GPL compliance and interpretation
- Referenced by SPDX as the canonical source for GPL-family licenses

### Limitations

- Only covers FSF-maintained licenses
- HTML format, not structured data

## See Also

- [SPDX License List Data](spdx-license-list-data.md) — the most comprehensive machine-readable source
- [GitHub Licenses API](github-licenses-api.md) — REST API powered by choosealicense.com data
- [Source Trust and Verification](source-trust-and-verification.md) — how these sources are verified
