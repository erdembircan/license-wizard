import { describe, expect, it } from "vitest";
import { pipelineJobs } from "../data/pipeline";
import {
  buildTimeline,
  finalState,
  initialState,
  isSettled,
  pipelinePhase,
} from "./pipelineEngine";

const byId = (state: ReturnType<typeof initialState>, id: string) =>
  state.find((job) => job.id === id)!;

describe("pipelineEngine", () => {
  it("starts with every job and step queued and collapsed", () => {
    const state = initialState(pipelineJobs);
    expect(state.every((job) => job.status === "queued")).toBe(true);
    expect(state.every((job) => !job.expanded)).toBe(true);
    expect(
      state.flatMap((job) => job.steps).every((s) => s.status === "queued"),
    ).toBe(true);
    expect(pipelinePhase(state)).toBe("queued");
    expect(isSettled(state)).toBe(false);
  });

  it("settles with the checks green, verify failed and open, build skipped", () => {
    const final = finalState(pipelineJobs);

    for (const id of ["lint", "test", "typecheck"]) {
      const job = byId(final, id);
      expect(job.status).toBe("success");
      expect(job.expanded).toBe(false);
      expect(job.steps.every((s) => s.status === "success")).toBe(true);
    }

    const verify = byId(final, "verify");
    expect(verify.status).toBe("failed");
    expect(verify.expanded).toBe(true);
    expect(verify.steps.at(-1)!.status).toBe("failed");

    const build = byId(final, "build");
    expect(build.status).toBe("skipped");

    expect(pipelinePhase(final)).toBe("failing");
    expect(isSettled(final)).toBe(true);
  });

  it("schedules monotonic transforms that reduce to the final state", () => {
    const { transforms, duration } = buildTimeline(pipelineJobs);
    expect(transforms.length).toBeGreaterThan(0);
    expect(duration).toBeGreaterThan(0);

    for (let i = 1; i < transforms.length; i += 1) {
      expect(transforms[i]!.at).toBeGreaterThanOrEqual(transforms[i - 1]!.at);
    }

    const replayed = transforms.reduce(
      (state, tf) => tf.next(state),
      initialState(pipelineJobs),
    );
    expect(replayed).toEqual(finalState(pipelineJobs));
  });

  it("reports a running phase once a job is in progress", () => {
    const { transforms } = buildTimeline(pipelineJobs);
    // Apply just the first transform — the lint job begins running.
    const afterFirst = transforms[0]!.next(initialState(pipelineJobs));
    expect(byId(afterFirst, "lint").status).toBe("running");
    expect(pipelinePhase(afterFirst)).toBe("running");
    expect(isSettled(afterFirst)).toBe(false);
  });
});
