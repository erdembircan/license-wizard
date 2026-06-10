# Pre-publish Security & Bug Review — 2026-06-10

Full-codebase review ahead of the first npm publish. Scope: `src/` (all subsystems), `bin/`, `scripts/build.js`, packaging (`package.json` `files`/`bin`/`engines`), CI workflows, and dependencies.

Overall posture is good: no shell execution or eval anywhere, no path traversal, no prototype pollution, no ReDoS surface, HTTPS-only fetches with default TLS validation, clean `pnpm audit`, and a tight 5-file published tarball. The findings below are ordered by priority. Line numbers reference the tree at commit `0b849ae`.

> **Note for the fixing agent:** per `CLAUDE.md`, any fix that changes public behavior or module interactions must update the corresponding chart in `docs/contracts/` in the same PR. Several priority findings (verifier behavior, config schema) fall under this rule.

---

## Priority findings

These are cases where the tool contradicts its own stated invariants, a spec it claims to implement, or fails unsafely on unexpected input. Fix before publish.

### P1. Managed-header detection can silently erase an entire file

`src/headers/SourceFile.ts:263-280` (`findManagedBlock`), via `stripManagedBlocks` → `withoutManagedHeaders` / `withManagedHeader`.

A line counts as a managed marker if it starts with `*` (after whitespace) and parses as a marker (`src/headers/HeaderMarker.ts:53-55`) — including a marker-shaped line inside a template literal or doc text, or a genuine header whose closing `*/` was lost in an edit. From that line the code walks **up** looking for `/*` and **down** looking for `*/`, but **returns bounds even when neither delimiter is found**: the upward walk clamps to line 0 and the downward walk clamps to the last line. `stripManagedBlocks` then deletes everything in between.

Empirically reproduced: a 5-line file containing `' * license-wizard managed-header v1 MIT short abcdef123456'` inside a template literal is reduced to the empty string by `withoutManagedHeaders()`; with an unrelated `/* ... */` comment higher up, everything from that comment to EOF is deleted. Fires from header remove, re-install, and `HeaderVerifier` with `fix: true` (the default) — silently, project-wide, no backup.

This contradicts the module's own design goal: the doc comment on `isMarkerLine` (`HeaderMarker.ts:42-52`) states a header must "never \[be\] confused with code that happens to mention the token."

**Fix:** treat the block as managed only when the marker is enclosed in a well-formed comment — walk up only through lines whose trimmed form starts with `*`, require an actual `/*` to be found above and `*/` below, and return `null` otherwise. The fail-safe response to an unrecognized block is skip-and-report, never delete.

### P2. Interactive mode bypasses guards the non-interactive path enforces

Two instances of the same defect: both entry modes feed the same generation engine, but invariants enforced on the flags path are absent on the prompts path.

**P2a — blank copyright values.** Non-interactive `--set` values flow through `SpdxTemplate.resolveSlots` (`src/licensing/SpdxTemplate.ts:74-96`), which deliberately discards empty/whitespace-only values — the comment at `:85-87` states a customized license is "never written with a blank copyright line" — and `NonInteractiveMode` errors out on the resulting `missing` slots (`src/modes/NonInteractiveMode.ts:165-169`). The interactive Customize flow never calls `resolveSlots`: slot questions are plain text prompts with no validation (`src/modes/InteractiveMode.ts:373-378`), Clack finalizes an empty submission as `""` (verified in `@clack/core@1.3.1`), and `#slotValuesFrom` (`InteractiveMode.ts:560-563`) keeps it. Pick MIT → Customize → Enter on the year question, and the LICENSE is written as `Copyright (c)  <copyright holders>` minus the year.

**Fix:** route interactive slot answers through `resolveSlots` (re-asking when a required value comes back missing), or validate non-empty in the slot text prompts.

**P2b — unfillable "Full" headers.** Non-interactive blocks `--headers full` when the license's standard header contains placeholders the collected values can't fill (`NonInteractiveMode.ts:174-183`, `#fullHeaderHasUnfilledPlaceholders`); the comment names the GPL family. The interactive header-style question offers "Full" unconditionally whenever the license publishes a standard header (`InteractiveMode.ts:277-296`). Verified against live SPDX data: GPL-3.0-only's *body* template has no `copyright` var (only `bullet`/`philicenses`), so the wizard discovers zero slots and asks zero customization questions — yet its *standard header* begins `Copyright (C) <year> <name of author>`. Choosing Full for GPL therefore stamps those literal placeholders into every scanned source file, guaranteed, regardless of user input. Same for an uncustomized Apache-2.0 (`[yyyy] [name of copyright owner]`).

