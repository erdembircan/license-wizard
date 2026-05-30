/**
 * Represents the persisted configuration for license-wizard.
 */
export type WizardConfig = {
  licenseId: string;
  tokens?: Record<string, string>;
};
