# Per-Domain Contract Charts

These charts decompose the single, system-wide
[`../class-diagram.mmd`](../class-diagram.mmd) into one focused view per domain.
The master chart had grown overcrowded — too many classes and too many
cross-domain edges to read at a glance. Each file here shows **only** the classes
that belong to one domain and **only** the relationships **within** that domain.

Cross-domain interactions are deliberately **not** documented in these files.
They remain in the master `class-diagram.mmd`, which stays the authoritative,
whole-system picture (and the place to look for how domains talk to each other).

## Domains

| File | Domain | Source |
| --- | --- | --- |
| [`application.mmd`](application.mmd) | Application — the bootstrap (`LicenseWizard`), the run modes, and the install/header use-cases | `src/` (root), `src/LicenseInstaller.ts`, `src/HeaderApplier.ts`, `src/modes/` |
| [`verify.mmd`](verify.mmd) | Verify — the verification use-case and its report types | `src/LicenseVerifier.ts` |
| [`cli.mmd`](cli.mmd) | CLI — flag parsing, question/answer flow, rendering, reporting | `src/cli/` |
| [`licensing.mmd`](licensing.mmd) | Licensing — SPDX sourcing, templating, generation | `src/licensing/` |
| [`configuration.mmd`](configuration.mmd) | Configuration — file system, config stores, project manifests | `src/configuration/` |
| [`headers.mmd`](headers.mmd) | Headers — source-file scanning and header install/remove/verify | `src/headers/` |

### Notes

- **`LicenseWizard`** is the bootstrap / composition root. Almost all of its
  relationships point outward into other domains, so they do not appear in
  `application.mmd`.
- A class is listed in its domain's chart even when it has no intra-domain edges
  (e.g. `FlagParser`, `ProgressBar`, `HeaderConfig`), because it still belongs to
  that domain. Its outward relationships live in the master chart.
