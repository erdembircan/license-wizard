import type { ReactNode } from "react";

interface Step {
  ordinal: string;
  title: string;
  body: ReactNode;
  icon: ReactNode;
}

/** The three steps of the run, each carrying the glyph drawn into its node. */
const STEPS: Step[] = [
  {
    ordinal: "01",
    title: "Choose a license",
    body: (
      <>
        Start typing to search the SPDX catalog. If your project already
        declares one, it&apos;s offered as the default.
      </>
    ),
    icon: (
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
    ),
  },
  {
    ordinal: "02",
    title: "Standard or customized",
    body: (
      <>
        Keep the official text verbatim, or fill in fillable fields like the
        copyright holder and year.
      </>
    ),
    icon: (
      <svg
        className="size-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M4 6h8M16 6h4" />
        <circle cx="14" cy="6" r="2" />
        <path d="M4 12h4M12 12h8" />
        <circle cx="10" cy="12" r="2" />
        <path d="M4 18h10M18 18h2" />
        <circle cx="16" cy="18" r="2" />
      </svg>
    ),
  },
  {
    ordinal: "03",
    title: "Save your settings",
    body: (
      <>
        Choose whether to remember your selection, then the{" "}
        <code className="font-mono text-[0.85em]">LICENSE</code> file is written
        and your manifests updated.
      </>
    ),
    icon: (
      <svg
        className="size-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
        <path d="M17 21v-8H7v8" />
        <path d="M7 3v5h7" />
      </svg>
    ),
  },
];

/**
 * Usage section: a short, guided flow shown as a connected three-step timeline.
 * Each step is an icon node linked to the next by a vertical thread, so the
 * sequence reads as a single path from picking a license to a written file.
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
              Run it from the root of the project you want to license — three
              prompts, then it writes the file.
            </p>
            <p className="mt-6 max-w-md text-sm text-ink-faint">
              The{" "}
              <code className="font-mono text-[0.85em] text-ink-soft">
                LICENSE
              </code>{" "}
              lands in the current directory and the SPDX id is recorded in
              every manifest present.
            </p>
          </div>

          <ol className="guided-flow" data-reveal>
            {STEPS.map((step) => (
              <li key={step.ordinal} className="guided-step">
                <span className="guided-step-node">{step.icon}</span>
                <div className="guided-step-body">
                  <span className="guided-step-ordinal">{step.ordinal}</span>
                  <h3 className="font-display font-semibold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-ink-soft">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
