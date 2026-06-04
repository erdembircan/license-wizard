/**
 * The persisted source-file header preference. Present only when the project
 * opted into headers; its presence is what makes verification check the header
 * surface at all.
 */
export type HeaderConfig = {
  style: "short" | "full";
};

/**
 * Represents the persisted configuration for license-wizard.
 */
export type WizardConfig = {
  licenseId: string;
  tokens?: Record<string, string>;
  headers?: HeaderConfig;
};
