# CLAUDE.md

## Landing Page

The project's landing page lives on the **`gh-pages`** branch, which is an **orphan branch** — it shares no history with `master` and has its own independent tree (a standalone Vite app: `index.html`, `src/`, `public/`, its own `package.json`, etc.). It is **not** part of the main codebase on `master`.

Because of this, any work on the landing page must target `gh-pages`, **not** `master`:

- Branch **off** `gh-pages` (not `master`) when starting landing-page work.
- Open the resulting PR **against** `gh-pages` as the base branch.
- Never mix landing-page changes into a `master` PR, and never bring `master` source into `gh-pages` — the two trees are intentionally separate.

If a task involves the landing page in any way, confirm you are based on `gh-pages` before making changes.

## Knowledge Base

`docs/knowledge-base/` contains reference material used to inform the design and implementation of license-wizard. Covers open source licensing concepts, SPDX standards, license file conventions, and data sources the tool relies on. This is background research — agents and contributors should consult it when making decisions about how the tool should behave.

## Architectural Charts

Charts in `docs/contracts/` are **contracts**, not implementation details. They define the authoritative picture of the application's architecture and the interactions between its modules. Treat them with the same weight as API contracts — they describe what the system is, not how it happens to be built right now.

### Content Rules

Charts show **contracts**, not internals:

- Show only **public APIs** — methods and properties that a class or module exposes to other modules
- **Never** include private methods, internal helpers, or implementation details
- Show **relationships**: associations, dependencies, composition, aggregation
- Show **hierarchy**: inheritance and interface implementation
- Mark **abstractions**: abstract classes and interfaces must be visually distinguished

### Keeping Charts Current

Charts must always reflect the current state of the software. Any change to the codebase that affects architecture, module interactions, data flow, or use case behavior **must** include a corresponding update to the relevant chart(s) in the same commit or PR. There are no exceptions — a chart that does not match the code is actively misleading.

Before closing out any implementation task, verify whether the change warrants a chart update. If it does and the chart has not been updated, the task is not done.

## JSDoc

Classes and functions must be documented with JSDoc comments. Do **not** add JSDoc to types or interfaces — TypeScript makes them self-explanatory. Since the codebase uses TypeScript, also omit `@param {type}` and `@returns {type}` annotations. Descriptions only:

```ts
/**
 * Renders a question to the terminal using the Clack prompt library.
 *
 * @param question - The question to display.
 * @returns The user's answer.
 */
```

## File Naming

All source files under `src/` must use **CamelCase** (e.g. `ClackRenderer.ts`, `IRenderer.ts`, `QuestionType.ts`). This applies to every file regardless of what it exports — classes, interfaces, types, constants, or utilities.