**Fix:** gate the "Full" option (or its acceptance) on the same `#fullHeaderHasUnfilledPlaceholders` logic.

### P3. Gitignore matching deviates from git semantics

`src/headers/GitignoreMatcher.ts:84-141`. Empirically confirmed:

- `**/foo` does **not** match root-level `foo` (compiles to `^.*/foo(/|$)`, requiring a slash; git matches at any depth including root).
- `a/**/b` does **not** match `a/b` (git treats `/**/` as zero-or-more directories).
- Character classes are escaped as literals (`#glob`, line 136), so patterns like `[Bb]uild/` never match.

Consequence: directories the project's `.gitignore` excludes (e.g. `**/dist`, `[Bb]uild/`) are scanned and get headers written into generated output.

**Fix:** special-case leading `**/`, trailing `/**`, and `/**/` as zero-or-more-segment groups (`(?:[^/]+/)*`), and support (or explicitly document as unsupported) character classes.

### P4. No timeout on SPDX network fetches

`src/licensing/SpdxLicenseSource.ts:79` and `:213` — neither `fetch()` has an `AbortSignal`, so a stalled connection hangs until undici's default ~5-minute timeouts. In non-interactive/CI runs (`--license`, `--verify`) the job hangs. In the interactive search it is worse: `ClackRenderer` (`src/cli/ClackRenderer.ts:205-237`) sets `fetchInFlight = true` and only resets it when the request settles, so while one request hangs every subsequent keystroke's search is silently dropped — spinner forever, dead search box, no error.

**Fix:** pass `signal: AbortSignal.timeout(...)` to both fetches so failures surface through the existing clean error path.

---

## Secondary findings

Worth triage; each is a real defect but with narrower impact or a plausible "intended behavior" answer. If any of these is intentional, say so in review and drop it.

### S1. `HeaderVerifier --fix` writes over foreign SPDX notices

`src/headers/HeaderVerifier.ts:150-173` (`#classify`). `HeaderInstaller.install` (`src/headers/HeaderInstaller.ts:82-87`) deliberately skips files carrying a hand-written `SPDX-License-Identifier` to avoid two contradictory declarations. The verifier lacks that check: such a file is classified `missing`, and fix mode (the default) writes a wizard header on top of the foreign notice — the exact state the installer refuses to create. **Fix:** apply the same `hasForeignLicenseNotice()` skip in `#classify` and report those files separately.

### S2. `HeaderVerifier` scans without the install-time ignore scope

`src/headers/HeaderVerifier.ts:126` calls `scan()` with no `extraIgnores`, while install/remove honor `--headers-ignore` (`src/HeaderApplier.ts:118,186`). The patterns are not persisted in `WizardConfig`, so a project installed with `--headers-ignore 'generated/'` has `verify` (fix default true) write headers into the excluded files. **Fix:** persist the ignore patterns in `HeaderConfig` (contracts update required) or accept the flag in verify, and pass them to the scan.

### S3. No schema validation on parsed config

`src/configuration/RcConfigStore.ts:43` and `src/configuration/ManifestConfigStore.ts:59` — bare `as WizardConfig` casts on `JSON.parse` output. Verified consequences: an rc file containing `{}` is truthy and **masks a valid config in package.json** (`src/configuration/Config.ts:54`); a non-string token value (`"tokens": {"<year>": 2026}`) throws a raw `TypeError: value.trim is not a function` from `HeaderRenderer.#copyrightText` (`src/headers/HeaderRenderer.ts:88-90`); `--apply-config` with a malformed file reports the confusing "No license matches \"undefined\"" instead of naming the broken file. **Fix:** validate shape on read (`licenseId` non-empty string, `tokens` a record of strings, `headers.style` in the `HeaderStyle` set) and reject with "malformed configuration in \<file\>".

### S4. Non-atomic file writes

`src/configuration/NodeFileSystemWriter.ts:21-33` — `fs.writeFile` truncates in place. Every write goes through it: the user's `package.json`/`composer.json`, the rc file, LICENSE, and **every source file during the multi-file header loop** (`src/headers/HeaderInstaller.ts:94`), which has no SIGINT protection. A crash, disk-full, or Ctrl-C mid-write leaves a truncated file. **Fix once at the writer:** write to a temp file in the same directory and `fs.rename` over the target.

### S5. Interactive wizard can "succeed" doing nothing

