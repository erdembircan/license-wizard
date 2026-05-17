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
