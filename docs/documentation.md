# License Wizard documentation

License Wizard picks an open-source license, pulls its canonical SPDX text, fills in your copyright details, writes a proper `LICENSE` file, and records the choice back into your project manifests so the declared license and the file on disk always agree.

This documentation is the single source of truth for the project. It is published as styled pages and as a [plain-Markdown file](/license-wizard/documentation.md) you can fetch directly.

## Getting started

Run it directly — no install required:

```bash
npx license-wizard
```

Or install it globally and run it in any project directory:

```bash
npm install -g license-wizard
```

### What a run produces

- A `LICENSE` file in the current directory, containing the official text of the license you chose.
- The selected SPDX identifier written into the `license` field of every manifest it finds (`package.json`, `composer.json`).
- Optionally, a small saved configuration so future runs start from your last choice, and per-file license headers across your source.

### Requirements

- `Node.js >= 22.13.0`
- Network access — license text is fetched from the official SPDX list, so every file you generate matches the canonical source exactly.

## Interactive wizard

Run the command from the root of the project you want to license and you'll be guided through a short flow:

```bash
npx license-wizard
```

- **Choose a license.** Start typing to search the full SPDX catalog (e.g. `MIT`, `Apache-2.0`, `GPL-3.0-or-later`) and select one. If your project already declares a license, it's offered as the default.
- **Standard or customized.** If the license has fillable copyright fields, keep the official text verbatim or fill in each field — typically the copyright holder and year.
- **Save your settings.** Choose whether to remember your selection for next time.

When you're done, License Wizard writes the `LICENSE` file and records the selected identifier in every manifest it finds. If you opted in, it also offers to stamp [source-file headers](/license-wizard/docs/source-file-headers/).

> Prefer to skip the prompts? Every step has a flag equivalent — see [one-shot generation](/license-wizard/docs/one-shot-generation/) and [scripting & agents](/license-wizard/docs/scripting-agents/).

## One-shot generation

Passing `--license`, `--set`, or `--get-tokens` runs License Wizard as a single command — no prompts — so it fits cleanly into scripts and CI. Generate a license in one shot:

```bash
npx license-wizard --license MIT
```

This writes the official MIT text to `LICENSE` and records `MIT` in every manifest present.

### Customizing copyright fields

Some licenses have fillable fields such as the year and copyright holder. List the fields a license accepts, then supply each one with a repeatable `--set "field=value"`:

```bash
npx license-wizard --license MIT --get-tokens
npx license-wizard --license MIT --set "year=2026" --set "copyright holders=Erdem Bircan"
```

A field may be named by its label (e.g. `year`, case-insensitive) or its bracket token (e.g. `<year>`). Omit `--set` to write the official text unchanged.

> If you start customizing but leave out a required field, License Wizard writes nothing — it lists the missing fields and exits non-zero, so you (or a calling agent) know exactly what to provide.

### Unrecognized identifiers

SPDX identifiers are exact — `apache-2-0` is not `Apache-2.0`. On a typo, License Wizard reports that no license matches, suggests the closest identifiers, and exits non-zero rather than failing with a stack trace.

### Previewing without writing

Add `--dry-run` to any run to print the license that would be generated and a summary of the writes that were skipped — no `LICENSE`, config, or manifest changes are made. It works in the interactive wizard too.

## Source-file headers

Beyond the `LICENSE` file, License Wizard can stamp a per-file license header at the top of your source files — the short notice many licenses ask you to add to each file. The interactive wizard offers this after the license is chosen; non-interactively, pass `--headers` with a style:

```bash
npx license-wizard --license MIT --headers short --save-npm
```

### Two styles

