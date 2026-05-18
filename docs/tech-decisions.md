# Tech Decisions

## Interactive CLI: Clack

Using [`@clack/prompts`](https://www.npmjs.com/package/@clack/prompts) for interactive terminal prompts (lists, text inputs, spinners, etc.).

## CLI Flag Parsing: Node.js Built-in

Using Node.js's native `util.parseArgs` for flag parsing — no third-party library (e.g. Commander).

## Terminal Colors: Node.js Built-in

Using Node.js's native `util.styleText` (v20.12+) for terminal colorization — no third-party library (e.g. Chalk).

## Language: TypeScript

Project is written in TypeScript.

## Testing: Vitest

Using [Vitest](https://www.npmjs.com/package/vitest) for unit testing.

## Package Manager: pnpm

Using [pnpm](https://pnpm.io) for package management.

## Module System: ESM

Using native ES Modules (`"type": "module"`) — no CommonJS.

## Build: esbuild

Using [esbuild](https://esbuild.github.io) to bundle the TypeScript source into a single distributable JS file for npx usage. Type checking is handled separately via `tsc --noEmit`.

## package.json

- **description**: TBD (short description to be added)
- **author**: Erdem Bircan
- **license**: Apache-2.0

## Minimum Node.js Version

Minimum required Node.js version is determined by the most restrictive built-in API in use. This will be pinned once all built-in APIs are finalized.

## Linting & Formatting: ESLint + Prettier

Using [ESLint](https://www.npmjs.com/package/eslint) for static analysis and code quality enforcement. [Prettier](https://www.npmjs.com/package/prettier) is integrated through ESLint via [`eslint-plugin-prettier`](https://www.npmjs.com/package/eslint-plugin-prettier) — formatting violations are reported as ESLint errors, so a single `eslint --fix` handles both linting and formatting.
