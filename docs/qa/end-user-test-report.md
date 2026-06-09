# License Wizard — End-User Test Report

**Date:** 2026-06-09
**Build under test:** `master` @ `e9a3308` (dist built from current source)
**Method:** Black-box end-user testing of the built CLI (`node bin/license-wizard.js`) against throwaway dummy projects, validated against the documented contract (`documentation.md`) and the canonical SPDX license data the tool itself fetches.
**Scope:** **Non-interactive surfaces only.** The interactive `@clack/prompts` wizard is **not covered here** and must be verified separately (manual / TTY testing).

Each finding lists a severity, a copy-pasteable repro, expected-vs-actual, affected scope, and a root-cause pointer where known. A list of **confirmed-correct behaviors** is included at the end so fixes don't regress what already works.

> Note on environment: the CLI fetches license data from `raw.githubusercontent.com` per run (in-memory cache only), so every repro requires network access.

---

## Severity summary

| # | Severity | Title |
|---|----------|-------|
| F1 | 🔴 Critical | Customized (`--set`) license text is corrupted for every fillable license except Apache-2.0 |
| F2 | 🔴 High | Unhandled errors dump the entire minified bundle + stack trace ("no stack trace" promise broken) |
| F3 | 🟠 High | `--headers full` on GPL family stamps unfillable `<year> <name of author>` placeholders into every file |
| F4 | 🟠 Medium | Partial write / inconsistent state on manifest read/parse failure |
| F5 | 🟠 Medium | Headers stack on top of pre-existing / hand-written license notices → conflicting dual SPDX lines |
| F6 | 🟠 Medium | Non-canonical SPDX id persisted on case-insensitive match (`--license mit` → `"license":"mit"`) |
| F7 | 🟠 Medium | No unknown-flag detection — typo'd flags silently fall through to the interactive wizard |
| F8 | 🟡 Medium | `--set` value never trimmed; empty / whitespace-only value silently accepted (exit 0) |
| F9 | 🟡 Low | Standard path re-wraps canonical text to 80 cols (content faithful, but not byte-for-byte) |
| F10 | 🟡 Low | Manifest indentation style clobbered on write (4-space / tab → 2-space) |
| F11 | 🟡 Low | `.licensewizardrc.json` written without a trailing newline |
| F12 | 🟡 Low | Mixed line endings: LF header prepended to CRLF source files |
| F13 | 🟡 Low | Header write adds a trailing newline to files that lacked one (round-trip not byte-perfect) |
| F14 | 🟡 Low | Bare value-flag swallows the next flag (`--license --save-rc` loses the save flag) |
| F15 | 🟡 Low | Poor suggestion quality for some typos (`GPLv3` surfaces no GPL variant) |
| F16 | ⚪ Info | `--headers SHORT` / `--headers ""` leniently accepted |

---

## 🔴 F1 — Customized (`--set`) license text is corrupted

**Severity: Critical.** Directly violates the core promise: *"license text comes straight from the official SPDX data … canonical text, every time."*

The **standard path (no `--set`) is faithful** (see F9 — only re-wrapping differs). But the moment copyright fields are supplied with `--set`, the tool renders `detail.standardLicenseTemplate` instead of `detail.licenseText`, and the template renderer is broken. Affected: **MIT, ISC, all BSD variants, Zlib** (every fillable license with inline template vars). **Apache-2.0 is the lone exception** (content-faithful; only cosmetic indent/trailing-space).

### Sub-findings

**F1a — Inserts optional clauses that are NOT in the canonical text (legal-text divergence).** Confirmed on **MIT**.
```bash
node bin/license-wizard.js --license MIT --set "year=2026" --set "copyright holders=Acme"
grep "including the next paragraph" LICENSE   # present — but canonical MIT has no such clause
```
The renderer keeps all `<<beginOptional>>…<<endOptional>>` content unconditionally. MIT's optional `(including the next paragraph)` is emitted; canonical `licenseText` (and the standard path) omit it.

**F1b — Ships a raw unsubstituted bracket placeholder in the body.** Confirmed on **BSD-3-Clause-Clear**.
```bash
node bin/license-wizard.js --license BSD-3-Clause-Clear --set "xxxx=2026" --set "Owner Organization=Acme"
grep "Organization]" LICENSE   # body still literally reads: Neither the name of [Owner       Organization]
```
Only the copyright-line occurrence of the var is substituted; a second occurrence of the same field in the clause body is delivered as a literal `[Owner Organization]` (also space-corrupted by wrapping).

