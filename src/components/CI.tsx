import Pipeline from "./Pipeline";

/**
 * The "Continuous integration" section: an animated GitHub Actions run — lint,
 * test and typecheck pass, then `pnpm verify` catches a drifted LICENSE and
 * fails, blocking build — beside copy explaining the in-pipeline drift check.
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
          <div className="order-2 lg:order-1">
            <Pipeline />
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
              workflow. Nothing drifted? It exits zero and the build moves on.
              Anything out of sync — an edited copyright line, a stale file, a
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
