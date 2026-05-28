import { describe, it, expect } from "vitest";
import type { WizardConfig } from "@configuration/WizardConfig.js";
import { resolveDefaultLicenseId } from "./LicenseWizard.js";

describe("resolveDefaultLicenseId", () => {
  it("uses the flag value over the config value when both are set", () => {
    const config: WizardConfig = { licenseId: "Apache-2.0" };

    expect(resolveDefaultLicenseId("MIT", config)).toBe("MIT");
  });

  it("uses the flag value when no config exists", () => {
    expect(resolveDefaultLicenseId("MIT", null)).toBe("MIT");
  });

  it("falls back to the config value when the flag is empty", () => {
    const config: WizardConfig = { licenseId: "Apache-2.0" };

    expect(resolveDefaultLicenseId("", config)).toBe("Apache-2.0");
  });

  it("returns undefined when neither the flag nor a config value is set", () => {
    expect(resolveDefaultLicenseId("", null)).toBeUndefined();
  });
});