`src/modes/InteractiveMode.ts:142` / `src/cli/ClackRenderer.ts:260-271`. Clack's `AutocompletePrompt` submits `undefined` on Enter with an empty selection (no `validate` option is passed; verified in `@clack/core@1.3.1`). On a fresh project the user can Enter through the license prompt; the wizard asks the remaining questions, then `run()`'s `typeof licenseAnswer?.value === "string"` guard skips the install branch: no LICENSE, no message, exit 0. **Fix:** validate non-empty selection in `clack.autocomplete`, or detect the non-string answer and error with exit 1.

### S6. Empty inline flag values fall through to interactive mode

`src/cli/FlagParser.ts:162-168` / `src/LicenseWizard.ts:307-317`. `validate()` rejects a missing value but not an empty one: `--license=` (e.g. `--license=$VAR` with an unset variable in CI) yields `""`, passes validation, makes `#isNonInteractive()` false, and the run falls into the interactive prompt — hanging CI instead of failing fast. Same for `--headers=`. **Fix:** reject `token.value === ""` for value-accepting flags.

### S7. Positional arguments are silently ignored

`src/cli/FlagParser.ts:142-145` with `allowPositionals: true`. `license-wizard verify --strict` parses `verify` as a positional and skips it; the run opens the interactive wizard. Unknown *flags* are already rejected for exactly this reason (`src/LicenseWizard.ts:334-336`); positionals deserve the same. **Fix:** error on any positional token (or `allowPositionals: false`).

### S8. PHP files not starting with `<?php` get the header emitted as page output

`src/headers/SourceFile.ts:189-199` (`preambleLength`). For a `.php` file whose first meaningful content is HTML (legacy template style), the `/* ... */` block is inserted above everything — outside any PHP tag — and served verbatim to visitors. Empirically confirmed. **Fix:** skip-and-report `.php` files whose first meaningful content is not an open tag, or wrap the header in its own `<?php /* ... */ ?>` block.

### S9. Slot discovery treats angle-bracketed URLs/emails as placeholders

`src/licensing/SpdxTemplate.ts:6` — `TOKEN = /<[^<>]+>|\[[^[\]]+\]/g`. Scanned all 697 live SPDX licenses: 22 copyright originals contain angle-bracketed URLs/emails that are part of a concrete notice (GFDL family: `<http://fsf.org/>`; curl: `<daniel@haxx.se>`). These are offered as fillable copyright fields in `--get-tokens` and the interactive Customize flow, and a supplied value overwrites e.g. the FSF's own copyright line. **Fix:** exclude tokens that parse as URLs/emails when discovering slots.

### S10. Silent config loss when a manifest's top level is a JSON array

`src/configuration/ManifestConfigStore.ts:137-150`. `#readManifest` casts `JSON.parse` output without a shape check; for a top-level-array manifest, `JSON.stringify` silently drops the `license-wizard` property on write, `write()` reports success, and `Config.write` (`src/configuration/Config.ts:108-112`) then clears every other store — the config ends up nowhere. The sibling `JsonManifest.#parseObject` (`src/configuration/abstracts/JsonManifest.ts:137-157`) guards exactly this; the guard was not carried over. **Fix:** apply the same null/non-object/array rejection in `#readManifest`.

---

## Hardening / polish (optional)

Low-impact items; batch opportunistically or skip.