- `short` writes the canonical SPDX tag lines (`SPDX-License-Identifier:`, plus `SPDX-FileCopyrightText:` when you've filled in copyright fields). Available for **every** license.
- `full` writes the license's complete standard header notice, with your copyright fields substituted. Available only for licenses that publish one (Apache-2.0, the GPL family, MPL-2.0, …). For a license without a standard header (MIT, BSD, ISC, …), only `short` applies.

The header reuses whatever copyright values you chose for the `LICENSE` text — it's never asked for separately.

### What gets a header

Only the source files the npm and Composer ecosystems use: `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.cts`, `.mts`, and `.php`. JSON, stylesheets, markdown, and generated output are left alone. Dependencies (`node_modules/`, `vendor/`), `.git/`, and everything your `.gitignore` excludes are skipped automatically — add more with a repeatable `--headers-ignore <glob>`. A `#!` shebang stays on top, and the header sits inside PHP's `<?php` tag.

### Safe to re-run

License Wizard owns the headers it writes. Running it again over an unchanged project changes nothing; switching licenses updates the existing header in place rather than stacking a second one; and [verification](/license-wizard/docs/verify-ci/) keeps them current. A notice you wrote by hand is always left untouched.

### Removing headers

To take the headers back out, pass `--remove-headers`. It strips every header License Wizard added and drops the headers preference from your saved config, so verification stops checking that surface. It honors `--headers-ignore` and `--dry-run`, and your hand-written notices stay put.

```bash
npx license-wizard --remove-headers
```

## Verify & CI

Once a configuration is saved, `--verify` checks that your project still matches the license you chose — that the `LICENSE` file is the official, up-to-date text, that every manifest's `license` field carries the right identifier, and, when you opted into them, that your source-file headers are present and current.

```bash
npx license-wizard --verify
```

By default, verification **self-heals**: anything out of sync — an edited copyright line, a stale `LICENSE`, a hand-changed manifest field, a source file missing its header — is brought back in line with the license you chose. When nothing has drifted, it confirms and exits zero.

### Strict mode for CI

Add `--strict` to make any mismatch an error instead: License Wizard leaves everything untouched, lists each surface that drifted, and exits non-zero so the pipeline stops. A passing run exits zero, making it a drop-in check step:

```yaml
- name: Check the license is in sync
  run: npx license-wizard --verify --strict
```

> Verification reads only your saved configuration — the `.licensewizardrc.json` file first, then the manifests. Both a `LICENSE` file and a saved configuration must exist, or it reports the problem and exits non-zero.

## Apply saved config

When a configuration is already saved, `--apply-config` regenerates the project from it in one shot — no prompts, no selection flags. It rewrites the `LICENSE` from the saved license and copyright fields, records the identifier in every manifest present, and, when the config opted into them, re-stamps the source-file headers in the saved style.

```bash
npx license-wizard --apply-config
```

This is the complement of saving: one run records your choice, the other replays it — handy for restoring a project's license state in CI or after a fresh checkout. If no configuration is found, it reports the problem and exits non-zero rather than generating something you didn't ask for. Add `--dry-run` to preview the regeneration without writing.

```bash
npx license-wizard --apply-config --dry-run
```

## Configuration files

License Wizard can remember your license choice so later runs start from a known default and verification has something to check against. Configuration is read from one of two places, in order of precedence:

- `.licensewizardrc.json` in the project root.
- The `license-wizard` field of `package.json` — the fallback when no rc file is present.

The saved config holds the license id, any copyright field values, and — when you opted into source-file headers — the header style, which is what tells `--verify` to check that surface:

```jsonc
{
  "licenseId": "Apache-2.0",
  "tokens": {
    "[yyyy]": "2026",
    "[name of copyright owner]": "Erdem Bircan"
  },
  "headers": { "style": "full" }
}
```

Saving is opt-in. In the wizard, choose to remember your selection; in a script, pass exactly one `--save-*` flag — `--save-rc`, `--save-npm`, or `--save-composer`. Saving writes to one location and clears the configuration from the others, so there's only ever one source of truth.

## Scripting & agents

The same predictable flow that guides a human drives cleanly from scripts, CI, and AI agents. Any of `--license`, `--set`, or `--get-tokens` switches off the prompts and runs as a single command, and the standalone modes (`--verify`, `--apply-config`, `--remove-headers`) never prompt at all.

### Exit codes are the contract

Every run signals its outcome through its exit code, so a script or agent always knows what happened without parsing output:

- A successful generation, a clean `--verify`, or a healed run exits `0`.
- A missing required field, an unrecognized identifier, a `--verify --strict` run that found drift, or a standalone mode with nothing to act on exits non-zero — and prints exactly what's wrong.

### Standalone modes take priority

`--apply-config` and `--remove-headers` are standalone: when combined with selection flags like `--license`, the standalone mode wins. This means an agent can replay a saved config without worrying that a stray `--license` will override it.

> Tell your agent to use License Wizard and it will: the flags are explicit, the failures are descriptive, and nothing is written until every required field is present.

## Flags reference

The complete flag list. Run `npx license-wizard --help` to print the same reference from the CLI.

| Flag | Description |
| --- | --- |
| `--help` | Show the help message and exit. |
| `--verify` | Check the `LICENSE` file, every manifest's `license` field, and (when configured) the source-file headers against your saved configuration, reconciling any drift. Standalone mode. |
| `--strict` | With `--verify`, fail on any drift instead of reconciling it — for CI. |
| `--apply-config` | Regenerate the `LICENSE`, manifest fields, and configured headers from the saved config; errors if none exists. Standalone — takes priority over selection flags; honors `--dry-run`. |
| `--license <spdx-id>` | Select a license by its SPDX identifier and run non-interactively. |
| `--set <field=value>` | Set a copyright field for the chosen license (repeatable). Implies non-interactive mode. |
| `--save-rc` | Save the resolved config to `.licensewizardrc.json`. Implies non-interactive mode. |
| `--save-npm` | Save the resolved config to the `license-wizard` field of `package.json` (must exist). |
| `--save-composer` | Save the resolved config to the `license-wizard` field of `composer.json` (must exist). |
| `--get-tokens` | List the copyright fields the selected license accepts (requires `--license`) and exit. |
| `--headers <short\|full>` | Also write SPDX license headers into source files — `short` (tag lines) or `full` (the standard notice). |
| `--headers-ignore <glob>` | Extra gitignore-style pattern to skip when writing headers, on top of the defaults and `.gitignore` (repeatable). |
| `--remove-headers` | Strip License Wizard's headers and drop the saved headers preference. Standalone; takes priority over `--headers`; honors `--headers-ignore` and `--dry-run`. |
| `--dry-run` | Preview the license (and, with `--headers`, a sample block and the files it would touch) and skip every write. |
