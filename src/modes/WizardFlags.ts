/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

/**
 * The resolved CLI flag values shared between {@link LicenseWizard} and the
 * run modes it delegates to. The shape mirrors the flag definitions built in
 * `LicenseWizard.#createFlagParser`; the wizard passes its parsed flags into
 * each mode, so a divergence between this type and the definitions is a compile
 * error at the call site.
 */
export type WizardFlags = {
  help: boolean;
  verify: boolean;
  strict: boolean;
  "apply-config": boolean;
  license: string;
  set: string[];
  "save-rc": boolean;
  "save-npm": boolean;
  "save-composer": boolean;
  "get-tokens": boolean;
  headers: string;
  "headers-ignore": string[];
  "remove-headers": boolean;
  "dry-run": boolean;
};