**F1c — Injects / alters content relative to canonical.** Confirmed on **Zlib** and **BSD-2-Clause**.
- Zlib canonical `licenseText` has **no copyright line**; the customized path injects a whole `Copyright (c) 2026 Acme` line.
- BSD-2-Clause template copyright `original` ends with a spurious `.` → renders `Acme.` where canonical has no period.

**F1d — Pervasive whitespace corruption.** Affects every fillable license.
```bash
node bin/license-wizard.js --license MIT --set "year=2026" --set "copyright holders=Acme"
sed -n '3,8p' LICENSE | sed 's/ /·/g'
```
- `(the·"·Software·")` — spaces injected inside the quotes (should be `(the "Software")`)
- `Software·,` / `Software·.` — space before punctuation
- ` Copyright (c) 2026 Acme  ` — leading space + trailing double-space on the copyright line
- the blank line between the copyright line and the first body paragraph is **dropped**
- BSD numbered conditions run together (`…disclaimer. 2. Redistributions…`) instead of being blank-line-separated

**Root cause:** `src/licensing/SpdxTemplate.ts` (`render()`, ~lines 100–108) only substitutes tokens inside the `copyright` var's `original`; every other `<<var>>` is emitted as its raw `original`, and `<<beginOptional>>`/`<<endOptional>>` markers are stripped while their enclosed content is kept unconditionally. `src/licensing/LicenseGenerator.ts` selects this template path whenever `tokens` is non-empty. `src/licensing/TextWrapper.ts` then reflows, smearing the stray spaces across line breaks.

**Suggested direction:** the SPDX template grammar must be fully honored — substitute *all* matched vars (by name) everywhere they occur, respect `<<beginOptional>>` semantics, and not invent spacing. Alternatively, prefer substituting into `licenseText` directly when the canonical text already contains the placeholder strings, reserving the template only for true field replacement.

---

## 🔴 F2 — Unhandled errors dump the entire minified bundle + stack trace

**Severity: High.** Contract ("Unrecognized identifiers", "Exit codes are the contract") promises errors are reported gracefully *"rather than failing with a stack trace."* Several error paths instead dump the **entire minified `dist/index.js` (~30 KB)** to stderr followed by a Node stack trace. Exit codes are non-zero (correct), but the output is a crash dump — terrible for the advertised script/agent/CI use case.

Confirmed triggers:

**F2a — Network failure.** Any fetching run with no network. `LicenseRepositoryError` (network) is not caught by the `instanceof LicenseNotFoundError` handler in the non-interactive mode's `#y` license lookup, so it propagates unhandled.

**F2b — `--license` with no value (offline, deterministic).**
```bash
node bin/license-wizard.js --license
# bare --license parsed as boolean true → fetchLicense(true) → true.toLowerCase() → TypeError → bundle dump, exit 1
```

**F2c — `--set` with no value (offline, deterministic).**
```bash
node bin/license-wizard.js --license MIT --set
# list element is non-string → #S parser calls s.indexOf("=") → TypeError → bundle dump, exit 1
```

**F2d — Filesystem / JSON-parse errors.** Malformed `package.json`/`composer.json`, empty manifest, read-only target file, or read-only working dir all dump a `FileSystemWriterError` with minified source + async stack (exit 1). (See F4.)

**Suggested direction:** a top-level catch in `bin/license-wizard.js` / `LicenseWizard.run()` that prints `error.message` (one line) and sets a non-zero exit code; guard `--license`/`--set` argument types before use; catch `LicenseRepositoryError` alongside `LicenseNotFoundError`.

---

## 🟠 F3 — `--headers full` on GPL family stamps unfillable placeholders

**Severity: High.**
```bash
node bin/license-wizard.js --license GPL-3.0-only --headers full
head -3 src/anyfile.js   # → "* Copyright (C) <year> <name of author>"
```
The GPL full-header template embeds `<year>` and `<name of author>`, but the license exposes **no** copyright fields:
```bash
node bin/license-wizard.js --license GPL-3.0-only --get-tokens          # "no customizable copyright fields"
node bin/license-wizard.js --license GPL-3.0-only --set "year=2026" ... # rejected: "Unknown copyright field(s)"
```
So there is **no path** to a correctly-filled GPL full header — every eligible file is stamped with literal `<year> <name of author>`. Contract says `full` writes the notice *"with your copyright fields substituted."* Substitution is impossible here.

**Suggested direction:** expose the header template's own slots as fillable fields, or substitute the copyright values already collected for the LICENSE, or refuse `full` when its placeholders can't be filled.

---

## 🟠 F4 — Partial write / inconsistent state on manifest failure

**Severity: Medium.** The LICENSE file is written **before** manifests are parsed/updated, so a manifest failure leaves the project half-done — contradicting *"the declared license and the file on disk always agree."*

