# Common Mistakes

## 1. Leaving Placeholder Text

License templates include placeholders like `[year]`, `[fullname]`, or `<copyright holders>` that must be replaced with actual values. A LICENSE file that still contains `[year]` or `[fullname]` is incomplete and signals that the author did not properly set up their license.

**Wrong:**
```
Copyright (c) [year] [fullname]
```

**Correct:**
```
Copyright (c) 2026 Jane Doe
```

## 2. Modifying the License Body

Only the copyright line (and, for some licenses, the appendix) should be customized. The rest of the license text is standardized legal language and must not be altered. Modifying the body creates a non-standard license that may not carry the same legal protections.

The sections that should remain untouched include permission grants, conditions, warranty disclaimers, and liability limitations.

## 3. Missing LICENSE File Entirely

The most common mistake. A `package.json` with `"license": "MIT"` but no LICENSE file means the code is technically "all rights reserved." The manifest field is metadata, not a legal instrument.

## 4. Mismatched License Declarations

When the `license` field in `package.json` says `"MIT"` but the LICENSE file contains Apache 2.0 text (or vice versa), it creates legal confusion. Consumers of the package cannot determine which license actually applies.

This can happen when:
- A license migration was started but not completed
- The LICENSE file was copied from another project without updating the manifest
- A template was used that included a different license

## 5. Using a License Without Understanding It

Copyleft licenses (GPL, LGPL, AGPL) require derivative works to be distributed under the same license. This has significant implications for npm packages, where downstream consumers import the code into their own projects. Choosing GPL for a utility library, for example, means all consuming projects must also be GPL-licensed.

## 6. Forgetting Dependency Licenses

When bundling third-party code (e.g., vendored libraries), their licenses may require attribution. Some licenses (notably Apache 2.0) require maintaining a NOTICE file with attribution for bundled dependencies.

This is separate from the project's own license and is often overlooked in projects that vendor dependencies or bundle code from multiple sources.

## See Also

- [Copyright Line Formats](copyright-line-formats.md) — the correct format to avoid placeholder errors
- [File Naming and Location](file-naming-and-location.md) — where the LICENSE file should be
- [Real-World Examples](real-world-examples.md) — how major projects handle their licenses correctly
- [Why a License File Is Required](why-a-license-file-is-required.md) — the legal necessity of the LICENSE file
