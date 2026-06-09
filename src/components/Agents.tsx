import Terminal from "./Terminal";
import { agentScenes } from "../data/agentScenes";

/**
 * The "Built for AI agents" section: copy on the agent-friendly workflow beside
 * a live Claude Code-style terminal that streams real agent transcripts — the
 * same emulation as the hero, driven here by the `agentScenes` set.
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
              exactly which copyright fields a license needs; your agent
              discovers the task instead of guessing at it.
            </p>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-soft">
              Every run leaves a breadcrumb: a one-line note of what it wrote,
              or, when a field is missing, the precise fix and a non-zero exit,
              never a half-written file. Piped output stays plain text, results
              on stdout and errors on stderr, so reading the result is second
              nature for any agent.
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

          <Terminal
            scenes={agentScenes}
            ariaLabel="How an agent uses License Wizard"
          />
        </div>
      </div>
    </section>
  );
}
