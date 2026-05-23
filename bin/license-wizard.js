#!/usr/bin/env node
import { LicenseWizard } from "../dist/index.js";

new LicenseWizard(process.argv.slice(2));
