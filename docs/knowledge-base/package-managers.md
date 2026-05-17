# Package Managers

Every major package ecosystem provides a way to declare the license for a package in its manifest file. These declarations use SPDX identifiers to name the license, creating a standardized metadata layer that tools, registries, and compliance scanners rely on.

However, the license field in a manifest is **metadata, not a legal document**. It tells tools and humans what license the author intends, but the actual LICENSE file in the repository is the legally operative artifact. Both are needed.

This section covers how different package managers handle license declarations and how license data can be fetched and cached efficiently.

## Topics

- [License Field Formats](license-field-formats.md) — how npm, Composer, Cargo, and others declare licenses
- [Caching and Retrieval](caching-and-retrieval.md) — fetching, caching, and fallback strategies for license data

## See Also

- [Why a License File Is Required](why-a-license-file-is-required.md) — why the manifest field is not enough
- [SPDX Standard](spdx-standard.md) — the identifier system used by all package managers
- [Identifiers and Expressions](identifiers-and-expressions.md) — the identifier syntax used in license fields