- **Cancel exits 0:** Ctrl-C at any prompt prints the interrupt message and `process.exit(0)` (`src/cli/ClackRenderer.ts:77-80`); wrapper scripts can't distinguish abort from success. Use 130 (or 1).
- **Spinner placeholder is selectable:** the `__loading__` row (`src/cli/Spinner.ts:32-38`) can be focused and submitted mid-search; `getLicense("__loading__")` then kills the session with `LicenseNotFoundError`, losing all answers. Mark it `disabled: true`.
- **bin executable bit:** `bin/license-wizard.js` is `100644` in the git index (npm normalizes at install, but direct tarball use doesn't). `git update-index --chmod=+x` and drop the `chmod` from `dev:start`.
- **Progress bar not stopped on error:** `bar.stop()` not in `finally` (`src/HeaderApplier.ts:131-137`, `:191-196`); a mid-run throw prints the error onto the residual bar line.
- **Remote JSON shape/size:** no validation or size cap on SPDX responses (`src/licensing/SpdxLicenseSource.ts:86-88`, `:220-229`); a 200-with-garbage proxy response surfaces as an unhelpful `TypeError`. `detailsUrl` from the index is fetched without an `https:`/`spdx.org` allowlist (defense-in-depth).
- **Control characters in externally-sourced strings:** config values and remote SPDX names reach the terminal unfiltered (`src/cli/ReportPresenter.ts`, `src/modes/InteractiveMode.ts:194`); strip C0/ESC before display (defense-in-depth).
- **VAR_TAG regex breaks on embedded quotes:** `original="([^"]*)"` (`src/licensing/SpdxTemplate.ts:3-4`) fails on 21 SPDX templates (PSF-2.0, Apache-1.1, …). Verified not reachable through any current generate/header path, but an SPDX data update could change that. Make captures non-greedy and delimiter-anchored.
- **`Config.write` non-transactional:** target store written before others are cleared (`src/configuration/Config.ts:107-112`); a failed clear leaves the config in two stores with the stale one winning on read.
- **`ManifestConfigStore.write` TOCTOU fallback:** the `: {}` fallback (`ManifestConfigStore.ts:87-89`) can fabricate a bare `package.json` if the manifest vanishes between the availability check and the write; mirror `JsonManifest.writeLicense`'s absent-file no-op.
- **Manifest rewrites normalize formatting:** hard-coded 2-space/LF reserialization (`ManifestConfigStore.ts:148-151`, `JsonManifest.ts:95-98`) reformats 4-space/tab/CRLF manifests; detect and reuse existing indentation.
- **Only the root `.gitignore` is honored** (`src/headers/SourceFileScanner.ts:10,108`); nested `.gitignore`s and `.git/info/exclude` are not. Fix or document.
- **UTF-8 BOM / non-UTF-8 files:** a leading BOM is displaced below an installed header; Latin-1 sources are mangled by lossy UTF-8 decode + rewrite. Detect and skip/report.
- **`ScanOptions.root` latent bug:** scan results are relative to `root` but consumers resolve against `process.cwd()` (`SourceFileScanner.ts:85-98`); harmless today (`root` is never non-default) but wrong for any future caller. Resolve against `root` or remove the option.
- **Orchestrator child accounting** (`src/cli/Orchestrator.ts:83`): over-decrements with nested injections — not triggerable by current question trees, latent for future flows.
- **TextWrapper:** collapses internal double spaces on over-width lines and measures UTF-16 units, not display columns (`src/licensing/TextWrapper.ts:79`). Cosmetic.
- **CI:** third-party actions pinned by tag (`EndBug/add-and-commit@v10`), not commit SHA.
- **Publish notes:** version is `1.0.0-dev`; `prepack` requires pnpm on the publishing machine (fails safe if absent).

---

## Verified clean

Checked and confirmed handled correctly — listed so they are not re-investigated:

- **Symlink escape:** the tree walker uses `withFileTypes` Dirent checks; symlinked directories are never descended, symlinked files never collected.
- **Ignore pruning:** `node_modules`/`.git`/`vendor` always pruned before descent.
- **Path traversal:** all written paths originate from the walker or hardcoded constants; no flag or config value reaches a file path.
- **Prototype pollution:** no merge/spread of parsed JSON into live objects; token keys are bracket-wrapped and cannot collide with `Object.prototype`.
- **RegExp injection / ReDoS:** no RegExp built from user or remote input; gitignore escaping is sound; no nested quantifiers.
- **Shell/eval:** zero `child_process`/`eval`/`Function()` usage; build script is a pure local esbuild bundle; no install hooks.
- **Network:** HTTPS-only constant index URL, no env/config override, default TLS validation; failures exit cleanly with a one-line error and code 1; failures are not cached.
- **Flags:** unknown flags rejected before dispatch despite `strict: false`; `--verify`/`--strict` exit codes correct (strict never writes); Clack cancel symbol checked centrally on every prompt path.
- **Header mechanics:** apply is idempotent (byte-identical on re-run, LF and CRLF); file EOL style preserved; shebang and `<?php` preambles preserved; empty/shebang-only files and install→remove roundtrips correct; file permissions preserved on rewrite.
- **License IDs:** case-insensitive lookup with the canonical SPDX id used for output and config.
- **Template fill:** pure string replacement (no eval, no `$`-pattern re-scan); validated against all 697 live SPDX licenses — filling every advertised slot never leaves raw template markup in output.
- **Packaging:** tarball contains exactly `LICENSE`, `README.md`, `bin/license-wizard.js`, `dist/index.js`, `package.json`; `bin` imports inside the published tree; `engines >=22.13.0` covers every Node API used; `pnpm audit` clean (sole runtime dep: `@clack/prompts`).
- **CI workflows:** no `pull_request_target`, no secret exposure.
