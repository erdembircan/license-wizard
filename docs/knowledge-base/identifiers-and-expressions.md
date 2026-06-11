# Identifiers and Expressions

SPDX assigns a unique, short identifier to every cataloged license. These identifiers are the standard way to reference licenses across all major package ecosystems.

## Identifier Types

### Simple Identifiers

The most common form — a short string that names a specific license.

| Identifier | License |
|-----------|---------|
| `MIT` | MIT License |
| `ISC` | ISC License |
| `Unlicense` | The Unlicense |

### Versioned Identifiers

For licenses that have multiple versions, the identifier includes the version number and a suffix indicating scope.

| Identifier | Meaning |
|-----------|---------|
| `GPL-3.0-only` | GNU GPL version 3, this version only |
| `GPL-3.0-or-later` | GNU GPL version 3 or any later version |
| `GPL-2.0-only` | GNU GPL version 2, this version only |
| `GPL-2.0-or-later` | GNU GPL version 2 or any later version |
| `LGPL-3.0-only` | GNU Lesser GPL version 3 only |
| `AGPL-3.0-only` | GNU Affero GPL version 3 only |
| `Apache-2.0` | Apache License version 2.0 |
| `BSD-2-Clause` | BSD 2-Clause License |
| `BSD-3-Clause` | BSD 3-Clause License |

The `-only` and `-or-later` suffixes were introduced to remove ambiguity. See [Deprecated Identifiers](deprecated-identifiers.md) for the older forms.

## SPDX Expressions

SPDX defines a syntax for expressing complex licensing scenarios using operators.

### OR (Dual Licensing)

When software is available under a choice of licenses:

```
MIT OR Apache-2.0
```

This means the user can choose either license. In `package.json`, this appears as:

```json
{
  "license": "(MIT OR Apache-2.0)"
}
```

### AND (Combined Licensing)

When software requires compliance with multiple licenses simultaneously:

```
MIT AND BSD-2-Clause
```

### WITH (License Exceptions)

When a license is used with a specific exception:

```
GPL-2.0-only WITH Classpath-exception-2.0
```

Exceptions modify the base license to add specific permissions. The SPDX project maintains a separate exceptions list.

### Operator Precedence

In complex expressions, `WITH` binds tighter than `AND`, which binds tighter than `OR`. Parentheses can be used for clarity:

```
(MIT OR Apache-2.0) AND BSD-3-Clause
```

## SPDX Exceptions List

License exceptions are cataloged separately from licenses:

- **Index**: `https://spdx.org/licenses/exceptions.json`
- **Repository**: `json/exceptions.json` in the `spdx/license-list-data` repository

Each exception has its own identifier (e.g., `Classpath-exception-2.0`, `LLVM-exception`) and is only valid when combined with specific base licenses using the `WITH` operator.

## Identifier Resolution

SPDX identifiers are case-insensitive for matching purposes, but the canonical form uses the casing shown in the SPDX License List (e.g., `MIT` not `mit`, `Apache-2.0` not `apache-2.0`).

The `licenses.json` index file is the authoritative source for resolving identifiers to their canonical form.

## See Also

- [Deprecated Identifiers](deprecated-identifiers.md) — old identifiers that have been superseded
- [Template Syntax](template-syntax.md) — the variable system built on top of identified licenses
- [License Field Formats](license-field-formats.md) — where SPDX identifiers are used in package manifests
- [SPDX License List Data](spdx-license-list-data.md) — the data repository that defines all identifiers
