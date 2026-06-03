export type Tone = "default" | "dim" | "accent" | "green" | "amber" | "red";

export interface TerminalLine {
  text: string;
  tone?: Tone;
}

export interface TerminalScene {
  id: string;
  label: string;
  /** The command typed after the `$` prompt. */
  command: string;
  /** Output rendered line-by-line once the command finishes typing. */
  output: TerminalLine[];
}

/**
 * The three terminal scenes shown in the hero, each a faithful, lightly
 * stylized rendering of a real License Wizard run.
 */
export const scenes: TerminalScene[] = [
  {
    id: "interactive",
    label: "interactive",
    command: "npx license-wizard",
    output: [
      { text: "" },
      { text: "🧙  license-wizard", tone: "accent" },
      { text: "    pick a license, generate a perfect LICENSE", tone: "dim" },
      { text: "" },
      { text: "◇  Which license?", tone: "accent" },
      { text: "│  › MIT — MIT License" },
      { text: "│    Apache-2.0 — Apache License 2.0", tone: "dim" },
      { text: "│    GPL-3.0-or-later — GNU GPL v3.0 or later", tone: "dim" },
      { text: "│" },
      { text: "◇  Use the official text or customize it?", tone: "accent" },
      { text: "│  ● Fill in the copyright fields" },
      { text: "│" },
      { text: "◇  copyright holders › Erdem Bircan" },
      { text: "◇  year › 2026" },
      { text: "│" },
      { text: "◇  Remember this for next time?  Yes", tone: "accent" },
      { text: "│" },
      { text: "◆  Wrote LICENSE (MIT)", tone: "green" },
      { text: '◆  Recorded "MIT" in package.json', tone: "green" },
      { text: "└  Done — your project is licensed. ✨", tone: "accent" },
    ],
  },
  {
    id: "oneshot",
    label: "one-shot",
    command:
      'npx license-wizard --license MIT --set "year=2026" --set "copyright holders=Erdem Bircan"',
    output: [
      { text: "" },
      { text: "🧙  license-wizard · non-interactive", tone: "accent" },
      { text: "" },
      { text: "◆  Wrote LICENSE (MIT)", tone: "green" },
      { text: '◆  Recorded "MIT" in package.json', tone: "green" },
      {
        text: "└  No prompts — built for scripts, CI, and agents.",
        tone: "dim",
      },
    ],
  },
  {
    id: "verify",
    label: "verify (CI)",
    command: "npx license-wizard --verify --strict",
    output: [
      { text: "" },
      { text: "🧙  license-wizard · verify", tone: "accent" },
      { text: "" },
      { text: "◇  LICENSE file ............ in sync", tone: "green" },
      { text: "◇  package.json  license ... in sync", tone: "green" },
      { text: "└  Matches the saved configuration. ✓", tone: "accent" },
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
  const lines = [`$ ${scene.command}`, ...scene.output.map((l) => l.text)];
  return lines.join("\n");
}
