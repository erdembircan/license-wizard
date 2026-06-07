/**
 * The "Built for AI agents" section: copy on the agent-friendly workflow beside
 * a static terminal mockup showing the --get-tokens / --set agent flow.
 */
export default function Agents() {
  return (
    <section id="agents" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20">
      <div
        className="relative overflow-hidden rounded-3xl border border-line bg-paper-raised p-10 md:p-14"
        data-reveal
      >
        <div
          className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(47,111,224,0.14), transparent 65%)",
          }}
        ></div>
        <div className="relative grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow">
              <span className="size-1.5 rounded-full bg-brand"></span>Built for
              AI agents
            </p>
            <h2 className="mt-6 font-display text-4xl font-bold leading-tight tracking-tight text-ink">
              Second nature
              <br />
              for your agent
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
              License Wizard talks to agents the way agents talk back. Ask{" "}
              <code className="flag-code">--get-tokens</code> and it lists
              exactly which copyright fields a license needs — your agent
              discovers the task instead of guessing at it.
            </p>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-soft">
              Every run leaves a breadcrumb: a one-line note of what it wrote,
              or — when a field is missing — the precise fix and a non-zero
              exit, never a half-written file. Piped output stays plain text,
              results on stdout and errors on stderr, so reading the result is
              second nature for any agent.
            </p>
            <a
              href="https://github.com/erdembircan/license-wizard#non-interactive-mode-scripting--agents"
              target="_blank"
              rel="noopener"
              className="mt-7 inline-flex items-center gap-2 font-semibold text-brand-strong transition-colors hover:text-brand"
            >
              How agents drive it
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

          <div className="font-mono text-[13px] leading-relaxed">
            <div className="terminal">
              <div className="terminal-bar">
                <span className="term-dot bg-term-red"></span>
                <span className="term-dot bg-term-amber"></span>
                <span className="term-dot bg-term-green"></span>
                <span className="ml-2 font-mono text-xs text-term-dim">
                  agent · license-wizard
                </span>
              </div>
              <div className="px-5 py-4 text-term-text">
                <p className="text-term-dim">
                  # 1. the agent asks what the license needs
                </p>
                <p className="mt-2 text-term-text">
                  <span className="text-term-accent">$</span> npx license-wizard
                  --license MIT --get-tokens
                </p>
                <p className="mt-2 text-term-text">
                  MIT accepts the following copyright field(s):
                </p>
                <p className="pl-4 text-term-accent">year</p>
                <p className="pl-4 text-term-accent">copyright holders</p>
                <p className="mt-3 text-term-dim">
                  # 2. it fills them in and generates
                </p>
                <p className="mt-1 text-term-text">
                  <span className="text-term-accent">$</span> npx license-wizard
                  --license MIT \
                </p>
                <p className="pl-4 text-term-text">
                  --set <span className="text-term-amber">"year=2026"</span> \
                </p>
                <p className="pl-4 text-term-text">
                  --set{" "}
                  <span className="text-term-amber">
                    "copyright holders=Acme Corporation"
                  </span>
                </p>
                <p className="mt-3 text-term-green">
                  ✦ Conjured your LICENSE (MIT) and inscribed it across the
                  project manifests.
                </p>
                <p className="mt-3 text-term-dim">
                  # miss a field? it writes nothing and says what's wrong
                </p>
                <p className="mt-1 text-term-red">
                  ✗ Cannot conjure a customized MIT license — missing required
                  field(s): year
                </p>
                <p className="text-term-dim">
                  exit 1 — the agent knows exactly what to fix
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