**F4a — Malformed manifest → stale.**
```bash
printf '{ invalid' > package.json
node bin/license-wizard.js --license MIT     # exit 1 (bundle dump, see F2d) — but LICENSE now exists, package.json untouched/stale
```
Contrast with a *missing* save target, which aborts atomically (no LICENSE written) — so the malformed-manifest path is the inconsistent one.

**F4b — Non-object manifest → silent false success.**
```bash
echo '["not","an","object"]' > composer.json
node bin/license-wizard.js --license MIT     # exit 0, prints "inscribed it across the project manifests" — but composer.json is UNCHANGED
```
An agent trusting the exit code + message believes the composer manifest was updated when it wasn't.

**Suggested direction:** validate/parse all manifests up front; write LICENSE only after manifest updates succeed (or roll back). Treat a non-object manifest as an error, not a success.

---

## 🟠 F5 — Headers stack on top of pre-existing / hand-written notices

**Severity: Medium.** Contract: *"A notice you wrote by hand is always left untouched"* and the tool *"owns the headers it writes"* without *"stacking a second one."* The tool only recognizes its own `license-wizard managed-header v1` marker; any foreign notice is neither detected nor skipped.

```bash
# file starts with: // SPDX-License-Identifier: GPL-2.0-only
node bin/license-wizard.js --license Apache-2.0 --headers short
# file now has TWO SPDX-License-Identifier lines: Apache-2.0 stacked above the pre-existing GPL-2.0-only
```
The hand-written text is preserved (so "left untouched" is *literally* true), but the file ends up with a **contradictory dual-license declaration**. A file that already declares a license should be detected and skipped or reconciled, not prepended over.

