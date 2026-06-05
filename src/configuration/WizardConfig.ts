import type { HeaderStyle } from "@headers/HeaderPlan.js";

/**
 * The persisted source-file header preference. Present only when the project
 * opted into headers; its presence is what makes verification check the header
 * surface at all.
 */
export type HeaderConfig = {
  style: HeaderStyle;
};

/**
 * Represents the persisted configuration for license-wizard.
 */
export type WizardConfig = {
  licenseId: string;
  tokens?: Record<string, string>;
  headers?: HeaderConfig;
};
