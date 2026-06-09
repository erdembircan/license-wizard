import { MessageReporter } from "@cli/MessageReporter.js";
import { ReportPresenter } from "@cli/ReportPresenter.js";
import { StreamSink } from "@cli/StreamSink.js";

type OutputStream = {
  write(chunk: string): boolean;
  isTTY?: boolean;
};

/**
 * The terminal reporter: a `MessageReporter` wired to render its view-model
 * messages to the console. It builds each message through the inherited reporter
 * methods and hands it to a `StreamSink`, which paints it with a
 * `ReportPresenter` and writes it to stdout/stderr. This is the production
 * wiring; tests build a `MessageReporter` over a `RecordingSink` instead to
 * assert against the messages directly.
 */
export class CliReporter extends MessageReporter {
  /**
   * Creates a new CliReporter.
   *
   * @param programName - The program name shown in usage and examples.
   * @param out - The stream for informational output; defaults to stdout.
   * @param err - The stream for error output; defaults to stderr.
   */
  constructor(
    programName: string,
    out: OutputStream = process.stdout,
    err: OutputStream = process.stderr,
  ) {
    super(new StreamSink(new ReportPresenter(programName), out, err));
  }
}
