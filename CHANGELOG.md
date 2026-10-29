# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0/).

## [Unreleased]

### Changed

- **Saved tokens the license doesn't recognize now stop `--verify`, `--apply-config` and
  `--force-header`** — when the saved config's tokens include ones that aren't copyright
  fields of its license (left over from an earlier license, or renamed by SPDX, as SPDX
  License List 3.29.0 did for ISC), these commands now name them, list the fields the
  license accepts, and exit with code 1 without writing anything. This is new for all
  three:
  - `--verify` used to regenerate `LICENSE` with the license's own fields left unfilled
    (for ISC, `Copyright <YEAR> <OWNER>`) and exit 0, and `--verify --strict` used to pass
    whenever `LICENSE` and the manifests matched, so leftover tokens never failed CI on
    their own. Both now stop before checking anything, source-file headers included.
  - `--apply-config` used to regenerate `LICENSE`, and a full header, the same way, with
    the license's own fields left unfilled. It now stops before generating, including
    under `--dry-run`.
  - `--force-header` used to write the header from those tokens. It now stops before
    writing.

  Generation runs already rejected such fields passed with `--set`; this applies the same
  rule to the tokens saved in the config. Because these runs now fail where they used to
  pass, the release that ships this is not a patch. (#179)

- **`--verify` now explains a drifted `LICENSE`** — a `LICENSE` that no longer matches
  the saved configuration used to be reported only as `LICENSE does not match`. Now:
  - `--verify --strict` shows the first difference: the line and column, the line found
    on disk, the expected line, and a caret under the first differing character, with
    control characters and trailing spaces made visible.
  - When the saved tokens can't be filled into the license's plain text
    (GPL-2.0-or-later, LGPL-2.1-or-later, ISC and Zlib among others), License Wizard
    builds `LICENSE` from SPDX's matching template, which SPDX revises between releases.
    SPDX License List 3.29.0 changed it for GPL-2.0-or-later, LGPL-2.1-or-later and ISC,
    failing strict verification in projects that had not changed. When such a `LICENSE`
    drifts, both `--verify` and `--verify --strict` now say so and, unless the config
    writes source-file headers (which use the tokens too), point out that removing the
    saved `tokens` builds `LICENSE` from the plain text instead.

  This part changes output only: exit codes and file writes are unchanged, and runs where
  `LICENSE` itself matched print exactly as before. (#179)

## [1.2.0] - 2026-08-18

### Changed

- **Interactive runs now reject every flag except `--dry-run`** — the guided wizard
  is prompt-driven, so a flag riding along with an otherwise-interactive invocation
  now fails with exit code 1 instead of being silently applied or ignored. On an
  interactive run specifically:
  - `--headers-comment` now errors — it previously styled the headers the prompt
    opts into. Generation runs already errored here (since #165); only interactive
    runs changed.
  - `--headers-ignore` now errors, including the interactive header-removal path —
    it previously scoped which files were headed.
  - `--strict` now errors — it previously sat inert on an interactive run.
    Generation runs already errored here (since #165); only interactive runs changed.

  `--dry-run` alone still previews an interactive run, unchanged. Because this changes
  previously-working invocations, it ships as a minor release, not a patch. (#172)

## [1.1.0] - 2026-06-29

### Added

- **`--headers-comment <block|docblock>`** — choose the comment style for written
  source-file headers: `block` (`/* … */`, the default) or `docblock` (`/** … */`),
  the form PHPDoc and the WordPress Coding Standards expect. It applies only when a
  header is being written, so it requires `--headers`. (#160)

### Changed

- **`--strict` now errors without `--verify`** — previously it sat inert when supplied
  to a non-verify run; now passing `--strict` on its own fails with a clear message,
  matching how the other modifier flags report a missing host flag. (#165)
- **`--help` lists a flag's dependencies** — each flag that requires another now shows
  it in the help listing (e.g. `(requires --license)`), so the requirement the CLI
  enforces is visible up front. (#165)
- **Internal: flag dependencies resolved in one place** — each flag that needs another
  (the `--license` requirement of `--set`/`--headers`/`--get-tokens`/`--save-*`,
  `--headers-comment` needing `--headers`, `--strict` needing `--verify`) declares that
  dependency on its own definition, and a single resolver enforces it before any mode
  runs, instead of ad-hoc checks scattered across the modes. (#164, #165)

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

[1.2.0]: https://github.com/erdembircan/license-wizard/releases/tag/v1.2.0
[1.1.0]: https://github.com/erdembircan/license-wizard/releases/tag/v1.1.0
[1.0.2]: https://github.com/erdembircan/license-wizard/releases/tag/v1.0.2
[1.0.1]: https://github.com/erdembircan/license-wizard/releases/tag/v1.0.1
[1.0.0]: https://github.com/erdembircan/license-wizard/releases/tag/v1.0.0
