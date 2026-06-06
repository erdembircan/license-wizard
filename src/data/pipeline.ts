/**
 * The CI section's pipeline data: a faithful miniature of License Wizard's own
 * GitHub Actions run. The job names and commands mirror the real scripts
 * (`pnpm lint`, `pnpm test`, `pnpm typecheck`, `pnpm verify`, `pnpm build`).
 * The checks pass one after another until `verify` catches a drifted LICENSE,
 * fails, and blocks the dependent `build` job.
 */

export type JobOutcome = "success" | "failure" | "skipped";

export type LogTone = "dim" | "green" | "amber" | "red" | "accent";

// A log line is a list of inline segments so a single line can mix tones
// (e.g. an amber SPDX id inside otherwise plain text).
export interface LogSegment {
  text: string;
  tone?: LogTone;
}

export type LogLine = LogSegment[];

export interface PipelineStep {
  // GitHub names the dependency-install + run steps; we keep the real ones.
  name: string;
  // How long the step's spinner shows before it resolves, in milliseconds.
  runMs: number;
  // Present only on the failing step — its expanded run log.
  log?: LogLine[];
}

export interface PipelineJob {
  id: string;
  name: string;
  command: string;
  outcome: JobOutcome;
  // Wall-clock label shown on the right once the job settles.
  duration: string;
  steps: PipelineStep[];
}

export const pipelineMeta = {
  workflow: "CI",
  event: "push",
  branch: "license-wizard:master",
  commit: "2f6e1ab",
  subject: "Adjust the LICENSE copyright line",
};

const setup: PipelineStep[] = [
  { name: "Set up job", runMs: 280 },
  { name: "Install dependencies", runMs: 360 },
];

export const pipelineJobs: PipelineJob[] = [
  {
    id: "lint",
    name: "lint",
    command: "pnpm lint",
    outcome: "success",
    duration: "2s",
    steps: [...setup, { name: "Run pnpm lint", runMs: 540 }],
  },
  {
    id: "test",
    name: "test",
    command: "pnpm test",
    outcome: "success",
    duration: "5s",
    steps: [...setup, { name: "Run pnpm test", runMs: 620 }],
  },
  {
    id: "typecheck",
    name: "typecheck",
    command: "pnpm typecheck",
    outcome: "success",
    duration: "3s",
    steps: [...setup, { name: "Run pnpm typecheck", runMs: 560 }],
  },
  {
    id: "verify",
    name: "verify",
    command: "pnpm verify",
    outcome: "failure",
    duration: "1s",
    steps: [
      ...setup,
      {
        name: "Run pnpm verify",
        runMs: 720,
        log: [
          [{ text: "$ license-wizard --verify --strict", tone: "dim" }],
          [{ text: "" }],
          [
            {
              text: "✗ Project is out of sync with your saved MIT enchantment:",
              tone: "red",
            },
          ],
          [{ text: "  LICENSE " }, { text: "does not match", tone: "amber" }],
          [
            {
              text: "Run license-wizard --verify to reconcile, or update the configuration to match.",
            },
          ],
          [{ text: "" }],
          [{ text: "Error: Process completed with exit code 1.", tone: "red" }],
        ],
      },
    ],
  },
  {
    id: "build",
    name: "build",
    command: "pnpm build",
    outcome: "skipped",
    duration: "Skipped",
    steps: [],
  },
];
