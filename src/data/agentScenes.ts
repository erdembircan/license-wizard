import type { TerminalScene } from "./scenes";

/**
 * The agent transcripts shown in the "Built for AI agents" section, rendered
 * Claude Code style. Each is a faithful, end-to-end run against the real
 * non-interactive CLI: the commands, the whimsical "Conjured/inscribed/
 * Spellbook/enchantment" wording, the exit-code contract, and the descriptive
 * failures are all exactly what License Wizard emits. The first shows an agent
 * setting a project up; the second shows it reading a failure and self-healing.
 */
export const agentScenes: TerminalScene[] = [
  {
    id: "agent-setup",
    label: "set up",
    kind: "agent",
    command:
      "set up Apache-2.0 for this repo, stamp the source files, and add a CI check so it can't drift",
    output: [
      { text: "" },
      { text: "⏺ I'll wire up Apache-2.0 end to end. First, what" },
      { text: "  does it need filled in?" },
      { text: "" },
      { text: "⏺ Bash(npx license-wizard --license Apache-2.0 \\" },
      { text: "        --get-tokens)" },
      {
        text: "  ⎿ Apache-2.0 has no customizable copyright",
        tone: "dim",
      },
      { text: "    fields; it is generated as official text", tone: "dim" },
      { text: "    unchanged.", tone: "dim" },
      { text: "" },
      { text: "⏺ Nothing to fill in. Generating the LICENSE," },
      { text: "  stamping the full notice on every source, and" },
      { text: "  saving the config so the choice sticks." },
      { text: "" },
      { text: "⏺ Bash(npx license-wizard --license Apache-2.0 \\" },
      { text: "        --headers full --save-rc)" },
      { text: "  ⎿ Conjured your LICENSE (Apache-2.0) and", tone: "dim" },
      { text: "    inscribed it across the project manifests.", tone: "dim" },
      { text: "    Inscribed the Apache-2.0 full header across", tone: "dim" },
      { text: "    34 of 34 source file(s).", tone: "dim" },
      { text: "    Spellbook saved to .licensewizardrc.json.", tone: "dim" },
      { text: "" },
      { text: "⏺ Now a CI gate so it can never silently drift." },
      { text: "" },
      { text: "⏺ Write(.github/workflows/license.yml)" },
      {
        text: "  ⎿ + run: npx license-wizard --verify --strict",
        tone: "green",
      },
      { text: "" },
      { text: "⏺ Done — Apache-2.0 is in the LICENSE, every" },
      { text: "  source file carries the notice, and CI will" },
      { text: "  block any PR that drifts out of sync." },
    ],
  },
  {
    id: "agent-heal",
    label: "self-heal",
    kind: "agent",
    command:
      "CI says the license check is failing on main — find out why and fix it",
    output: [
      { text: "" },
      { text: "⏺ Let me reproduce the failing check locally." },
      { text: "" },
      { text: "⏺ Bash(npx license-wizard --verify --strict)" },
      {
        text: "  ⎿ Project is out of sync with your saved MIT",
        tone: "red",
      },
      { text: "    enchantment:", tone: "red" },
      { text: "      LICENSE does not match", tone: "dim" },
      { text: "      package.json license declares Apache-2.0", tone: "dim" },
      { text: "      (expected MIT)", tone: "dim" },
      { text: "    exit 1 — nothing was written", tone: "red" },
      { text: "" },
      { text: "⏺ The LICENSE was hand-edited and package.json" },
      { text: "  flipped to Apache-2.0. The saved config is MIT," },
      { text: "  so the exit code already told me the fix:" },
      { text: "  reconcile everything back to MIT." },
      { text: "" },
      { text: "⏺ Bash(npx license-wizard --verify)" },
      {
        text: "  ⎿ LICENSE and project manifests are up to date,",
        tone: "green",
      },
      {
        text: "    in harmony with your saved MIT enchantment.",
        tone: "green",
      },
      { text: "" },
      { text: "⏺ Fixed — a plain --verify healed the drift, and" },
      { text: "  --verify --strict passes now, so CI goes green" },
      { text: "  on the next push." },
    ],
  },
];
