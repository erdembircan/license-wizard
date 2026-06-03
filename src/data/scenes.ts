export type Tone = "default" | "dim" | "accent" | "green" | "amber" | "red";

export interface TerminalLine {
  text: string;
  tone?: Tone;
}

export interface TerminalScene {
  id: string;
  label: string;
  /** "shell" types a `$` command; "agent" types a `>` prompt (Claude Code style). */
  kind?: "shell" | "agent";
  /** The command typed after the prompt (`$` for shell, `>` for an agent). */
  command: string;
  /** Output rendered line-by-line once the command finishes typing. */
  output: TerminalLine[];
}

/**
 * The terminal scenes shown in the hero, each a faithful rendering of a real
 * License Wizard run — the interactive prompt flow, an agent driving it, the
 * one-shot command, and a CI verification.
 */
export const scenes: TerminalScene[] = [
  {
    id: "agent",
    label: "agent",
    kind: "agent",
    command: "add an MIT license to this project for Erdem Bircan, 2026",
    output: [
      { text: "" },
      { text: "⏺ I'll add the MIT license and fill in your" },
      { text: "  copyright details." },
      { text: "" },
      { text: "⏺ Bash(npx license-wizard --license MIT \\" },
      { text: "        --get-tokens)" },
      {
        text: "  ⎿ MIT accepts the following copyright field(s):",
        tone: "dim",
      },
      { text: "        year", tone: "dim" },
      { text: "        copyright holders", tone: "dim" },
      { text: "" },
      { text: "⏺ Both fields found — generating with your" },
      { text: "  details filled in." },
      { text: "" },
      { text: "⏺ Bash(npx license-wizard --license MIT \\" },
      { text: '        --set "year=2026" \\' },
      { text: '        --set "copyright holders=Erdem Bircan" \\' },
      { text: "        --save-rc)" },
      { text: "  ⎿ Wrote LICENSE (MIT) and recorded it in the", tone: "dim" },
      { text: "    project manifests. Saved config to", tone: "dim" },
      { text: "    .licensewizardrc.json.", tone: "dim" },
      { text: "" },
      { text: "⏺ Done — MIT LICENSE created for Erdem Bircan" },
      { text: "  (2026) and recorded in package.json." },
    ],
  },
  {
    id: "interactive",
    label: "interactive",
    command: "npx license-wizard",
    output: [
      { text: "" },
      { text: "🧙  license-wizard", tone: "accent" },
      {
        text: "    An interactive CLI for generating license files",
        tone: "dim",
      },
      { text: "    v1.0.0", tone: "dim" },
      { text: "" },
      { text: "◇  Which license do you want to use?" },
      { text: "│  MIT License", tone: "dim" },
      { text: "│" },
      { text: "◇  How do you want to generate the license?" },
      { text: "│  Customize", tone: "dim" },
      { text: "│" },
      { text: "◇  year" },
      { text: "│  2026", tone: "dim" },
      { text: "│" },
      { text: "◇  copyright holders" },
      { text: "│  Erdem Bircan", tone: "dim" },
      { text: "│" },
      { text: "◇  Where do you want to save the wizard config?" },
      { text: "│  .licensewizardrc.json", tone: "dim" },
    ],
  },
  {
    id: "oneshot",
    label: "one-shot",
    command:
      'npx license-wizard --license MIT --set "year=2026" --set "copyright holders=Erdem Bircan" --save-rc',
    output: [
      { text: "" },
      {
        text: "✓ Wrote LICENSE (MIT) and recorded it in the project manifests. Saved config to .licensewizardrc.json.",
        tone: "green",
      },
    ],
  },
  {
    id: "verify",
    label: "verify (CI)",
    command: "npx license-wizard --verify --strict",
    output: [
      { text: "" },
      {
        text: "✓ LICENSE and project manifests are up to date with the saved MIT configuration.",
        tone: "green",
      },
    ],
  },
];

/** Looks up a scene by id, throwing if the id is unknown. */
export function getScene(id: string): TerminalScene {
  const scene = scenes.find((s) => s.id === id);
  if (!scene) {
    throw new Error(`Unknown terminal scene: ${id}`);
  }
  return scene;
}

/** Flattens a scene into plain text (prompt + command + output). */
export function sceneToPlainText(scene: TerminalScene): string {
  const sigil = scene.kind === "agent" ? ">" : "$";
  const lines = [
    `${sigil} ${scene.command}`,
    ...scene.output.map((l) => l.text),
  ];
  return lines.join("\n");
}
