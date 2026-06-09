import { describe, it, expect } from "vitest";
import { agentScenes } from "./agentScenes";

/** The transcript text of a scene, joined for substring assertions. */
function transcript(id: string): string {
  const scene = agentScenes.find((s) => s.id === id)!;
  return scene.output.map((l) => l.text).join("\n");
}

describe("agent scenes", () => {
  it("are all agent-kind, with a prompt and output, and unique ids", () => {
    expect(agentScenes.length).toBeGreaterThan(0);
    const ids = agentScenes.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const scene of agentScenes) {
      expect(scene.kind).toBe("agent");
      expect(scene.command.length).toBeGreaterThan(0);
      expect(scene.output.length).toBeGreaterThan(0);
    }
  });

  it("drives the real non-interactive flags License Wizard exposes", () => {
    const all = agentScenes
      .flatMap((s) => s.output.map((l) => l.text))
      .join("\n");
    expect(all).toContain("--get-tokens");
    expect(all).toContain("--save-rc");
    expect(all).toContain("--verify --strict");
  });

  it("the setup scene shows Apache-2.0's real fields + generation output", () => {
    const text = transcript("agent-setup");
    // Apache-2.0's two fillable fields, quoted from `--get-tokens` verbatim.
    expect(text).toContain("Apache-2.0 accepts the following copyright");
    expect(text).toContain("yyyy");
    expect(text).toContain("name of copyright owner");
    expect(text).toContain("Conjured your LICENSE (Apache-2.0)");
    expect(text).toContain("Spellbook saved to .licensewizardrc.json");
    expect(text).toContain("Inscribed the Apache-2.0 full header");
  });

  it("the self-heal scene shows the drift report, exit code, and reconcile", () => {
    const text = transcript("agent-heal");
    expect(text).toContain("Project is out of sync with your saved");
    expect(text).toContain("exit 1");
    // The reconcile path prints "Realigned…", not the clean-verify message.
    expect(text).toContain("Realigned the project with your saved");
    expect(text).toContain("package.json license updated to");
  });
});
