import { pipelineMeta } from "../data/pipeline";
import type { LogLine, LogTone } from "../data/pipeline";
import type { RunStatus, RuntimeJob } from "../lib/pipelineEngine";
import { useCIPipeline } from "../hooks/useCIPipeline";

const toneClass: Record<LogTone, string> = {
  dim: "t-dim",
  green: "t-green",
  amber: "t-amber",
  red: "t-red",
  accent: "t-accent",
};

const phaseLabel: Record<"queued" | "running" | "failing", string> = {
  queued: "Queued",
  running: "In progress",
  failing: "Failing",
};

/**
 * The status badge that fronts every job and step: a spinning ring while
 * running, a filled green check or red cross once resolved, a dashed ring for
 * queued work, and a circle-slash for the skipped, blocked job.
 */
function StatusIcon({
  status,
  small = false,
}: {
  status: RunStatus;
  small?: boolean;
}) {
  const cls = small ? "ghp-ico ghp-ico--sm" : "ghp-ico";
  if (status === "running") {
    return (
      <span className={`${cls} ghp-spin`} role="img" aria-label="In progress" />
    );
  }
  if (status === "queued") {
    return (
      <span className={`${cls} ghp-queued`} role="img" aria-label="Queued" />
    );
  }
  if (status === "skipped") {
    return (
      <svg className={cls} viewBox="0 0 16 16" role="img" aria-label="Skipped">
        <circle cx="8" cy="8" r="7" className="ghp-disc-skip" fill="none" />
        <path d="M5 8h6" className="ghp-glyph-skip" />
      </svg>
    );
  }
  const ok = status === "success";
  return (
    <svg
      className={cls}
      viewBox="0 0 16 16"
      role="img"
      aria-label={ok ? "Success" : "Failed"}
    >
      <circle
        cx="8"
        cy="8"
        r="8"
        className={ok ? "ghp-disc-ok" : "ghp-disc-fail"}
      />
      {ok ? (
        <path d="M4.4 8.3l2.3 2.3 4.9-5" className="ghp-glyph" fill="none" />
      ) : (
        <path
          d="M5.3 5.3l5.4 5.4M10.7 5.3l-5.4 5.4"
          className="ghp-glyph"
          fill="none"
        />
      )}
    </svg>
  );
}

/**
 * Renders a single run-log line as its inline, tinted segments.
 */
function LogLineRow({ line }: { line: LogLine }) {
  return (
    <div className="ghp-log-line">
      {line.map((seg, i) => (
        <span key={i} className={seg.tone ? toneClass[seg.tone] : undefined}>
          {seg.text}
        </span>
      ))}
    </div>
  );
}

function jobTimeLabel(job: RuntimeJob): string {
  if (job.status === "success" || job.status === "failed") return job.duration;
  if (job.status === "skipped") return "Skipped";
  return "";
}

/**
 * A job row plus, while expanded, its streaming step list — and, for the failing
 * verify step, the expanded error log that explains why the build is blocked.
 */
function JobRow({ job }: { job: RuntimeJob }) {
  const visibleSteps = job.steps.filter((step) => step.status !== "queued");
  return (
    <li className={`ghp-job ghp-job--${job.status}`}>
      <div className="ghp-job-row">
        <StatusIcon status={job.status} />
        <span className="ghp-job-name">{job.name}</span>
        <span className="ghp-job-cmd">{job.command}</span>
        <span className="ghp-job-time">{jobTimeLabel(job)}</span>
      </div>
      {job.expanded && visibleSteps.length > 0 && (
        <ul className="ghp-steps">
          {visibleSteps.map((step) => (
            <li className="ghp-step" key={step.name}>
              <div className="ghp-step-row">
                <StatusIcon status={step.status} small />
                <span className="ghp-step-name">{step.name}</span>
              </div>
              {step.status === "failed" && step.log && (
                <div className="ghp-log" role="group" aria-label="Run log">
                  {step.log.map((line, i) => (
                    <LogLineRow key={i} line={line} />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * The animated GitHub Actions run for the CI section: a workflow header with a
 * live status pill, the lint / test / typecheck / verify / build jobs streaming
 * to completion, and — once verify fails — an error annotation and a re-run
 * button that replays the whole run.
 */
export default function Pipeline() {
  const { rootRef, jobs, phase, settled, replay } = useCIPipeline();

  return (
    <div ref={rootRef} className="ghp" data-reveal>
      <div className="ghp-head">
        <div className="ghp-head-left">
          <svg className="ghp-mark" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 0a8 8 0 0 0-2.5 15.6c.4.07.55-.17.55-.38v-1.34c-2.2.48-2.67-1.06-2.67-1.06-.36-.92-.88-1.16-.88-1.16-.72-.49.05-.48.05-.48.8.06 1.22.82 1.22.82.71 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.76-.2-3.6-.88-3.6-3.9 0-.86.3-1.57.82-2.12-.08-.2-.36-1 .08-2.1 0 0 .67-.21 2.2.81a7.6 7.6 0 0 1 4 0c1.53-1.02 2.2-.8 2.2-.8.44 1.1.16 1.9.08 2.1.51.55.82 1.26.82 2.11 0 3.03-1.85 3.7-3.61 3.9.29.24.54.72.54 1.46v2.17c0 .21.15.46.55.38A8 8 0 0 0 8 0Z" />
          </svg>
          <span className="ghp-workflow">{pipelineMeta.workflow}</span>
          <span className="ghp-sep">·</span>
          <span className="ghp-trigger">{pipelineMeta.event}</span>
        </div>
        <span className={`ghp-pill ghp-pill--${phase}`}>
          <span className="ghp-pill-dot" />
          {phaseLabel[phase]}
        </span>
      </div>

      <div className="ghp-sub">
        <span className="ghp-commit">{pipelineMeta.commit}</span>
        <span className="ghp-subject">{pipelineMeta.subject}</span>
      </div>

      <ul className="ghp-jobs">
        {jobs.map((job) => (
          <JobRow key={job.id} job={job} />
        ))}
      </ul>

      {phase === "failing" && (
        <div className="ghp-annot" role="status">
          <StatusIcon status="failed" small />
          <span>
            <strong>verify</strong> — license drift detected. The{" "}
            <strong>build</strong> job was skipped because a required job
            failed.
          </span>
        </div>
      )}

      {settled && (
        <div className="ghp-foot">
          <button type="button" className="ghp-replay" onClick={replay}>
            <svg
              viewBox="0 0 16 16"
              aria-hidden="true"
              className="ghp-replay-ico"
            >
              <path
                d="M2.5 8a5.5 5.5 0 1 1 1.6 3.9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M2 12.5V8.5h4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Re-run all jobs
          </button>
        </div>
      )}
    </div>
  );
}
