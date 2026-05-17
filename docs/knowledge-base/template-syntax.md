# Template Syntax

SPDX license templates define a standardized syntax for marking replaceable and optional sections in license text. This allows automated tools to match license text against known licenses even when variable fields (like copyright holder names) differ, and to generate license files with correct placeholder handling.

The syntax is defined in the SPDX Specification (v2.3.0 and v3.0.1).

## Variable Format

The core syntax for a replaceable variable:

```
<<var;name=varName;original=originalText;match=regexPattern>>
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier within the license template |
| `original` | Yes | The original text being replaced (serves as the default value) |
| `match` | Yes | POSIX Extended Regular Expression defining what values are acceptable |

### Tag Types

| Type | Syntax | Purpose |
|------|--------|---------|
| `var` | `<<var;name=...;original=...;match=...>>` | Marks a replaceable section |
| `beginOptional` | `<<beginOptional>>` | Marks the start of an omittable section |
| `endOptional` | `<<endOptional>>` | Marks the end of an omittable section |

## Default Behavior

- If a variable is **substituted**: the provided value replaces the `original` text
- If a variable is **not substituted**: the `original` field value is used as-is
- This means most variables can be auto-handled with sensible defaults

## Common Variable Patterns

| Pattern | Examples | Purpose |
|---------|----------|---------|
| Copyright | `copyright`, `copyright1` | Copyright statements |
| Organization | `organizationClause3`, `copyrightHolder` | Company or person names |
| Software Terms | `software`, `software2`, `code` | "software" vs. "work" vs. "materials" |
| Grammar Variants | `tobe`, `express` | "is"/"are", "express"/"expressed" |
| Bullets/Numbers | `bullet` | List numbering (1, 2, 3) |

## License-Specific Variables

### MIT License

| Variable | Purpose | Handling |
|----------|---------|----------|
| `copyright` | Copyright statement | **Required** — must be provided |
| `Software1` through `Software8` | Software/Materials variants | Auto-handled (defaults to "Software") |
| `copyrightHolder` | Attribution parties | Auto-handled |

### Apache License 2.0

| Variable | Purpose | Handling |
|----------|---------|----------|
| `copyright` | Copyright statement | **Required** — must be provided |
| `bullet` | Section numbering | Auto-handled |

## Standardization

Two important facts about SPDX template variables:

1. **Variable names are NOT standardized across licenses.** Each license defines its own variable names. The MIT License uses `copyright` and `Software1`; another license might use completely different names.

2. **The template syntax IS standardized.** The `<<var;...>>` parsing logic works identically for all licenses. You build one parser, and it handles every license template.

## No Official JavaScript Parser

As of the current SPDX specification, there is no official JavaScript implementation for parsing template variables. Any tool working with SPDX templates in JavaScript needs to implement its own parser for the `<<var;...>>` syntax.

The parsing itself is straightforward (the syntax is regular and well-defined), but it must be implemented from scratch.

## References

- [SPDX Specification v2.3.0 — License Templates](https://spdx.github.io/spdx-spec/v2.3/license-matching-guidelines-and-templates/)
- [SPDX Specification v3.0.1 — License Matching](https://spdx.github.io/spdx-spec/v3.0.1/annexes/license-matching-guidelines-and-templates/)
- [SPDX standardLicenseTemplate Property](https://spdx.github.io/spdx-spec/v3.0.1/model/ExpandedLicensing/Properties/standardLicenseTemplate/)

## See Also

- [SPDX License List Data](spdx-license-list-data.md) — where the template files are stored
- [Identifiers and Expressions](identifiers-and-expressions.md) — the identifier that selects which template to use
- [SPDX Standard](spdx-standard.md) — overview of the SPDX specification
