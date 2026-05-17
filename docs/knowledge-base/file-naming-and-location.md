# File Naming and Location

## Location

The LICENSE file belongs in the **root directory** of the project. This is a universal convention across all ecosystems and platforms. GitHub, npm, Packagist, and other platforms look for the file at the repository root.

## Accepted File Names

There is no strict standard, but the following names are recognized by all major platforms:

| Filename | Usage |
|----------|-------|
| `LICENSE` | Most common. Used by React, Angular, Express, Webpack, Tailwind CSS, Go, Kubernetes |
| `LICENSE.md` | Markdown variant. Used by Svelte |
| `license.md` | Lowercase variant. Used by Next.js |
| `LICENSE.txt` | Text extension. Used by some older projects |
| `LICENCE` | British English spelling. Rare but recognized |
| `COPYING` | Traditional in GNU/GPL projects |

## Recommendation

Use `LICENSE` (no extension, uppercase). It is the most widely recognized name and is automatically detected by GitHub, npm, and other platforms regardless of extension.

## Platform Detection

- **GitHub** detects the license file and displays the license type in the repository header. It recognizes `LICENSE`, `LICENSE.md`, `LICENSE.txt`, and `COPYING`.
- **npm** shows the license on the package page. It reads both the `license` field in `package.json` and the LICENSE file.
- **Packagist** (PHP/Composer) displays license information from `composer.json` and recognizes the LICENSE file.

## Multiple License Files

Some projects have multiple license-related files:
- A `LICENSE` file with the primary license
- A `NOTICE` file with attribution for dependencies (required by Apache 2.0)
- A `COPYING` file (traditional GNU convention, sometimes alongside LICENSE)

## See Also

- [Copyright Line Formats](copyright-line-formats.md) — what goes inside the LICENSE file
- [Common Mistakes](common-mistakes.md) — errors in file naming and placement
- [Real-World Examples](real-world-examples.md) — naming conventions used by major projects
