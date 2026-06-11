# Real-World Examples

How major open-source projects handle their LICENSE files in practice. These examples show the range of conventions used across the ecosystem.

## Individual Copyright Holder

### Vue.js
- **License**: MIT
- **Copyright line**: `Copyright (c) 2018-present, Yuxi (Evan) You and Vue contributors`
- **Notable**: Uses "present" instead of an end year; includes "and Vue contributors"

## Company / Organization

### React
- **License**: MIT
- **Copyright line**: `Copyright (c) Meta Platforms, Inc. and affiliates.`
- **Notable**: Uses the parent company name (Meta) rather than a product name

### Next.js
- **License**: MIT
- **Copyright line**: `Copyright (c) 2025 Vercel, Inc.`
- **File name**: `license.md` (lowercase, with `.md` extension)

### Angular
- **License**: MIT
- **Copyright line**: `Copyright (c) 2010-2026 Google LLC.`
- **Notable**: Uses a year range spanning the entire project lifetime

### Tailwind CSS
- **License**: MIT
- **Copyright line**: `Copyright (c) Tailwind Labs, Inc.`
- **Notable**: Omits the year entirely

### Go
- **License**: BSD 3-Clause
- **Copyright line**: `Copyright 2009 The Go Authors.`
- **Notable**: Omits the `(c)` symbol; uses a generic group name "The Go Authors"

## Multiple Copyright Holders

### Express
- **License**: MIT
- **Copyright lines**:
  - `Copyright (c) 2009-2014 TJ Holowaychuk <tj@vision-media.ca>`
  - `Copyright (c) 2013-2014 Roman Shtylman <shtylman+expressjs@gmail.com>`
  - `Copyright (c) 2014-2015 Douglas Christopher Wilson <doug@somethingdoug.com>`
- **Notable**: Three separate copyright lines; includes email addresses; each has its own year range

## Foundation / Community

### Webpack
- **License**: MIT
- **Copyright line**: `Copyright JS Foundation and other contributors`
- **Notable**: No year; uses foundation name with "other contributors"

### Lodash
- **License**: MIT
- **Copyright line**: `Copyright OpenJS Foundation and other contributors`
- **Notable**: Similar pattern to Webpack; both under the OpenJS Foundation

## Contributors Link

### Svelte
- **License**: MIT
- **Copyright line**: `Copyright (c) 2016-2025 [Svelte Contributors](link to contributors page)`
- **File name**: `LICENSE.md` (with `.md` extension)
- **Notable**: Copyright line includes a hyperlink to the contributors page

## Key Takeaways

1. **Year format varies widely** — single year, range, "present," or omitted entirely. All are valid.
2. **Name format varies** — individual, company, foundation, or generic group. Choose what represents your project.
3. **"and contributors" is common** when many people have contributed.
4. **No project includes the repository URL** in the copyright line.
5. **File naming varies** — `LICENSE`, `LICENSE.md`, `license.md` are all used by major projects.
6. **The license body is never modified** — only the copyright line differs between projects.

## See Also

- [Copyright Line Formats](copyright-line-formats.md) — the structural patterns behind these examples
- [Permissive Licenses](permissive-licenses.md) — details on MIT, Apache 2.0, BSD, ISC
- [File Naming and Location](file-naming-and-location.md) — conventions for the LICENSE filename
