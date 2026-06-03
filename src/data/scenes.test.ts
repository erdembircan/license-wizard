import { describe, it, expect } from "vitest";
import { scenes, getScene, sceneToPlainText } from "./scenes";

describe("terminal scenes", () => {
  it("exposes the three documented modes", () => {
    expect(scenes.map((s) => s.id)).toEqual([
      "interactive",
      "oneshot",
      "verify",
    ]);
  });

  it("gives every scene a command and at least one output line", () => {
    for (const scene of scenes) {
      expect(scene.command.length).toBeGreaterThan(0);
      expect(scene.command).toContain("license-wizard");
      expect(scene.output.length).toBeGreaterThan(0);
    }
  });

  it("uses unique ids so tabs never collide", () => {
    const ids = scenes.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getScene", () => {
  it("returns the matching scene", () => {
    expect(getScene("verify").label).toBe("verify (CI)");
  });

  it("throws on an unknown id", () => {
    expect(() => getScene("nope")).toThrow(/Unknown terminal scene/);
  });
});

describe("sceneToPlainText", () => {
  it("renders the prompt, command, and every output line", () => {
    const text = sceneToPlainText(getScene("oneshot"));
    expect(text.startsWith("$ npx license-wizard --license MIT")).toBe(true);
    expect(text).toContain("Wrote LICENSE (MIT)");
    expect(text.split("\n")).toHaveLength(
      getScene("oneshot").output.length + 1,
    );
  });
});
