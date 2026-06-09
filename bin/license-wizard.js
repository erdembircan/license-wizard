#!/usr/bin/env node
import { LicenseWizard } from "../dist/index.js";

// Ultimate safety net: LicenseWizard.run() reports its own failures as a single
// readable line, but any error escaping it (or thrown while constructing the
// wizard) is reduced to one line here too — never a stack trace and bundled
// source dump — so scripts, agents, and CI get a clean message and exit code.
try {
  const wizard = new LicenseWizard(process.argv.slice(2));
  await wizard.run();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
}
