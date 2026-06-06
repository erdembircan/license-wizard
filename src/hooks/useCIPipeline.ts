import { useCallback, useEffect, useRef, useState } from "react";
import { pipelineJobs } from "../data/pipeline";
import {
  buildTimeline,
  finalState,
  initialState,
  isSettled,
  pipelinePhase,
  type PipelineState,
} from "../lib/pipelineEngine";

/**
 * Drives the animated CI pipeline. Holds the live pipeline state, plays the
 * timed transforms once the panel scrolls into view, honours
 * prefers-reduced-motion by jumping straight to the settled frame, and exposes a
 * `replay` callback for the re-run button. Every scheduled timer is tracked and
 * cleared on replay or unmount so nothing leaks under StrictMode's double mount.
 */
export function useCIPipeline(): {
  rootRef: React.RefObject<HTMLDivElement | null>;
  jobs: PipelineState;
  phase: ReturnType<typeof pipelinePhase>;
  settled: boolean;
  replay: () => void;
} {
  const [jobs, setJobs] = useState<PipelineState>(() =>
    initialState(pipelineJobs),
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const started = useRef(false);

  const clearTimers = useCallback((): void => {
    timers.current.forEach((id) => clearTimeout(id));
    timers.current = [];
  }, []);

  const run = useCallback((): void => {
    clearTimers();
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setJobs(finalState(pipelineJobs));
      return;
    }
    setJobs(initialState(pipelineJobs));
    const { transforms } = buildTimeline(pipelineJobs);
    for (const { at, next } of transforms) {
      const id = setTimeout(() => setJobs((prev) => next(prev)), at);
      timers.current.push(id);
    }
  }, [clearTimers]);

  const replay = useCallback((): void => {
    started.current = true;
    run();
  }, [run]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // No observer available (e.g. SSR/old browsers): start on the next tick so
      // the kick-off setState never runs synchronously inside the effect body.
      started.current = true;
      const id = setTimeout(run, 0);
      return () => {
        clearTimeout(id);
        clearTimers();
      };
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            run();
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimers();
    };
  }, [run, clearTimers]);

  return {
    rootRef,
    jobs,
    phase: pipelinePhase(jobs),
    settled: isSettled(jobs),
    replay,
  };
}
