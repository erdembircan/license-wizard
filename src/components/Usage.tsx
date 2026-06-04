import CopyButton from "./CopyButton";

/**
 * Usage section: a guided three-step walkthrough paired with three install
 * command boxes, each fronted by a copy-to-clipboard button.
 */
export default function Usage() {
  return (
    <section
      id="usage"
      className="scroll-mt-24 border-y border-line bg-paper-raised/60 py-20"
    >
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div data-reveal>
            <p className="eyebrow">
              <span className="size-1.5 rounded-full bg-brand"></span>How it
              works
            </p>
            <h2 className="mt-5 font-display text-4xl font-bold tracking-tight text-ink">
              A short, guided flow
            </h2>
            <p className="mt-4 text-lg text-ink-soft">
              Run it from the root of the project you want to license.
            </p>

            <ol className="mt-9 space-y-7">
              <li className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft font-mono text-sm font-semibold text-brand-strong">
                  1
                </span>
                <div>
                  <h3 className="font-display font-semibold text-ink">
                    Choose a license
                  </h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    Start typing to search the SPDX catalog. If your project
                    already declares one, it's offered as the default.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft font-mono text-sm font-semibold text-brand-strong">
                  2
                </span>
                <div>
                  <h3 className="font-display font-semibold text-ink">
                    Standard or customized
                  </h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    Keep the official text verbatim, or fill in fillable fields
                    like the copyright holder and year.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft font-mono text-sm font-semibold text-brand-strong">
                  3
                </span>
                <div>
                  <h3 className="font-display font-semibold text-ink">
                    Save your settings
                  </h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    Choose whether to remember your selection — then the{" "}
                    <code className="font-mono text-[0.85em]">LICENSE</code>{" "}
                    file is written and your manifests updated.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <div className="space-y-4" data-reveal>
            <div className="copy-field">
              <span>
                <span style={{ color: "var(--color-brand)" }}>$</span> npm
                install -g license-wizard
              </span>
              <CopyButton
                text="npm install -g license-wizard"
                label="Copy command"
              />
            </div>
            <div className="copy-field">
              <span>
                <span style={{ color: "var(--color-brand)" }}>$</span> pnpm dlx
                license-wizard
              </span>
              <CopyButton text="pnpm dlx license-wizard" label="Copy command" />
            </div>
            <div className="copy-field">
              <span>
                <span style={{ color: "var(--color-brand)" }}>$</span> yarn dlx
                license-wizard
              </span>
              <CopyButton text="yarn dlx license-wizard" label="Copy command" />
            </div>
            <p className="px-1 pt-2 text-sm text-ink-faint">
              Writes{" "}
              <code className="font-mono text-[0.85em] text-ink-soft">
                LICENSE
              </code>{" "}
              to the current directory and records the SPDX id in every manifest
              present.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
