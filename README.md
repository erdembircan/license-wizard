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
- **Source-file headers** — optionally stamps a per-file license header across your `.js`/`.ts`/`.php` sources, and keeps them in sync.
- **Stays honest** — `--verify` checks that your `LICENSE`, manifests, and headers still match the license you chose, and can fail the build in CI when they drift.
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

## Usage

Run the command from the root of the project you want to license, and you'll be guided through a short interactive flow:

1. **Choose a license** — start typing to search the SPDX catalog (e.g. `MIT`, `Apache-2.0`, `GPL-3.0-or-later`) and select one. If your project already declares a license, it's offered as the default.
2. **Standard or customized** — if the license has fillable copyright fields, keep the official text verbatim or fill in each field (such as the copyright holder and year).
3. **Save your settings** — choose whether to remember your selection for next time.

When you're done, License Wizard writes the `LICENSE` file and records the selected SPDX identifier in every manifest it finds (`package.json`, `composer.json`).

Prefer one command? Generate a license non-interactively — handy for scripts, CI, and AI agents:

```bash
npx license-wizard --license MIT
```

## Documentation

Full documentation lives on the docs site:

**→ [License Wizard documentation](https://erdembircan.github.io/license-wizard/docs/)**

It covers everything beyond the quick start:

- **Interactive wizard** and **one-shot generation** (`--license`, `--set`, `--get-tokens`)
- **Source-file headers** — `short` vs `full`, and removing them
- **Verify & CI** — `--verify`, `--strict`, and the drop-in CI step
- **Apply saved config** — replaying a saved license with `--apply-config`
- **Configuration files** — `.licensewizardrc.json` and manifest fields
- **Scripting & agents** — exit codes and non-interactive contracts
- **Flags reference** — the complete flag list

Reading this as an AI agent or from a script? The same documentation is published as plain Markdown: **[`documentation.md`](https://erdembircan.github.io/license-wizard/documentation.md)**.

Run `npx license-wizard --help` to print the flag list from the CLI.

## License

[Apache-2.0](LICENSE) © Erdem Bircan
