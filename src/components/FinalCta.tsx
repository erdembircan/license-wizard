import CopyButton from "./CopyButton";

/**
 * Closing call-to-action section with the install command and npm link.
 */
export default function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24">
      <div
        className="relative overflow-hidden rounded-3xl border border-line bg-paper-raised px-6 py-16 text-center"
        data-reveal
      >
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt=""
          className="mx-auto h-28 w-auto md:h-40"
        />
        <h2 className="mx-auto mt-7 max-w-2xl font-display text-4xl font-bold tracking-tight text-ink md:text-5xl">
          License your project in seconds
        </h2>
        <p className="mx-auto mt-4 max-w-md text-lg text-ink-soft">
          No install required. Just run it and answer a few prompts.
        </p>
        <p className="mx-auto mt-2 max-w-md text-lg text-ink-soft">
          Better yet, just tell your agent to use it. License Wizard works with
          any AI agent.
        </p>
        <div className="mx-auto mt-9 flex max-w-md flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <div className="copy-field w-full sm:w-auto">
            <span>
              <span style={{ color: "var(--color-brand)" }}>$</span> npx
              license-wizard
            </span>
            <CopyButton
              text="npx license-wizard"
              label="Copy install command"
            />
          </div>
          <a
            href="https://www.npmjs.com/package/license-wizard"
            target="_blank"
            rel="noopener"
            className="btn-primary w-full sm:w-auto"
          >
            View on npm
          </a>
        </div>
      </div>
    </section>
  );
}
