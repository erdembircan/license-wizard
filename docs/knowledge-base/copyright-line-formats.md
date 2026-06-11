# Copyright Line Formats

The copyright line is the only part of a LICENSE file that the project author customizes. It identifies who holds the copyright and (optionally) when the work was first published. The rest of the license text is standardized legal language and must not be altered.

## Basic Structure

```
Copyright (c) [year] [name]
```

All three elements — the word "Copyright," the year, and the name — are conventions. The only legally essential part is identifying the copyright holder.

## Year Formats

| Format | Example | Used By |
|--------|---------|---------|
| Single year | `Copyright (c) 2025 Vercel, Inc.` | Next.js |
| Year range | `Copyright (c) 2010-2026 Google LLC.` | Angular |
| Year with "present" | `Copyright (c) 2018-present, Yuxi (Evan) You` | Vue.js |
| No year | `Copyright (c) Tailwind Labs, Inc.` | Tailwind CSS |

### Do you need a year?

Technically, no. Under the Berne Convention, copyright exists from the moment of creation regardless of whether a year is stated. However, including a year is a strong convention:

- **Initial year**: The year the project was first published
- **Range**: From first publication to last significant update (e.g., `2020-2026`)
- **"present"**: Avoids the need to update annually (e.g., `2020-present`)
- **Omitted**: Some projects skip it entirely, which is legally valid

There is no legal requirement to update the year annually. A range like `2018-2026` signals active maintenance but is not necessary for copyright protection.

## Name Formats

| Format | Example | Used By |
|--------|---------|---------|
| Individual | `Yuxi (Evan) You` | Vue.js |
| Individual + contributors | `Yuxi (Evan) You and Vue contributors` | Vue.js |
| Company | `Meta Platforms, Inc. and affiliates.` | React |
| Company simple | `Vercel, Inc.` | Next.js |
| Foundation | `OpenJS Foundation and other contributors` | Lodash |
| Generic group | `The Go Authors` | Go |
| Multiple individuals | Separate `Copyright (c)` lines per person | Express |

### "and contributors"

Adding "and contributors" is a common pattern when a project has many authors. It acknowledges collective authorship without listing every contributor.

## The `(c)` Symbol

The `(c)` symbol (or `©`) is **optional**. Both of these are equally valid:

```
Copyright (c) 2026 Jane Doe
Copyright 2026 Jane Doe
```

The word "Copyright" alone is legally sufficient. The `(c)` is a convention, not a requirement.

## Email Addresses

Including email addresses is optional. Express is a notable example that includes them:

```
Copyright (c) 2009-2014 TJ Holowaychuk <tj@vision-media.ca>
Copyright (c) 2013-2014 Roman Shtylman <shtylman+expressjs@gmail.com>
Copyright (c) 2014-2015 Douglas Christopher Wilson <doug@somethingdoug.com>
```

Most projects do not include email addresses in the copyright line.

## License-Specific Placement

| License | Where the copyright line goes |
|---------|------------------------------|
| MIT | At the top, before the permission grant |
| Apache 2.0 | In the appendix section at the bottom |
| BSD 2-Clause / 3-Clause | At the top, before the conditions |
| ISC | At the top, before the permission grant |
| GPL | In a separate notice; the LICENSE file itself is the unmodified GPL text |

## See Also

- [Real-World Examples](real-world-examples.md) — how major projects format their copyright lines
- [Copyright Basics](copyright-basics.md) — the legal foundation behind copyright notices
- [Common Mistakes](common-mistakes.md) — placeholder errors and other formatting issues
