# Tech Decisions

## Interactive CLI: Clack

Using [`@clack/prompts`](https://www.npmjs.com/package/@clack/prompts) for interactive terminal prompts (lists, text inputs, spinners, etc.).

## CLI Flag Parsing: Node.js Built-in

Using Node.js's native `util.parseArgs` for flag parsing — no third-party library (e.g. Commander).
