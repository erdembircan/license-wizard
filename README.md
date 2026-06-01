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

Most projects declare a license in `package.json` or `composer.json`, yet the actual `LICENSE` file at the repository root is a separate, manual step. You have to track down the canonical text, fill in copyright placeholders, and keep the declared license and the file in sync. It's easy to forget — leaving repositories with a declared license but no real `LICENSE` file, or text that subtly differs from the official source.

License Wizard closes that gap. It walks you through choosing a license, pulls the canonical SPDX text, fills in your copyright details, and writes a proper `LICENSE` file — then records the choice back into your project's manifests so everything stays consistent.

## Features

- **Full SPDX catalog** — search and pick from the complete, up-to-date SPDX License List with type-ahead autocomplete.
- **Canonical text, every time** — license text comes straight from the official SPDX data, so there are no hand-copied variations.
- **Copyright customization** — for licenses with fillable fields (copyright holder, year, and similar), choose **Standard** to use the official text as-is, or **Customize** to fill in each field.
- **Manifest-aware** — reads the license already declared in your `package.json` or `composer.json` to pre-select a sensible default, and writes your final choice back to every manifest it finds.
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
2. **Standard or customized** — if the chosen license has fillable copyright fields, pick **Standard** to keep the official text verbatim, or **Customize** to enter each field (such as the copyright holder and year).
3. **Save your settings** — choose whether to remember your selection for next time.

When you're done, License Wizard:

- writes the license to a `LICENSE` file in the current directory, and
- records the selected SPDX identifier in every project manifest it finds (`package.json`, `composer.json`).

### Non-interactive mode (scripting & agents)

Passing any of `--license`, `--set`, or `--get-tokens` switches License Wizard out of the interactive prompt flow and runs it as a single command — no prompts, suitable for scripts, CI, and AI agents.

Generate a license in one shot with `--license`:

```bash
npx license-wizard --license MIT
```

This writes the official MIT text to `LICENSE` and records `MIT` in every project manifest present — no questions asked.

#### Customizing copyright fields

Some licenses have fillable copyright fields (such as the year and copyright holder). To find out which fields a license accepts, ask for them with `--get-tokens`:

```bash
$ npx license-wizard --license MIT --get-tokens
MIT accepts the following copyright field(s):

  year
  copyright holders

Generate a customized license by supplying every field, e.g.:

  license-wizard --license MIT --set "year=<value>" --set "copyright holders=<value>"

Omit --set to write the official text unchanged.
```

Then supply each field with a repeatable `--set "field=value"` flag:

```bash
npx license-wizard --license MIT --set "year=2026" --set "copyright holders=Erdem Bircan"
```

If you start customizing but leave out a required field, License Wizard does **not** generate a partial file — it tells you exactly which fields are still needed and exits with a non-zero status, so both you and any calling agent know what to provide:

```bash
$ npx license-wizard --license MIT --set "year=2026"
Cannot generate a customized MIT license: missing required field(s):

  copyright holders

Supply every field (e.g. --set "copyright holders=<value>"), or run with --get-tokens to list them all.
```

A field name may be given either as its label (e.g. `year`, case-insensitive) or as its bracket token (e.g. `<year>`). Omit `--set` entirely to write the official text unchanged.

### Available flags

| Flag | Description |
| --- | --- |
| `--help` | Show this help message and exit. |
| `--verify` | Verify the LICENSE file matches the saved configuration. |
| `--license <spdx-id>` | Select a license by its SPDX identifier and run non-interactively (no prompts). |
| `--set <field=value>...` | Set a copyright field for the chosen license (repeatable). Implies non-interactive mode. |
| `--get-tokens` | List the copyright fields the selected license accepts (requires `--license`) and exit without generating. |

Run `npx license-wizard --help` to print the same list from the CLI.

## Configuration

License Wizard can remember your license choice so subsequent runs start from a known default. Configuration is read from one of two sources, in order of precedence:

1. **`.licensewizardrc.json`** in the project root:

   ```json
   {
     "licenseId": "MIT"
   }
   ```

2. The **`"license-wizard"`** field in `package.json` (used as a fallback when no rc file is present):

   ```json
   {
     "name": "my-project",
     "license-wizard": {
       "licenseId": "MIT"
     }
   }
   ```

When you opt in to saving during a run, License Wizard writes to `.licensewizardrc.json`.

## License

[Apache-2.0](LICENSE) © Erdem Bircan
