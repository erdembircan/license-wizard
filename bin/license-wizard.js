#!/usr/bin/env node
import { LicenseWizard } from "../dist/index.js";

const wizard = new LicenseWizard(process.argv.slice(2));
await wizard.run();
