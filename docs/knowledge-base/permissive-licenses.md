# Permissive Licenses

Permissive licenses grant broad freedoms with minimal restrictions. Code under a permissive license can be used in proprietary software, modified without disclosure, and redistributed with few conditions. They are the most common license type in the JavaScript and npm ecosystems.

## MIT License

The most popular license for JavaScript packages. It is short, simple, and easy to understand.

**Key characteristics:**
- Allows commercial use, modification, distribution, and private use
- Only condition: include the copyright notice and license text in copies
- No warranty or liability

**What to customize:** Only the copyright line at the top. The rest of the text is standardized and must not be modified.

**Structure:**
```
MIT License

Copyright (c) [year] [fullname]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

## Apache License 2.0

Used by large corporate-backed projects (e.g., Android, Kubernetes). Longer and more detailed than MIT.

**Key characteristics:**
- Includes an explicit **patent grant** — contributors grant users a license to any patents that cover their contributions
- Requires preserving copyright notice, license text, and a statement of changes
- Requires maintaining a **NOTICE file** if one exists, with attribution for bundled components
- No warranty or liability

**Structure:**
- Full Apache 2.0 legal text (do not modify)
- Appendix at the bottom with your copyright notice

**Distinctive feature:** The patent grant. This protects users from patent claims by contributors, which MIT and BSD do not address.

## BSD 2-Clause License ("Simplified")

Similar in spirit to MIT. Two conditions: retain the copyright notice in source distributions, and retain it in binary distributions.

**Key characteristics:**
- Very short and permissive
- No patent grant
- No endorsement clause

## BSD 3-Clause License ("New" or "Revised")

Same as BSD 2-Clause plus an additional clause: the name of the copyright holder may not be used to endorse or promote products derived from the software without permission.

**Key characteristics:**
- Adds the "no endorsement" clause on top of BSD 2-Clause
- Used by projects that want to prevent their name from being associated with derivative products

## ISC License

Functionally equivalent to MIT but shorter. Historically used by npm itself and many npm packages.

**Key characteristics:**
- Essentially MIT with simplified wording
- Same permissions and conditions
- Preferred by some for its brevity

## Comparison

| License | Length | Patent Grant | Endorsement Clause | NOTICE File |
|---------|--------|-------------|-------------------|-------------|
| MIT | Short | No | No | No |
| Apache 2.0 | Long | Yes | No | Yes (if present) |
| BSD 2-Clause | Short | No | No | No |
| BSD 3-Clause | Short | No | Yes | No |
| ISC | Very short | No | No | No |

## See Also

- [Copyleft Licenses](copyleft-licenses.md) — the alternative model requiring derivative works to remain open-source
- [Permissions, Conditions, and Limitations](permissions-conditions-limitations.md) — detailed reference table
- [Copyright Line Formats](copyright-line-formats.md) — how to write the copyright notice for these licenses
