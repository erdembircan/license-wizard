# Copyleft Licenses

Copyleft licenses require that derivative works be distributed under the same (or a compatible) license. This is the fundamental distinction from permissive licenses: while permissive licenses allow proprietary forks, copyleft ensures modifications remain open-source.

## The Copyleft Principle

When you modify or build upon copyleft-licensed code and distribute the result, you must:

1. Release the modified source code
2. License the derivative work under the same copyleft license
3. Include the full license text

This creates a "viral" effect — the license propagates to derivative works. The intent is to ensure that improvements to open-source software remain open-source.

## GPL v2 (GNU General Public License, Version 2)

The original widely-adopted copyleft license.

**Key characteristics:**
- Derivative works must be licensed under GPL v2
- Source code must be made available when distributing binaries
- Recommends adding a copyright notice and license reference at the top of each source file

**File headers:** The GPL recommends (but does not require) adding a notice in each source file:
```
Copyright (C) [year] [name]

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License...
```

## GPL v3 (GNU General Public License, Version 3)

An updated version of GPL v2 that addresses additional concerns.

**Additions over v2:**
- Explicit patent grant (similar to Apache 2.0)
- Anti-tivoization provisions (prevents hardware restrictions on running modified software)
- Improved compatibility with other licenses

## The "or later" Mechanism

GPL licenses support a versioning mechanism:
- `GPL-2.0-only` — strictly version 2
- `GPL-2.0-or-later` — version 2 or any later version published by the Free Software Foundation

This allows the copyright holder to let future GPL versions apply automatically, providing flexibility as the license evolves.

## LGPL (GNU Lesser General Public License)

A weaker form of copyleft designed primarily for libraries.

**Key characteristics:**
- Allows proprietary software to **link** to LGPL-licensed libraries without the copyleft obligation spreading to the proprietary code
- Modifications to the LGPL-licensed library itself must still be released under LGPL
- Commonly used for C/C++ libraries; less common in JavaScript (where "linking" is ambiguous)

## AGPL (GNU Affero General Public License)

The strongest form of copyleft, designed for network services.

**Key characteristics:**
- Extends GPL's copyleft to **network use** — if you run modified AGPL software on a server, users who interact with it over a network must be offered the source code
- Closes the "SaaS loophole" where GPL software could be modified and deployed as a service without releasing source code
- Used by projects like MongoDB (historically) and some web applications

## Implications for npm Packages

Choosing a copyleft license for an npm package has significant consequences:

- Any project that imports the package becomes a derivative work subject to the copyleft terms
- This effectively requires all consuming projects to adopt the same license
- For utility libraries intended for broad adoption, permissive licenses are more practical
- Copyleft makes more sense for standalone applications than for libraries

## See Also

- [Permissive Licenses](permissive-licenses.md) — the alternative model allowing proprietary use
- [Permissions, Conditions, and Limitations](permissions-conditions-limitations.md) — detailed reference table
- [Identifiers and Expressions](identifiers-and-expressions.md) — how GPL versioning maps to SPDX identifiers
