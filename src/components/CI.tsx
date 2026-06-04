/**
 * The "Continuous integration" section: a static terminal mockup of a CI
 * --verify --strict run beside copy explaining the in-pipeline drift check.
 */
export default function CI() {
  return (
    <section id="ci" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20">
      <div
        className="relative overflow-hidden rounded-3xl border border-line bg-paper-raised p-10 md:p-14"
        data-reveal
      >
        <div
          className="pointer-events-none absolute -bottom-28 -left-24 size-80 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(47,111,224,0.14), transparent 65%)",
          }}
        ></div>
        <svg
          className="sparkle right-[10%] top-[18%] size-4"
          style={{ animationDelay: "1.1s" }}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 0l2.2 9.8L24 12l-9.8 2.2L12 24l-2.2-9.8L0 12l9.8-2.2z" />
        </svg>
        <div className="relative grid items-center gap-10 lg:grid-cols-2">
          <div className="order-2 font-mono text-[13px] leading-relaxed lg:order-1">
            <div className="terminal">
              <div className="terminal-bar">
                <span className="term-dot bg-term-red"></span>
                <span className="term-dot bg-term-amber"></span>
                <span className="term-dot bg-term-green"></span>
                <span className="ml-2 font-mono text-xs text-term-dim">
                  license-check · GitHub Actions
                </span>
              </div>
              <div className="px-5 py-4 text-term-text">
                <p className="text-term-dim"># .github/workflows/ci.yml</p>
                <p className="mt-1 text-term-text">
                  - <span className="text-term-accent">name</span>: Check the
                  license is in sync
                </p>
                <p className="pl-2 text-term-text">
                  <span className="text-term-accent">run</span>: npx
                  license-wizard --verify --strict
                </p>
                <p className="mt-4 text-term-green">
                  ✦ LICENSE and project manifests are up to date, in harmony
                  with your saved MIT enchantment.
                </p>
                <p className="text-term-dim">exit 0 — the build moves on</p>
                <p className="mt-4 text-term-dim">
                  # someone hand-edits LICENSE …
                </p>
                <p className="mt-1 text-term-red">
                  ✗ Project is out of sync with your saved MIT enchantment:
                </p>
                <p className="pl-4 text-term-amber">LICENSE does not match</p>
                <p className="pl-4 text-term-text">
                  package.json license declares{" "}
                  <span className="text-term-amber">Apache-2.0</span> (expected
                  MIT)
                </p>
                <p className="mt-1 text-term-red">exit 1 — the build stops</p>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <p className="eyebrow">
              <span className="size-1.5 rounded-full bg-brand"></span>Continuous
              integration
            </p>
            <h2 className="mt-6 font-display text-4xl font-bold leading-tight tracking-tight text-ink">
              Keep it honest
              <br />
              in your pipeline
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
              Drop <code className="flag-code">--verify --strict</code> into any
              workflow. It re-renders the{" "}
              <code className="font-mono text-[0.9em]">LICENSE</code> from your
              saved config and checks every manifest's license field against it.
              Nothing drifted? It exits zero and the build moves on. Anything
              out of sync — an edited copyright line, a stale file, a
              hand-changed manifest — and it lists each one and exits non-zero,
              so the pipeline stops before bad metadata ships.
            </p>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-soft">
              We trust it because we run it on ourselves: License Wizard's own
              build workflow gates every push to{" "}
              <code className="font-mono text-[0.9em]">master</code> with{" "}
              <code className="flag-code">pnpm verify</code> — the very same
              check.
            </p>
            <a
              href="https://github.com/erdembircan/license-wizard#verifying-an-existing-license"
              target="_blank"
              rel="noopener"
              className="mt-7 inline-flex items-center gap-2 font-semibold text-brand-strong transition-colors hover:text-brand"
            >
              Verify &amp; strict mode docs
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
