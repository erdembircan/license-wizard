<div align="center">

<img src="assets/logo.png" alt="License Wizard" width="480" />

<p><em>An interactive CLI for picking an open-source license and generating a correct <code>LICENSE</code> file — in seconds.</em></p>

[![CI](https://github.com/erdembircan/license-wizard/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/erdembircan/license-wizard/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/license-wizard.svg)](https://www.npmjs.com/package/license-wizard)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.13-brightgreen.svg)](https://nodejs.org)

</div>

---

## Why License Wizard?

Most projects declare a license in `package.json` or `composer.json`, yet the actual `LICENSE` file at the repository root is a separate, manual step — track down the canonical text, fill in copyright placeholders, and keep the declared license and the file in sync. It's easy to forget, leaving repositories with a declared license but no real `LICENSE` file, or text that subtly differs from the official source.

License Wizard closes that gap. It walks you through choosing a license, pulls the canonical SPDX text, fills in your copyright details, writes a proper `LICENSE` file, and records the choice back into your manifests so everything stays consistent. The same predictable flow that guides a human also drives cleanly from scripts, CI, and AI agents.

## Features

- **Full SPDX catalog** — search and pick from the complete, up-to-date SPDX License List with type-ahead autocomplete.
- **Canonical text, every time** — license text comes straight from the official SPDX data, so there are no hand-copied variations.
- **Copyright customization** — for licenses with fillable fields (copyright holder, year, and similar), use the official text as-is or fill in each field.
- **Manifest-aware** — reads the license already declared in your `package.json` or `composer.json` to pre-select a default, and writes your final choice back to every manifest it finds.
- **Source-file headers** — optionally stamps a per-file license header (the short SPDX tag or the full standard notice) across your `.js`/`.ts`/`.php` sources, respecting `.gitignore` and skipping dependencies, with a marker so it can verify and re-apply them.
- **Remembers your choice** — optionally saves a small config file so re-runs start from where you left off.
- **Zero config to start** — run it with `npx`, answer a few prompts, done.

## Requirements

- **Node.js** `>= 22.13.0`
- Network access (license data is fetched from the official SPDX list)

## Quick Start

Run it directly — no install required:

```bash
npx license-wizard
```

Or install it globally:

```bash
npm install -g license-wizard
# then, in any project directory:
license-wizard
```

<details>
<summary>Other package managers</summary>

```bash
pnpm dlx license-wizard
# or
yarn dlx license-wizard
```

</details>

## Usage

Run the command from the root of the project you want to license:

```bash
npx license-wizard
```

You'll be guided through a short interactive flow:

1. **Choose a license** — start typing to search the SPDX catalog (e.g. `MIT`, `Apache-2.0`, `GPL-3.0-or-later`) and select one. If your project already declares a license, it's offered as the default.
2. **Standard or customized** — if the license has fillable copyright fields, keep the official text verbatim or enter each field (such as the copyright holder and year).
3. **Save your settings** — choose whether to remember your selection for next time.

When you're done, License Wizard writes the license to a `LICENSE` file in the current directory and records the selected SPDX identifier in every project manifest it finds (`package.json`, `composer.json`).

### Non-interactive mode (scripting & agents)

Passing any of `--license`, `--set`, or `--get-tokens` switches License Wizard out of the prompt flow and runs as a single command — no prompts, suitable for scripts, CI, and AI agents.

Generate a license in one shot:

```bash
npx license-wizard --license MIT
```

This writes the official MIT text to `LICENSE` and records `MIT` in every project manifest present.

**Customizing copyright fields.** Some licenses have fillable fields (such as the year and copyright holder). List the fields a license accepts with `--get-tokens`, then supply each one with a repeatable `--set "field=value"`:

```bash
npx license-wizard --license MIT --get-tokens
npx license-wizard --license MIT --set "year=2026" --set "copyright holders=Erdem Bircan"
```

A field may be named by its label (e.g. `year`, case-insensitive) or its bracket token (e.g. `<year>`). Omit `--set` to write the official text unchanged. If you start customizing but leave out a required field, License Wizard writes nothing — it lists the missing fields and exits non-zero, so you and any calling agent know exactly what to provide.

**Unrecognized identifiers.** SPDX identifiers are exact (`apache-2-0` is not `Apache-2.0`). On a typo, License Wizard reports that no license matches, suggests the closest identifiers, and exits non-zero rather than failing with a stack trace.

**Remembering your choice.** In non-interactive mode, persistence is opt-in through one `--save-*` flag — `--save-rc` (writes `.licensewizardrc.json`), `--save-npm`, or `--save-composer` (the `"license-wizard"` field of the respective manifest, which must already exist):

```bash
npx license-wizard --license MIT --save-rc
```

By default nothing is persisted. Saving writes to exactly one location and clears the configuration from the others; pass at most one `--save-*` flag at a time.

**Previewing without writing.** Add `--dry-run` to any run to print the license that *would* be generated and a summary of the writes that were skipped — no `LICENSE`, config, or manifest changes are made. It works in the interactive wizard too. It is not combined with `--verify`, which is its own mode.

### Source-file headers

Beyond the `LICENSE` file, License Wizard can stamp a per-file license header at the top of your source files — the small notice many licenses ask you to add to each file. The interactive wizard offers this after the license is chosen; non-interactively, pass `--headers` with a style:

```bash
# the short, machine-readable SPDX tag (works for every license)
npx license-wizard --license MIT --headers short --save-npm

# the full standard header notice (only for licenses that publish one)
npx license-wizard --license Apache-2.0 --set "name of copyright owner=Erdem Bircan" --set "yyyy=2026" --headers full --save-npm
```

- **`short`** writes the canonical SPDX tag lines (`SPDX-License-Identifier:`, plus `SPDX-FileCopyrightText:` when you've filled in copyright fields). Available for **every** license.
- **`full`** writes the license's complete `standardLicenseHeader` notice, with your copyright fields substituted. Available only for licenses that publish a standard header (Apache-2.0, the GPL family, MPL-2.0, …). For a license without one (MIT, BSD, ISC, …), only `short` applies. The header reuses whatever copyright values you chose for the `LICENSE` text — it is never asked separately.

**What gets a header.** Only source files the npm and Composer ecosystems use: `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.cts`, `.mts`, and `.php`. JSON, stylesheets, markdown, and generated output are left alone. A discovery pass gathers the file list first — pruning `node_modules/`, `vendor/`, `.git/`, and everything your project's `.gitignore` excludes (add more with repeatable `--headers-ignore <glob>`) — so the write pass can show a progress bar over a known total. A `#!` shebang stays on top, and the header is placed inside PHP's `<?php` tag.

**Managed, idempotent, verifiable.** Each header carries a hidden marker identifying it as written by License Wizard and fingerprinting its content. That marker is what lets the tool *own* the block: re-running over an unchanged project writes nothing, switching licenses rewrites the existing header in place (rather than stacking a second one), and `--verify` checks the header surface too — without ever touching a hand-written notice that lacks the marker.

### Verifying an existing LICENSE

Once a configuration is saved, `--verify` checks that the project still matches it across two surfaces: the **`LICENSE` file** (re-rendered from the configuration and compared by content hash) and the **`"license"` field of every manifest** (compared against the configured SPDX identifier). It is a standalone mode — every other selection flag is ignored, and the configuration is the single source of truth (the `.licensewizardrc.json` dot-file first, then the manifests). Both a `LICENSE` file and a saved configuration must exist, or it reports the problem and exits non-zero.

```bash
npx license-wizard --verify
```

When the saved configuration opted into source-file headers, `--verify` checks that surface too: it re-scans your source files and confirms each still carries the expected, up-to-date header — reporting any file that is missing one or whose header has drifted.

By default, verification **self-heals**: anything out of sync (an edited copyright line, a stale `LICENSE`, a hand-changed manifest `license`, a source file missing or carrying a drifted header) is reconciled from the saved configuration in place. When nothing has drifted, it confirms and exits zero.

**Strict mode (CI).** Add `--strict` to make any mismatch an error instead: License Wizard leaves everything untouched, lists each drifted surface, and exits non-zero so the pipeline stops. A passing run exits zero, making it a drop-in check step:

```yaml
- name: Check the license is in sync
  run: npx license-wizard --verify --strict
```

### Available flags

| Flag | Description |
| --- | --- |
| `--help` | Show the help message and exit. |
| `--verify` | Verify the `LICENSE` file and every manifest's `license` field — and the source-file headers, when configured — match the saved configuration, reconciling any drift. Standalone mode — ignores every other selection flag. |
| `--strict` | With `--verify`, fail (exit non-zero) on any drift instead of reconciling it — for CI. |
| `--license <spdx-id>` | Select a license by its SPDX identifier and run non-interactively (no prompts). |
| `--set <field=value>...` | Set a copyright field for the chosen license (repeatable). Implies non-interactive mode. |
| `--save-rc` | Save the resolved config (license + fields) to `.licensewizardrc.json`. Implies non-interactive mode. |
| `--save-npm` | Save the resolved config to the `"license-wizard"` field of `package.json` (must exist). Implies non-interactive mode. |
| `--save-composer` | Save the resolved config to the `"license-wizard"` field of `composer.json` (must exist). Implies non-interactive mode. |
| `--get-tokens` | List the copyright fields the selected license accepts (requires `--license`) and exit without generating. |
| `--headers <short\|full>` | Also write SPDX license headers into source files — `short` (SPDX tag lines) or `full` (the standard header notice). Implies non-interactive mode. |
| `--headers-ignore <glob>...` | Extra gitignore-style pattern to skip when writing headers, on top of the defaults and `.gitignore` (repeatable). |
| `--dry-run` | Preview the license (and, with `--headers`, a sample block and the files it would touch) and skip every write. |

Run `npx license-wizard --help` to print the same list from the CLI.

## Configuration

License Wizard can remember your license choice so subsequent runs start from a known default. Configuration is read from one of two sources, in order of precedence:

1. **`.licensewizardrc.json`** in the project root:

   ```jsonc
   {
     // contents of config
   }
   ```

2. The **`"license-wizard"`** field in `package.json` (fallback when no rc file is present):

   ```jsonc
   {
     "name": "my-project",
     "license-wizard": {
       // contents of config
     }
   }
   ```

The saved config holds the license id, any copyright field values, and — when you opted into source-file headers — the header style, which is what tells `--verify` to check that surface:

```jsonc
{
  "licenseId": "Apache-2.0",
  "tokens": { "[yyyy]": "2026", "[name of copyright owner]": "Erdem Bircan" },
  "headers": { "style": "full" }
}
```

When you opt in to saving during a run, License Wizard writes to `.licensewizardrc.json`.

## License

[Apache-2.0](LICENSE) © Erdem Bircan
