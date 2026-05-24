import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  text: vi.fn(),
  cancel: vi.fn(),
  isCancel: vi.fn(),
}));

const clack = await import("@clack/prompts");
const { LicenseWizard } = await import("./index.js");

describe("LicenseWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  describe("run", () => {
    it("returns an answer for the License question", async () => {
      vi.mocked(clack.text).mockResolvedValue("MIT");
      vi.mocked(clack.isCancel).mockReturnValue(false);

      const wizard = new LicenseWizard([]);
      const answers = await wizard.run();

      expect(answers).toEqual([{ questionId: "license", value: "MIT" }]);
    });

    it("prompts with the License question text", async () => {
      vi.mocked(clack.text).mockResolvedValue("Apache-2.0");
      vi.mocked(clack.isCancel).mockReturnValue(false);

      const wizard = new LicenseWizard([]);
      await wizard.run();

      expect(clack.text).toHaveBeenCalledWith({ message: "License?" });
    });
  });
});
