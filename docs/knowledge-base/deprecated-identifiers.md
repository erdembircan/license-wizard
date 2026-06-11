# Deprecated Identifiers

Some SPDX license identifiers have been deprecated in favor of more precise replacements. Deprecated identifiers still appear in existing projects and package manifests, but new projects should use the current forms.

## Why Identifiers Get Deprecated

The primary reason is **ambiguity**. The original identifier `GPL-3.0` did not specify whether it meant "version 3 only" or "version 3 or any later version." Since these are legally distinct terms, SPDX split the ambiguous identifier into two precise ones.

## Deprecated GPL-Family Identifiers

| Deprecated ID | Replacement(s) | Reason |
|---------------|----------------|--------|
| `GPL-2.0` | `GPL-2.0-only` or `GPL-2.0-or-later` | Ambiguous version scope |
| `GPL-3.0` | `GPL-3.0-only` or `GPL-3.0-or-later` | Ambiguous version scope |
| `LGPL-2.0` | `LGPL-2.0-only` or `LGPL-2.0-or-later` | Ambiguous version scope |
| `LGPL-2.1` | `LGPL-2.1-only` or `LGPL-2.1-or-later` | Ambiguous version scope |
| `LGPL-3.0` | `LGPL-3.0-only` or `LGPL-3.0-or-later` | Ambiguous version scope |
| `AGPL-3.0` | `AGPL-3.0-only` or `AGPL-3.0-or-later` | Ambiguous version scope |

## Detection

The SPDX `licenses.json` index file includes an `isDeprecatedLicenseId` boolean field for each license entry. Tools can use this flag to:

- Warn users when they specify a deprecated identifier
- Suggest the appropriate replacement
- Map deprecated identifiers to their current equivalents during license resolution

## Handling in Tooling

When a tool encounters a deprecated identifier like `GPL-3.0`:

1. Recognize it as valid but deprecated
2. Warn the user that the identifier is ambiguous
3. Ask whether they mean `-only` or `-or-later`
4. If no user input is available, treat it as the `-only` variant (the more conservative interpretation)

## Impact on Existing Projects

Many existing `package.json` files and other manifests still use deprecated identifiers. This is not a breaking issue — the deprecated IDs remain in the SPDX list and are understood by all tooling. However, updating to the precise forms eliminates ambiguity and aligns with current best practices.

## See Also

- [Identifiers and Expressions](identifiers-and-expressions.md) — the full identifier system including the current forms
- [License Field Formats](license-field-formats.md) — where deprecated identifiers commonly appear
- [SPDX Standard](spdx-standard.md) — the specification that governs identifier lifecycle
