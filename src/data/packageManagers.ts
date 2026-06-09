// The package managers offered on the hero install widget.
export type PackageManagerId = "npm" | "pnpm" | "yarn" | "bun";

export interface PackageManager {
  id: PackageManagerId;
  /** Tab label, matching how the tool brands itself. */
  label: string;
  /** The one-off "run it now" command, no global install required. */
  command: string;
}

/**
 * Each entry is the ephemeral runner for that package manager — the
 * `npx`/`dlx`/`bunx` equivalent — so a visitor can copy and run without
 * installing anything first.
 */
export const PACKAGE_MANAGERS: PackageManager[] = [
  { id: "npm", label: "npm", command: "npx license-wizard" },
  { id: "pnpm", label: "pnpm", command: "pnpm dlx license-wizard" },
  { id: "yarn", label: "yarn", command: "yarn dlx license-wizard" },
  { id: "bun", label: "bun", command: "bunx license-wizard" },
];
