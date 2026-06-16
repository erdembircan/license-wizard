# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0/).

## [Unreleased]

### Changed

- **`--strict` now errors without `--verify`** — previously it sat inert when supplied to a
  non-verify run; now, on a flag-driven generation run, passing `--strict` without `--verify`
  fails with a clear message, matching how the other modifier flags report a missing host flag.
- **Flag dependencies resolved in one place** — each flag that needs another (the `--license`
  requirement of `--set`/`--headers`/`--get-tokens`/`--save-*`, `--headers-comment` needing
  `--headers`, `--strict` needing `--verify`) now declares that dependency on its own flag
  definition, and a single resolver enforces it before any mode runs, instead of ad-hoc checks
  scattered across the modes. Behavior is unchanged except for the `--strict` case above, plus
  `--headers-comment` now also reports the missing `--headers` when combined with `--get-tokens`.

## [1.0.2] - 2026-06-16

### Fixed

- **Manifest indentation preserved on write** — writing the chosen license back into
  `package.json` or `composer.json` no longer reformats the whole file. The writer now
  detects each manifest's existing indentation (tabs or spaces, verbatim) and
  trailing-newline style and reproduces it, so a single-field edit produces a
  single-line diff. Minified manifests stay minified; files created from scratch use
  two-space indentation with a trailing newline.
- **CRLF line endings preserved on write** — manifests that use Windows-style `\r\n`
  line endings now keep them. The writer detects the document's dominant internal line
  separator and reproduces it on write, so a single-field edit on a CRLF repo no longer
  rewrites every line. Escaped newlines inside string values are left untouched.

### Changed

- **Internal: unified JSON manifest round-trip** — the license-owning and
  license-wizard-owning manifest writers now share a single `JsonManifestDocument`
  value object for the read → mutate → style-preserving-write round-trip, collapsing
  duplicated parse/guard logic. Manifest config stores were also split into dedicated
  `NpmConfigStore`/`ComposerConfigStore` classes. No user-facing behavior change.

## [1.0.1] - 2026-06-11

### Changed

- **Interactive header tagline** — the startup header now shows a short, purpose-built
  tagline instead of the long `package.json` description. The npm description stays
  verbose for search visibility, while the header reads cleanly on narrow terminals.

## [1.0.0] - 2026-06-10

Initial public release.

### Added

- **Interactive wizard** — guided flow that searches the full SPDX License List
  with type-ahead autocomplete, writes a canonical `LICENSE` file, and records the
  chosen SPDX identifier back into every manifest it finds.
- **Full SPDX catalog** — pick from the complete, up-to-date SPDX License List;
  license text comes straight from the official SPDX data, with no hand-copied
  variations.
- **Copyright customization** — for licenses with fillable fields (copyright
  holder, year, and similar), keep the official text verbatim or fill in each
  field, rendered from the SPDX license template.
- **Manifest awareness** — reads the license already declared in `package.json`
  or `composer.json` to pre-select a default, and writes the final choice back to
  every manifest it finds.
- **Source-file headers** — optionally stamp a per-file SPDX license header across
  `.js`/`.ts`/`.php` sources in `short` or `full` form, remove them with
  `--remove-headers`, and override skips with `--force-header`. Skipped files are
  surfaced in the report.
- **Verify mode** — `--verify` checks that the `LICENSE` file, manifests, and
  headers still match the chosen license; `--strict` fails the build in CI when
  they drift.
- **Non-interactive generation** — drive the same flow from scripts, CI, and AI
  agents with `--license`, `--set`, and `--get-tokens`.
- **Saved configuration** — persist a selection with `--save-rc`, `--save-npm`, or
  `--save-composer`, stored in `.licensewizardrc.json` or a manifest field, and
  replay it with `--apply-config`.
- **Dry run** — `--dry-run` previews every change without writing to disk.
- **Unknown-id suggestions** — when given an unrecognized SPDX identifier, suggest
  the closest matching licenses.
- **Readable output** — colorized output on a TTY, plain text otherwise, with
  license text hard-wrapped to 80 columns.
- **`--help`** — print the complete flag list from the CLI.
- **`--version`** — print the version number from the CLI.

[1.0.2]: https://github.com/erdembircan/license-wizard/releases/tag/v1.0.2
[1.0.1]: https://github.com/erdembircan/license-wizard/releases/tag/v1.0.1
[1.0.0]: https://github.com/erdembircan/license-wizard/releases/tag/v1.0.0
