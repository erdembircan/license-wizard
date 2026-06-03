import { describe, it, expect } from "vitest";
import { scenes, getScene, sceneToPlainText } from "./scenes";

describe("terminal scenes", () => {
  it("exposes the four modes with the agent scene second", () => {
    expect(scenes.map((s) => s.id)).toEqual([
      "interactive",
      "agent",
      "oneshot",
      "verify",
    ]);
  });

  it("gives every scene a command and at least one output line", () => {
    for (const scene of scenes) {
      expect(scene.command.length).toBeGreaterThan(0);
      expect(scene.output.length).toBeGreaterThan(0);
    }
  });

  it("types a license-wizard command in every shell scene", () => {
    for (const scene of scenes.filter((s) => s.kind !== "agent")) {
      expect(scene.command).toContain("license-wizard");
    }
  });

  it("uses unique ids so tabs never collide", () => {
    const ids = scenes.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("puts interactive prompt answers on their own line, not crammed with the question", () => {
    const interactive = getScene("interactive");
    const questionLines = interactive.output.filter((l) =>
      l.text.startsWith("◇"),
    );
    // A question line never carries its answer inline (no "› value" suffix).
    for (const line of questionLines) {
      expect(line.text).not.toContain("›");
    }
    // Every question is followed by a connector line holding the answer.
    expect(interactive.output.some((l) => l.text === "│  MIT License")).toBe(
      true,
    );
  });
});

describe("getScene", () => {
  it("returns the matching scene", () => {
    expect(getScene("agent").kind).toBe("agent");
  });

  it("throws on an unknown id", () => {
    expect(() => getScene("nope")).toThrow(/Unknown terminal scene/);
  });
});

describe("sceneToPlainText", () => {
  it("prefixes shell scenes with $ and agent scenes with >", () => {
    expect(sceneToPlainText(getScene("oneshot")).startsWith("$ ")).toBe(true);
    expect(sceneToPlainText(getScene("agent")).startsWith("> ")).toBe(true);
  });

  it("renders the command and every output line", () => {
    const text = sceneToPlainText(getScene("verify"));
    expect(text).toContain("--verify --strict");
    expect(text.split("\n")).toHaveLength(getScene("verify").output.length + 1);
  });
});
