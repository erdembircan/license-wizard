import type { JobOutcome, LogLine, PipelineJob } from "../data/pipeline";

/**
 * Pure state machine behind the animated CI pipeline. It turns the static job
 * definitions into an ordered list of timed, immutable state transforms that the
 * `useCIPipeline` hook schedules with timers. Keeping every transition pure means
 * the whole run — including its final frame — can be asserted without a clock.
 */

export type RunStatus = "queued" | "running" | "success" | "failed" | "skipped";

export interface RuntimeStep {
  name: string;
  status: RunStatus;
  log?: LogLine[];
}

export interface RuntimeJob {
  id: string;
  name: string;
  command: string;
  duration: string;
  outcome: JobOutcome;
  status: RunStatus;
  // Whether the job's step list is shown — passing jobs collapse once done,
  // the failing job stays open so its error log remains visible.
  expanded: boolean;
  steps: RuntimeStep[];
}

export type PipelineState = RuntimeJob[];

export interface Transform {
  // Milliseconds from the start of the run.
  at: number;
  next: (state: PipelineState) => PipelineState;
}

// Pacing constants (ms). Tuned so the three green checks land quickly and the
// verify failure — the point of the whole graphic — arrives without a long wait.
const JOB_LEAD = 150;
const STEP_GAP = 90;
const JOB_GAP = 220;
const SKIP_GAP = 140;

/**
 * Builds the initial frame: every job queued and collapsed, every step queued.
 */
export function initialState(defs: PipelineJob[]): PipelineState {
  return defs.map((job) => ({
    id: job.id,
    name: job.name,
    command: job.command,
    duration: job.duration,
    outcome: job.outcome,
    status: "queued",
    expanded: false,
    steps: job.steps.map((step) => ({
      name: step.name,
      status: "queued",
      log: step.log,
    })),
  }));
}

function patchJob(
  state: PipelineState,
  id: string,
  patch: Partial<RuntimeJob>,
): PipelineState {
  return state.map((job) => (job.id === id ? { ...job, ...patch } : job));
}

function patchStep(
  state: PipelineState,
  id: string,
  index: number,
  status: RunStatus,
): PipelineState {
  return state.map((job) =>
    job.id === id
      ? {
          ...job,
          steps: job.steps.map((step, i) =>
            i === index ? { ...step, status } : step,
          ),
        }
      : job,
  );
}

/**
 * Walks the job definitions into an ordered list of timed transforms: each job
 * starts (spinner, expanded), streams its steps to success, then collapses — and
 * the verify job's last step fails, leaving it open and marking the dependent
 * build job skipped.
 */
export function buildTimeline(defs: PipelineJob[]): {
  transforms: Transform[];
  duration: number;
} {
  const transforms: Transform[] = [];
  const push = (at: number, next: Transform["next"]): void => {
    transforms.push({ at, next });
  };

  let t = 0;
  for (const job of defs) {
    if (job.outcome === "skipped") {
      push(t, (s) => patchJob(s, job.id, { status: "skipped" }));
      t += SKIP_GAP;
      continue;
    }

    push(t, (s) => patchJob(s, job.id, { status: "running", expanded: true }));

    let st = t + JOB_LEAD;
    job.steps.forEach((step, i) => {
      const isLast = i === job.steps.length - 1;
      push(st, (s) => patchStep(s, job.id, i, "running"));
      st += step.runMs;
      const stepStatus: RunStatus =
        job.outcome === "failure" && isLast ? "failed" : "success";
      push(st, (s) => patchStep(s, job.id, i, stepStatus));
      st += STEP_GAP;
    });

    if (job.outcome === "failure") {
      push(st, (s) =>
        patchJob(s, job.id, { status: "failed", expanded: true }),
      );
      t = st + JOB_GAP;
    } else {
      push(st, (s) =>
        patchJob(s, job.id, { status: "success", expanded: false }),
      );
      t = st + JOB_GAP;
    }
  }

  return { transforms, duration: t };
}

/**
 * The settled final frame, used for the reduced-motion path: applies every
 * transform up front so the graphic renders complete and static.
 */
export function finalState(defs: PipelineJob[]): PipelineState {
  const { transforms } = buildTimeline(defs);
  return transforms.reduce((state, tf) => tf.next(state), initialState(defs));
}

export type Phase = "queued" | "running" | "failing";

/**
 * Derives the run's headline status from the live job states.
 */
export function pipelinePhase(state: PipelineState): Phase {
  if (state.some((job) => job.status === "failed")) return "failing";
  if (state.every((job) => job.status === "queued")) return "queued";
  return "running";
}

/**
 * True once no job is still queued or running — the run has come to rest and a
 * replay affordance can be offered.
 */
export function isSettled(state: PipelineState): boolean {
  return state.every(
    (job) => job.status !== "queued" && job.status !== "running",
  );
}
