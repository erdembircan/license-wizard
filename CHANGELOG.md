# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0/).

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

[1.0.1]: https://github.com/erdembircan/license-wizard/releases/tag/v1.0.1
[1.0.0]: https://github.com/erdembircan/license-wizard/releases/tag/v1.0.0
