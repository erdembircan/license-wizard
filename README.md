# license-wizard — landing page

The marketing/landing site for [`license-wizard`](https://www.npmjs.com/package/license-wizard),
published with **GitHub Pages**.

This branch (`gh-pages`) is intentionally separate from the CLI source on
`master`. It contains only the website: a Vite + TypeScript + Tailwind project
whose production build is committed to **`docs/`** and served by Pages.

## Stack

- **Vite** + **TypeScript** — build & dev server
- **Tailwind CSS v4** — styling (via `@tailwindcss/vite`)
- **Vitest** — unit tests (jsdom)
- **ESLint** + **Prettier** (through `eslint-plugin-prettier`) — linting & formatting

## Develop

```bash
pnpm install
pnpm dev          # local dev server
pnpm test         # run unit tests
pnpm lint         # lint + prettier check
pnpm build        # type-check + build into docs/
```

## Publishing

`pnpm build` writes the static site to `docs/` (with `base: "/license-wizard/"`).
Commit the regenerated `docs/` folder; GitHub Pages serves it from this branch's
`/docs` folder. A `.nojekyll` marker is emitted so Pages serves the assets
as-is.

> Pages source (branch `gh-pages`, folder `/docs`) is configured from the
> GitHub web interface — there is no Actions workflow in this repo.
