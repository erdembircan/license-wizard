# License Headers

Separate from the project-root `LICENSE` file, many licenses ask authors to place a short **license notice** at the top of *each source file*. This per-file notice is the "license header". License Wizard can write these headers across a project's source files.

## The Two Forms a Header Can Take

There are two distinct, widely-used conventions, and License Wizard supports both as a user choice.

### Short — the SPDX tag

A machine-readable one-liner (optionally with a copyright line), recognized by GitHub, license scanners, IDEs, and the [REUSE](https://reuse.software/) specification:

```js
// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Erdem Bircan
```

- `SPDX-License-Identifier:` declares the license by its SPDX id. This is the important line; tools detect this exact prefix.
- `SPDX-FileCopyrightText:` declares copyright (from the REUSE spec).

The short form works for **every** license, because the SPDX identifier always exists.

### Full — the standard header notice

The complete notice a license publishes for files to carry. For example, Apache-2.0's runs ~11 lines ("Licensed under the Apache License, Version 2.0… distributed on an AS IS BASIS…"). This text comes from SPDX (see below). Only some licenses publish one.

## SPDX Data: `standardLicenseHeader`

The full header text is published in the SPDX License List detail files, exactly parallel to how the license body is published in two forms:

| License body | License header |
|--------------|----------------|
| `licenseText` — plain text | `standardLicenseHeader` — plain text |
| `standardLicenseTemplate` — `<<var;…>>` markup | `standardLicenseHeaderTemplate` — `<<var;…>>` markup |

- **`standardLicenseHeader`** is documented by SPDX as "Text for a license notice as specifically delineated by the license or license appendix" (see the SPDX `accessingLicenses.md`). It carries literal placeholders such as `[yyyy]` and `[name of copyright owner]`.
- **`standardLicenseHeaderTemplate`** is the same notice with the SPDX template markup, so the copyright placeholders can be substituted with real values. It uses the **identical** `<<var;name="…";original="…";match="…">>` syntax as the body template, so the same parser handles both.

**Not every license has these fields.** Apache-2.0, the GPL/AGPL/LGPL family (the GPLs), and MPL-2.0 publish a `standardLicenseHeader`; MIT, BSD-3-Clause, ISC, EUPL, and CDDL do not. Because the data differs license to license, the **schema** (the field names above), not any single license's data, is the authoritative reference for what a tool can rely on.

## Where Headers Go (and Don't)

- **Do** add headers to source code: JavaScript/TypeScript (`.js .jsx .mjs .cjs .ts .tsx .cts .mts`) and PHP (`.php`).
- **Don't** add them to JSON (no comment syntax), to generated/bundled/minified output, or to vendored/installed dependencies (`node_modules/`, Composer's `vendor/`).
- A `#!` shebang stays on the first line; in PHP the header goes **after** the `<?php` open tag (a comment before it would be emitted as page output).
- Respect the project's `.gitignore` — files it excludes are not source the tool should touch.

## See Also

- [SPDX License List Data](spdx-license-list-data.md) — where `standardLicenseHeader` is published, alongside `licenseText` and `standardLicenseTemplate`.
- [Template Syntax](template-syntax.md) — the `<<var;…>>` markup, shared by the body and header templates.
- [Identifiers and Expressions](identifiers-and-expressions.md) — the `SPDX-License-Identifier` value used in the short header.
- [File Naming and Location](file-naming-and-location.md) — the project-root `LICENSE` file, the header's counterpart.