**Suggested direction:** detect any existing SPDX/license header (not just the tool's own marker) and skip or warn instead of blindly prepending.

---

## 🟠 F6 — Non-canonical SPDX id persisted on case-insensitive match

**Severity: Medium.**
```bash
node bin/license-wizard.js --license mit --save-rc
cat package.json    # "license": "mit"   (should be canonical "MIT")
```
Matching is case-insensitive (good for UX) but the stored/recorded id is not canonicalized to the official SPDX casing. SPDX ids are case-sensitive in the ecosystem; downstream tooling — and likely `--verify` after a manual edit — expects `MIT`.

**Suggested direction:** resolve the matched entry's canonical `licenseId` and record *that*, regardless of input casing.

---

## 🟠 F7 — No unknown-flag detection

**Severity: Medium.** The arg parser silently ignores unrecognized flags.
```bash
node bin/license-wizard.js --licens MIT      # typo: no non-interactive trigger fires →
                                             # drops into the interactive wizard → exit 13 on non-TTY, no diagnostic
node bin/license-wizard.js --frobnicate      # silently ignored
```
Bad for the advertised scripting/agent contract: a typo'd flag degrades into the wizard rather than erroring clearly.

**Suggested direction:** reject unknown flags with a clear message + non-zero exit (or at least warn).

---

## 🟡 F8 — `--set` value never trimmed; empty / whitespace-only value accepted

**Severity: Medium.** The key side is trimmed; the value side is not, and empty values pass the "field is present" check.
```bash
node bin/license-wizard.js --license MIT --set "year=" --set "copyright holders=Acme"        # exit 0 → "Copyright (c)  Acme"
node bin/license-wizard.js --license MIT --set "year=2026" --set "copyright holders=   "      # exit 0 → whitespace holder
node bin/license-wizard.js --license MIT --set " year = 2026 " --set "copyright holders=Acme" # value " 2026 " keeps spaces
```
Contract says nothing is written *"until every required field is present"* — an empty value technically satisfies "present," so a broken/empty copyright line is written with exit 0.

**Suggested direction:** trim values; treat empty / whitespace-only as a missing required field.

---

## 🟡 F9 — Standard path re-wraps canonical text to ~80 cols

**Severity: Low.** The standard (no-`--set`) path is **content-faithful** — with whitespace collapsed, output is byte-identical to canonical `licenseText` for all licenses tested (word-sequence identical; MPL-2.0 is byte-for-byte identical as it's already ≤72 cols). The only difference is line wrapping: canonical wraps wide (paragraph-per-line), the tool reflows to 80 (`src/licensing/TextWrapper.ts`). Legal content is intact, but the contract's literal "byte-for-byte canonical" claim is not strictly true.

**Suggested direction:** either preserve canonical wrapping verbatim, or soften the "byte-for-byte" wording in docs to "canonical content."

---

## 🟡 F10–F16 — Lower-severity items

- **F10 (Low):** Manifest writes always reserialize with 2-space indent, clobbering original 4-space/tab/compact style. Keys, values, and key order are preserved (no data loss), but produces noisy diffs.
- **F11 (Low):** `.licensewizardrc.json` is written without a trailing newline, while manifests get one — inconsistent.
- **F12 (Low):** Headers are inserted with LF line endings even when the source file uses CRLF, producing mixed EOL (lint/git noise).
- **F13 (Low):** Header *write* appends a trailing newline to files that lacked one, so `--headers` → `--remove-headers` is not byte-for-byte for newline-less files. (Removal itself is faithful; the loss happens at write time.)
- **F14 (Low):** A bare value-flag swallows the next token: `--license --save-rc` treats `--save-rc` as the license value (then no-match), so the save flag is silently lost. Related to F2b.
- **F15 (Low):** Typo suggestion quality is uneven: `apache-2-0` correctly suggests `Apache-2.0`, deprecated ids suggest their `-only`/`-or-later` replacements, but `GPLv3` surfaces no GPL variant (the alphanumeric-normalized Levenshtein ranker drifts for short/garbled inputs).
- **F16 (Info):** `--headers SHORT` is lowercased and accepted; `--headers ""` is treated as unset (license-only generation). Lenient vs the strict-exactness spirit, but not a crash.

---

## ✅ Confirmed-correct behaviors (do not regress)

**Generation / fidelity**
- Standard-path content fidelity across MIT, Apache-2.0, BSD-2/3-Clause, BSD-3-Clause-Clear, ISC, 0BSD, Unlicense, GPL-2.0/3.0-only, LGPL-3.0-only, AGPL-3.0-only, MPL-2.0, Zlib (MPL byte-perfect).
- Apache-2.0 customized path is content-faithful.

**Tokens / fields**
- `--get-tokens` lists fields and exits 0 without writing; requires `--license` (else exit 1 with the documented message).
- Field naming: label (case-insensitive), bracket token, and surrounding-space-trimmed key all resolve.
- Missing required field → exit 1, nothing written. Unknown field → exit 1, nothing written. Repeated field → last wins. `--set` on a no-field license → exit 1.

**Manifests / save**
- `license` field written into every manifest present (pkg-only / composer-only / both); LICENSE still written when neither present.
- Wrong/missing `license` field correctly overwritten/added in original key position.
- `--save-rc` / `--save-npm` / `--save-composer` shapes correct; save to an absent target → graceful exit 1, atomic (no LICENSE).
- Exactly-one-save enforced (multiple → exit 1, no writes). Single-source-of-truth: saving to one location clears the others (all transitions verified). Precedence rc > `package.json` `license-wizard` field.

**Headers (write)**
- Correct file-type coverage (`.js .jsx .mjs .cjs .ts .tsx .cts .mts .php`); `.json/.css/.md/.txt`, `node_modules/`, `vendor/`, `.git/`, and `.gitignore`-matched files skipped.
- `SPDX-FileCopyrightText` present only when copyright fields supplied. `--headers full` correctly rejected (exit 1) on no-header licenses (MIT/BSD/ISC). Apache/MPL full notice written correctly.
- Shebang line stays first; PHP header sits inside `<?php`. `--headers-ignore` (repeatable) honored. Idempotent re-runs. Switching licenses updates the header in place (no stacking). Dry-run previews without writing.

**Headers (remove)**
- Strips every wizard header cleanly (byte-for-byte where the file had a trailing newline); drops the `headers` pref from config; hand-written notices untouched; dry-run / `--headers-ignore` / no-op / shebang+PHP restore all correct; takes priority over `--headers`.

**Verify / CI** *(critical: CI-stable)*
- `--verify --strict` is **stable on a freshly-generated, unmodified project** — no false drift across standard, customized, full-header, and adversarial (token-in-value) cases. Safe as a CI gate.
- Default self-heals (exit 0); `--strict` reports each drifted surface, exits 1, leaves files untouched. Missing LICENSE / missing config → exit 1 with documented messages. Reads rc and `package.json` field.

**Apply-config / dry-run / precedence**
- `--apply-config` replays saved license + tokens + headers; errors (exit 1) with no config; wins over `--license`; `--dry-run` previews without writing.
- Standalone precedence: `remove-headers` > `verify` > `apply-config` > one-shot > interactive.
- Exit codes are non-zero on documented error paths and 0 on success (except the F2/F7 crash/fall-through cases noted above).

---

## Not covered

- **Interactive `@clack/prompts` wizard** — search/autocomplete, standard-vs-customize, header prompts, save selection, remove-headers menu, interactive dry-run, and cancel (Ctrl-C) behavior. To be verified manually / via a TTY harness.
