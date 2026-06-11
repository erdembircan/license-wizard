# Why a License File Is Required

## The Problem

Many developers declare a license in their `package.json`, `composer.json`, or other manifest file but never create an actual LICENSE file in the repository root. This creates a legal gap.

The `license` field in a manifest file is **metadata** — it tells package managers and registries what license the author intends. But it is not a legal document. The actual LICENSE file is what contains the license terms, the copyright notice, and (for some licenses) specific conditions that must be reproduced.

## Without a LICENSE File

A repository without a LICENSE file is, legally, "all rights reserved" — regardless of what the manifest says. This means:

- No one can legally copy, modify, or distribute the code
- The `license` field in package.json is an unenforceable declaration of intent
- Open-source contribution becomes legally ambiguous

## Why Both Are Needed

| Component | Purpose | Legal Weight |
|-----------|---------|-------------|
| `package.json` license field | Metadata for tools and registries | Informational only |
| LICENSE file | Contains the actual legal terms | Legally operative |

The manifest field helps automated tools (npm, license scanners, compliance audits) quickly identify the license type. The LICENSE file is the actual legal instrument that grants permissions.

## Compliance and Tooling

License compliance tools actively flag repositories that have a `license` field in their manifest but no corresponding LICENSE file. This is because:

- GitHub, npm, and Packagist surface license information but rely on the actual file for accuracy
- Automated license audits in enterprise environments treat a missing file as a compliance violation
- Open-source contribution guidelines typically require a clear LICENSE file

## Platform Detection

GitHub automatically detects LICENSE files (regardless of extension) and displays the license type in the repository header. npm shows the license on the package page. These platforms read the file, not just the manifest field.

## See Also

- [License Field Formats](license-field-formats.md) — how different package managers declare the license in their manifest
- [Common Mistakes](common-mistakes.md) — other frequent licensing errors beyond missing files
- [Copyright Basics](copyright-basics.md) — why "all rights reserved" is the default
