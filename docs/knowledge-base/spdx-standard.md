# SPDX Standard

SPDX (Software Package Data Exchange) is an open standard for communicating software bill of materials (SBOM) information, including licenses. It provides the authoritative catalog of open-source license identifiers, full license texts, and machine-readable metadata.

SPDX is not a niche tool — it is an ISO standard (ISO/IEC 5962:2021) maintained by the Linux Foundation's SPDX Workgroup. Its license identifiers are used by virtually every major package ecosystem: npm, PyPI, Maven, Cargo, Go modules, and more. When you write `"license": "MIT"` in a `package.json`, you are using an SPDX identifier.

The standard covers three key areas for this knowledge base: the identifier system that names licenses unambiguously, the template syntax that defines replaceable variables in license text, and the lifecycle of identifiers as they get deprecated and replaced.

## Topics

- [Identifiers and Expressions](identifiers-and-expressions.md) — simple IDs, versioned IDs, SPDX expressions with OR and WITH
- [Template Syntax](template-syntax.md) — the `<<var;...>>` variable format for replaceable sections
- [Deprecated Identifiers](deprecated-identifiers.md) — superseded IDs and their current replacements

## Key Facts

| Attribute | Value |
|-----------|-------|
| Full name | Software Package Data Exchange |
| ISO standard | ISO/IEC 5962:2021 |
| Maintained by | Linux Foundation (SPDX Workgroup) |
| Website | https://spdx.org |
| License list | https://spdx.org/licenses/ |
| Used by | npm, PyPI, Maven, Cargo, Go modules, Composer |
| Backed by | Linux Foundation, Google, Microsoft, and others |

## See Also

- [License Text Sources](license-text-sources.md) — where SPDX data can be fetched programmatically
- [License Field Formats](license-field-formats.md) — how package managers use SPDX identifiers
- [License Types](license-types.md) — the licenses that SPDX catalogs
