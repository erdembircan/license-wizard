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

  it("the setup scene shows the real Apache-2.0 token + generation output", () => {
    const text = transcript("agent-setup");
    // Apache-2.0 has no fillable fields — quoted from the CLI verbatim.
    expect(text).toContain("has no customizable copyright");
    expect(text).toContain("Conjured your LICENSE (Apache-2.0)");
    expect(text).toContain("Spellbook saved to .licensewizardrc.json");
  });

  it("the self-heal scene shows the drift report, exit code, and reconcile", () => {
    const text = transcript("agent-heal");
    expect(text).toContain("Project is out of sync with your saved MIT");
    expect(text).toContain("exit 1");
    expect(text).toContain("LICENSE and project manifests are up to date");
  });
});
