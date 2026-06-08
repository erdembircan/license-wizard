import CopyButton from "./CopyButton";
import Terminal from "./Terminal";

/**
 * The landing-page hero: the headline copy, install command, primary call to
 * action links, feature checklist, and the interactive terminal demo.
 */
export default function Hero() {
  return (
    <section className="relative mx-auto max-w-6xl px-5 pt-32 pb-20 md:pt-40">
      <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
        {/* copy */}
        <div>
          <p className="eyebrow hero-rise" style={{ animationDelay: "0.05s" }}>
            <span className="size-1.5 rounded-full bg-brand"></span>
            Full SPDX catalog · zero config
          </p>

          <h1
            className="hero-rise mt-6 font-display text-5xl font-extrabold leading-[1.04] tracking-tight text-ink md:text-6xl"
            style={{ animationDelay: "0.12s" }}
          >
            Pick a license.
            <br />
            Generate a perfect{" "}
            <span className="relative whitespace-nowrap text-brand">
              LICENSE{" "}
              <svg
                className="absolute -bottom-2 left-0 w-full"
                height="10"
                viewBox="0 0 200 10"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M2 7 C 50 2, 150 2, 198 6"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.45"
                />
              </svg>
            </span>{" "}
            file.
          </h1>

          <p
            className="hero-rise mt-7 max-w-xl text-lg leading-relaxed text-ink-soft"
            style={{ animationDelay: "0.2s" }}
          >
            The license in your{" "}
            <code className="font-mono text-[0.95em] text-ink">
              package.json
            </code>{" "}
            says one thing; the{" "}
            <code className="font-mono text-[0.95em] text-ink">LICENSE</code>{" "}
            file at your repo root is a separate, manual chore. License Wizard
            closes that gap: canonical SPDX text, your copyright filled in,
            every manifest kept in sync.
          </p>

          {/* install */}
          <div
            className="hero-rise mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"
            style={{ animationDelay: "0.28s" }}
          >
            <div className="copy-field flex-1">
              <span className="truncate">
                <span
                  className="t-accent select-none"
                  style={{ color: "var(--color-brand)" }}
                >
                  $
                </span>{" "}
                npx license-wizard
              </span>
              <CopyButton
                text="npx license-wizard"
                label="Copy install command"
              />
            </div>
          </div>

          <div
            className="hero-rise mt-5 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "0.34s" }}
          >
            <a
              href="https://www.npmjs.com/package/license-wizard"
              className="btn-primary"
              target="_blank"
              rel="noopener"
            >
              Get started
            </a>
            <a href="#/docs" className="btn-ghost">
              Read the docs
            </a>
          </div>

          <ul
            className="hero-rise mt-9 flex flex-wrap gap-x-7 gap-y-2 text-sm text-ink-faint"
            style={{ animationDelay: "0.4s" }}
          >
            <li className="flex items-center gap-2">
              <svg
                className="size-4 text-brand"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Canonical SPDX text
            </li>
            <li className="flex items-center gap-2">
              <svg
                className="size-4 text-brand"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Node ≥ 22.13
            </li>
            <li className="flex items-center gap-2">
              <svg
                className="size-4 text-brand"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Apache-2.0
            </li>
          </ul>
        </div>

        {/* terminal */}
        <div className="hero-rise" style={{ animationDelay: "0.22s" }}>
          <Terminal />
          <p className="mt-3 text-center text-xs text-ink-faint">
            A real run: interactive, one-shot, or CI verification.
          </p>
        </div>
      </div>
    </section>
  );
}
