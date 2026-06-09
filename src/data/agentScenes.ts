import type { TerminalScene } from "./scenes";

/**
 * The agent transcripts shown in the "Built for AI agents" section, rendered
 * Claude Code style. Each is a faithful, end-to-end run against the real
 * non-interactive CLI: the commands, the whimsical "Conjured/inscribed/
 * Spellbook/Realigned/enchantment" wording, the exit-code contract, and the
 * descriptive failures are quoted from the tool's actual stdout/stderr (run
 * with `--license`, `--get-tokens`, `--headers`, `--save-rc`, `--verify
 * [--strict]`). The first shows an agent setting a project up; the second shows
 * it reading a failure and self-healing.
 */
export const agentScenes: TerminalScene[] = [
  {
    id: "agent-setup",
    label: "set up",
    kind: "agent",
    command:
      "set up Apache-2.0 for this repo, fill in our copyright, stamp the sources, and add a CI check so it can't drift",
    output: [
      { text: "" },
      { text: "⏺ I'll wire up Apache-2.0 end to end. First, what" },
      { text: "  does it need filled in?" },
      { text: "" },
      { text: "⏺ Bash(npx license-wizard --license Apache-2.0 \\" },
      { text: "        --get-tokens)" },
      {
        text: "  ⎿ Apache-2.0 accepts the following copyright",
        tone: "dim",
      },
      { text: "    field(s):", tone: "dim" },
      { text: "      yyyy", tone: "dim" },
      { text: "      name of copyright owner", tone: "dim" },
      { text: "    … +6 lines", tone: "dim" },
      { text: "" },
      { text: "⏺ Two fields. I'll fill them in, stamp the full" },
      { text: "  notice on every source, and save the config." },
      { text: "" },
      { text: "⏺ Bash(npx license-wizard --license Apache-2.0 \\" },
      { text: '        --set "yyyy=2026" \\' },
      { text: '        --set "name of copyright owner=Acme Corp" \\' },
      { text: "        --headers full --save-rc)" },
      { text: "  ⎿ Conjured your LICENSE (Apache-2.0) and", tone: "dim" },
      { text: "    inscribed it across the project manifests.", tone: "dim" },
      { text: "    Spellbook saved to .licensewizardrc.json.", tone: "dim" },
      { text: "    Inscribed the Apache-2.0 full header across", tone: "dim" },
      { text: "    34 of 34 source file(s).", tone: "dim" },
      { text: "" },
      { text: "⏺ Now a CI gate so it can never silently drift." },
      { text: "" },
      { text: "⏺ Write(.github/workflows/license.yml)" },
      {
        text: "  ⎿ + run: npx license-wizard --verify --strict",
        tone: "green",
      },
      { text: "" },
      { text: "⏺ Done — Apache-2.0 is in the LICENSE with your" },
      { text: "  copyright, every source carries the notice, and" },
      { text: "  CI will block any PR that drifts out of sync." },
    ],
  },
  {
    id: "agent-heal",
    label: "self-heal",
    kind: "agent",
    command:
      "CI says the license check is failing on main, can you find out why and fix it?",
    output: [
      { text: "" },
      { text: "⏺ Let me reproduce the failing check locally." },
      { text: "" },
      { text: "⏺ Bash(npx license-wizard --verify --strict)" },
      {
        text: "  ⎿ Project is out of sync with your saved",
        tone: "red",
      },
      { text: "    Apache-2.0 enchantment:", tone: "red" },
      { text: "      LICENSE does not match", tone: "dim" },
      { text: "      package.json license declares MIT", tone: "dim" },
      { text: "      (expected Apache-2.0)", tone: "dim" },
      { text: "    exit 1 — nothing was written", tone: "red" },
      { text: "" },
      { text: "⏺ The LICENSE was hand-edited and package.json" },
      { text: "  flipped to MIT. The saved config is Apache-2.0," },
      { text: "  and the exit code already named the fix:" },
      { text: "  reconcile the project back to it." },
      { text: "" },
      { text: "⏺ Bash(npx license-wizard --verify)" },
      {
        text: "  ⎿ Realigned the project with your saved",
        tone: "green",
      },
      { text: "    Apache-2.0 enchantment:", tone: "green" },
      { text: "      LICENSE regenerated", tone: "dim" },
      { text: "      package.json license updated to", tone: "dim" },
      { text: "      Apache-2.0 (was MIT)", tone: "dim" },
      { text: "" },
      { text: "⏺ Fixed — a plain --verify reconciled the drift," },
      { text: "  and --verify --strict passes now, so CI goes" },
      { text: "  green on the next push." },
    ],
  },
];
