# SPDX License List Data

The SPDX License List Data repository is the most comprehensive and authoritative source for machine-readable license texts. Published by the SPDX Legal Team (Linux Foundation), it contains the entire SPDX license catalog in multiple formats.

**Repository**: https://github.com/spdx/license-list-data

## Available Formats

| Format | Path | Description |
|--------|------|-------------|
| JSON | `json/licenses.json` | Master index of all licenses |
| JSON (individual) | `json/details/{spdx_id}.json` | Per-license detail files |
| HTML | `html/` | Rendered HTML versions |
| Plain text | `text/` | Plain text versions |
| Template | `template/` | Text with SPDX template markup |
| RDFa | `rdfxml/` | RDF/XML for semantic web use |

## The Master Index: `licenses.json`

The central mapping file. Contains an array of all licenses with metadata:

```json
{
  "licenseListVersion": "3.25.0",
  "licenses": [
    {
      "licenseId": "MIT",
      "name": "MIT License",
      "reference": "https://spdx.org/licenses/MIT.html",
      "referenceNumber": 256,
      "isDeprecatedLicenseId": false,
      "detailsUrl": "https://spdx.org/licenses/MIT.json",
      "isOsiApproved": true,
      "isFsfLibre": true,
      "seeAlso": [
        "https://opensource.org/licenses/MIT"
      ]
    }
  ]
}
```

### Index Fields

| Field | Description |
|-------|-------------|
| `licenseId` | SPDX identifier (e.g., `MIT`, `Apache-2.0`) |
| `name` | Full human-readable name |
| `reference` | URL to the SPDX HTML page for this license |
| `detailsUrl` | URL to the detailed JSON file |
| `isDeprecatedLicenseId` | Whether this ID has been superseded |
| `isOsiApproved` | OSI approval status |
| `isFsfLibre` | FSF free/libre status |
| `seeAlso` | Canonical URLs for the license text |

## Individual License Detail Files

Each license has a detailed JSON file at `https://spdx.org/licenses/{licenseId}.json`:

| Field | Description |
|-------|-------------|
| `licenseId` | SPDX identifier |
| `name` | Full license name |
| `licenseText` | Complete license text (plain text) |
| `standardLicenseTemplate` | Text with SPDX template markup for variable sections |
| `isOsiApproved` | OSI approval status |
| `isFsfLibre` | FSF free/libre status |
| `crossRef` | Array of canonical URLs with validity flags |
| `isDeprecatedLicenseId` | Whether superseded |

## Raw GitHub URLs

An alternative to the SPDX API, fetching directly from the repository:

| Resource | URL Pattern |
|----------|------------|
| Master index | `https://raw.githubusercontent.com/spdx/license-list-data/main/json/licenses.json` |
| Individual license | `https://raw.githubusercontent.com/spdx/license-list-data/main/json/details/{licenseId}.json` |
| Plain text | `https://raw.githubusercontent.com/spdx/license-list-data/main/text/{licenseId}.txt` |

## Source Repository

The license-list-data repository is generated from XML source files maintained in a separate repository:

- **Source**: https://github.com/spdx/license-list-XML
- The XML source is processed to produce all output formats (JSON, HTML, text, template, RDFa)

## Versioning

- The `licenseListVersion` field in `licenses.json` tracks the catalog version (e.g., `3.25.0`)
- New versions are published roughly every few months
- Individual license texts rarely change between versions

## See Also

- [GitHub Licenses API](github-licenses-api.md) — an alternative source with a REST API interface
- [Other Sources](other-sources.md) — choosealicense.com and OSI pages
- [Source Trust and Verification](source-trust-and-verification.md) — why SPDX is the most authoritative source
- [Caching and Retrieval](caching-and-retrieval.md) — how to efficiently consume this data
- [Template Syntax](template-syntax.md) — the template markup used in the `standardLicenseTemplate` field
