/**
 * Features section: a six-card grid summarizing what license-wizard does,
 * each card carrying its own icon and a staggered reveal transition delay.
 */
export default function Features() {
  return (
    <section
      id="features"
      className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20"
    >
      <div className="mx-auto max-w-2xl text-center" data-reveal>
        <p className="eyebrow">
          <span className="size-1.5 rounded-full bg-brand"></span>Features
        </p>
        <h2 className="mt-5 font-display text-4xl font-bold tracking-tight text-ink md:text-[2.75rem]">
          Everything the LICENSE file needs
        </h2>
        <p className="mt-4 text-lg text-ink-soft">
          One predictable flow that guides a human and drives cleanly from a
          script.
        </p>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <article
          className="card"
          data-reveal
          style={{ transitionDelay: "0ms" }}
        >
          <span className="card-icon">
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <h3 className="font-display text-lg font-semibold text-ink">
            Full SPDX catalog
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Search and pick from the complete, up-to-date SPDX License List with
            type-ahead autocomplete.
          </p>
        </article>

        <article
          className="card"
          data-reveal
          style={{ transitionDelay: "60ms" }}
        >
          <span className="card-icon">
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </span>
          <h3 className="font-display text-lg font-semibold text-ink">
            Canonical text, every time
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            License text comes straight from the official SPDX data — no
            hand-copied variations creeping in.
          </p>
        </article>

        <article
          className="card"
          data-reveal
          style={{ transitionDelay: "120ms" }}
        >
          <span className="card-icon">
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </span>
          <h3 className="font-display text-lg font-semibold text-ink">
            Copyright customization
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            For licenses with fillable fields, keep the official text verbatim
            or fill in the holder, year, and the rest.
          </p>
        </article>

        <article
          className="card"
          data-reveal
          style={{ transitionDelay: "0ms" }}
        >
          <span className="card-icon">
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
              <path d="M14 2v6h6" />
              <path d="M8 13h8M8 17h8" />
            </svg>
          </span>
          <h3 className="font-display text-lg font-semibold text-ink">
            Manifest-aware
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Reads the license declared in your{" "}
            <code className="font-mono text-[0.85em]">package.json</code> or{" "}
            <code className="font-mono text-[0.85em]">composer.json</code> and
            writes your choice back to every one it finds.
          </p>
        </article>

        <article
          className="card"
          data-reveal
          style={{ transitionDelay: "60ms" }}
        >
          <span className="card-icon">
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.7 9.7 0 0 0-6.7 2.7L3 8" />
              <path d="M3 3v5h5" />
              <path d="M12 7v5l3 2" />
            </svg>
          </span>
          <h3 className="font-display text-lg font-semibold text-ink">
            Remembers your choice
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Optionally saves a small config file so re-runs start exactly where
            you left off.
          </p>
        </article>

        <article
          className="card"
          data-reveal
          style={{ transitionDelay: "120ms" }}
        >
          <span className="card-icon">
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M13 2 3 14h9l-1 8 10-12h-9z" />
            </svg>
          </span>
          <h3 className="font-display text-lg font-semibold text-ink">
            Zero config to start
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Run it with <code className="font-mono text-[0.85em]">npx</code>,
            answer a few prompts, done. No setup, no flags required.
          </p>
        </article>

        <article
          className="card"
          data-reveal
          style={{ transitionDelay: "0ms" }}
        >
          <span className="card-icon">
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <rect x="4" y="3" width="16" height="18" rx="2" />
              <rect x="7" y="6.5" width="10" height="3.2" rx="1" />
              <path d="M7 14h10M7 17.5h6" />
            </svg>
          </span>
          <h3 className="font-display text-lg font-semibold text-ink">
            Source-file headers
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Optionally stamps the per-file license notice — the short SPDX tag
            or the full standard header — across your{" "}
            <code className="font-mono text-[0.85em]">.js</code>/
            <code className="font-mono text-[0.85em]">.ts</code>/
            <code className="font-mono text-[0.85em]">.php</code> sources, with
            a marker that keeps them verifiable.
          </p>
        </article>
      </div>
    </section>
  );
}
