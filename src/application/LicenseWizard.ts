/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import type { Answer } from "@cli/Answer.js";
import { BANNER_TAGLINE } from "@cli/Banner.js";
import { ClackRenderer } from "@cli/ClackRenderer.js";
import { CliReporter } from "@cli/CliReporter.js";
import { FlagParser } from "@cli/FlagParser.js";
import type { IReporter } from "@cli/interfaces/IReporter.js";
import { ComposerConfigStore } from "@configuration/ComposerConfigStore.js";
import { ComposerManifest } from "@configuration/ComposerManifest.js";
import { Config } from "@configuration/Config.js";
import { NodeFileSystemReader } from "@configuration/NodeFileSystemReader.js";
import { NodeFileSystemWriter } from "@configuration/NodeFileSystemWriter.js";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IPathResolver } from "@configuration/interfaces/IPathResolver.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import { NpmConfigStore } from "@configuration/NpmConfigStore.js";
import { NpmManifest } from "@configuration/NpmManifest.js";
import { ProjectManifestRepository } from "@configuration/ProjectManifestRepository.js";
import { RcConfigStore } from "@configuration/RcConfigStore.js";
import { HeaderVerifier } from "@headers/HeaderVerifier.js";
import { NodeFileTreeWalker } from "@headers/NodeFileTreeWalker.js";
import { SourceFileScanner } from "@headers/SourceFileScanner.js";
import { LicenseGenerator } from "@licensing/LicenseGenerator.js";
import { LicenseRepository } from "@licensing/LicenseRepository.js";
import { SpdxLicenseSource } from "@licensing/SpdxLicenseSource.js";
import { HeaderApplier } from "./HeaderApplier.js";
import { LicenseInstaller } from "./LicenseInstaller.js";
import { LicenseVerifier } from "./LicenseVerifier.js";
import { InteractiveMode } from "../modes/InteractiveMode.js";
import type { IWizardMode } from "../modes/IWizardMode.js";
import { NonInteractiveMode } from "../modes/NonInteractiveMode.js";
import { VerifyMode } from "../modes/VerifyMode.js";
import type { WizardFlags } from "../modes/WizardFlags.js";
import pkg from "../../package.json" with { type: "json" };

/**
 * Entry point and composition root for the license-wizard CLI application. It
 * parses the CLI flags, wires up the shared application graph, and selects one
 * of the three run modes — interactive, non-interactive, or verify — to which
 * it delegates the actual work. Each mode and its mode-specific collaborators
 * are built lazily, so a given run assembles only what that run needs.
 */
export class LicenseWizard {
  readonly #config: Config;
  readonly #manifests: ProjectManifestRepository;
  readonly #licenseRepository: LicenseRepository;
  readonly #generator: LicenseGenerator;
  readonly #reader: IFileSystemReader & IPathResolver;
  readonly #writer: IFileSystemWriter;
  readonly #reporter: IReporter;
  readonly #args: string[];
  readonly #flags: WizardFlags;
  // Maps each save flag to the target id of the config store it writes to,
  // read back from the store instances so the ids are not duplicated here.
  readonly #saveTargetByFlag: Record<string, string>;

  // The shared services and the three run modes are built lazily (see the
  // getters below) so a run only assembles the collaborators it actually uses —
  // e.g. a `--verify` run never builds the installer or the interactive
  // renderer, and a `--help` run builds nothing beyond the reporter.
  #headerApplierInstance: HeaderApplier | null = null;
  #installerInstance: LicenseInstaller | null = null;
  #interactiveModeInstance: IWizardMode | null = null;
  #nonInteractiveModeInstance: IWizardMode | null = null;
  #verifyModeInstance: IWizardMode | null = null;

  /**
   * Creates a new LicenseWizard instance and parses the provided CLI arguments,
   * assembling the shared (mode-independent) application graph.
   *
   * @param args - The raw argument list (e.g. `process.argv.slice(2)`).
   */
  constructor(args: string[]) {
    this.#args = args;
    this.#flags = this.#parseFlags(args);

    const reader = new NodeFileSystemReader();
    const writer = new NodeFileSystemWriter();
    this.#reader = reader;
    this.#writer = writer;
    const rcConfigStore = new RcConfigStore();
    const npmConfigStore = new NpmConfigStore();
    const composerConfigStore = new ComposerConfigStore();
    this.#saveTargetByFlag = {
      "save-rc": rcConfigStore.id,
      "save-npm": npmConfigStore.id,
      "save-composer": composerConfigStore.id,
    };
    this.#config = new Config(
      [rcConfigStore, npmConfigStore, composerConfigStore],
      reader,
      writer,
    );
    this.#manifests = new ProjectManifestRepository(
      [new ComposerManifest(), new NpmManifest()],
      reader,
      writer,
    );

    const licenseSource = new SpdxLicenseSource();
    this.#licenseRepository = new LicenseRepository(licenseSource);
    this.#generator = new LicenseGenerator(this.#licenseRepository, writer);
    this.#reporter = new CliReporter(pkg.name);
  }

  /**
   * Lazily builds and memoizes the header applier shared by the interactive and
   * non-interactive modes.
   */
  get #headerApplier(): HeaderApplier {
    return (this.#headerApplierInstance ??= new HeaderApplier(
      this.#licenseRepository,
      this.#reader,
      this.#writer,
    ));
  }

  /**
   * Lazily builds and memoizes the license installer shared by the interactive
   * and non-interactive modes.
   */
  get #installer(): LicenseInstaller {
    return (this.#installerInstance ??= new LicenseInstaller(
      this.#config,
      this.#manifests,
      this.#generator,
    ));
  }

  /**
   * Lazily builds and memoizes the interactive mode, assembling its renderer
   * only when the prompt-driven flow is actually taken.
   */
  get #interactiveMode(): IWizardMode {
    if (this.#interactiveModeInstance === null) {
      const renderer = new ClackRenderer({
        name: pkg.name,
        description: BANNER_TAGLINE,
        version: pkg.version,
      });
      this.#interactiveModeInstance = new InteractiveMode(
        this.#licenseRepository,
        this.#config,
        this.#manifests,
        this.#installer,
        this.#generator,
        this.#headerApplier,
        renderer,
        this.#reporter,
        this.#flags,
      );
    }
    return this.#interactiveModeInstance;
  }

  /**
   * Lazily builds and memoizes the non-interactive mode.
   */
  get #nonInteractiveMode(): IWizardMode {
    return (this.#nonInteractiveModeInstance ??= new NonInteractiveMode(
      this.#licenseRepository,
      this.#config,
      this.#manifests,
      this.#installer,
      this.#generator,
      this.#headerApplier,
      this.#reporter,
      this.#flags,
      this.#saveTargetByFlag,
    ));
  }

  /**
   * Lazily builds and memoizes the verify mode, assembling the license and
   * header verifiers only when the `--verify` flow is actually taken.
   */
  get #verifyMode(): IWizardMode {
    if (this.#verifyModeInstance === null) {
      const verifier = new LicenseVerifier(
        this.#config,
        this.#manifests,
        this.#generator,
        this.#reader,
      );
      const headerVerifier = new HeaderVerifier(
        new SourceFileScanner(new NodeFileTreeWalker(), this.#reader),
        this.#reader,
        this.#writer,
        this.#licenseRepository,
      );
      this.#verifyModeInstance = new VerifyMode(
        verifier,
        headerVerifier,
        this.#config,
        this.#reporter,
        this.#flags.strict,
      );
    }
    return this.#verifyModeInstance;
  }

  /**
   * Parses the raw CLI arguments against the supported flag definitions and
   * returns the resolved flag values.
   *
   * @param args - The raw argument list (e.g. `process.argv.slice(2)`).
   */
  #parseFlags(args: string[]): WizardFlags {
    return this.#createFlagParser().parse(args);
  }

  /**
   * Builds the flag parser configured with every supported flag and its help
   * metadata. Shared by argument parsing and the `--help` listing.
   */
  #createFlagParser() {
    return new FlagParser({
      help: {
        type: "boolean",
        default: false,
        description: "Show this help message and exit.",
      },
      version: {
        type: "boolean",
        default: false,
        description: "Print the version number and exit.",
      },
      verify: {
        type: "boolean",
        default: false,
        description:
          "Verify LICENSE and manifest license fields match the saved config, reconciling drift (standalone mode).",
      },
      strict: {
        type: "boolean",
        default: false,
        description:
          "With --verify, fail (exit non-zero) on any drift instead of reconciling it (for CI).",
      },
      "apply-config": {
        type: "boolean",
        default: false,
        description:
          "Generate non-interactively from the project's saved config; errors if none exists. Takes priority over --license, --set, --headers, and --save-*.",
      },
      license: {
        type: "string",
        default: "",
        description: "Select a license by SPDX id (non-interactive).",
        placeholder: "<spdx-id>",
      },
      set: {
        type: "list",
        default: [],
        description: 'Set a copyright field, e.g. "year=2026" (repeatable).',
        placeholder: "<field=value>",
      },
      "save-rc": {
        type: "boolean",
        default: false,
        description: "Save config to .licensewizardrc.json.",
      },
      "save-npm": {
        type: "boolean",
        default: false,
        description: "Save config to package.json (must exist).",
      },
      "save-composer": {
        type: "boolean",
        default: false,
        description: "Save config to composer.json (must exist).",
      },
      "get-tokens": {
        type: "boolean",
        default: false,
        description: "List the license's copyright fields and exit.",
      },
      headers: {
        type: "string",
        default: "",
        description:
          'Also write SPDX license headers into source files: "short" (SPDX tags) or "full" (the license notice).',
        placeholder: "<short|full>",
      },
      "headers-ignore": {
        type: "list",
        default: [],
        description:
          "Extra gitignore-style pattern to skip when writing headers (repeatable).",
        placeholder: "<glob>",
      },
      "force-header": {
        type: "string",
        default: "",
        description:
          "Force the configured header into a single file the safety guard skipped, by path (relative to the working directory; non-interactive; requires headers enabled in config).",
        placeholder: "<path>",
      },
      "remove-headers": {
        type: "boolean",
        default: false,
        description:
          "Remove wizard-written SPDX headers from source files and drop the saved headers preference (standalone; takes priority over --headers).",
      },
      "dry-run": {
        type: "boolean",
        default: false,
        description:
          "Print the license that would be generated and skip every write (LICENSE, config, manifests).",
      },
    });
  }

  /**
   * Reports whether any non-interactive selection flag was supplied. The
   * presence of `--license`, `--set`, `--headers`, `--get-tokens`, or any
   * `--save-*` flag switches the wizard out of the interactive prompt flow and
   * into the non-interactive mode.
   */
  #isNonInteractive(): boolean {
    return (
      this.#flags.license !== "" ||
      this.#flags.set.length > 0 ||
      this.#flags.headers !== "" ||
      this.#flags["get-tokens"] ||
      this.#flags["save-rc"] ||
      this.#flags["save-npm"] ||
      this.#flags["save-composer"]
    );
  }

  /**
   * Selects and runs the matching mode. `--help` prints the usage screen and
   * `--version` prints the version number, each exiting immediately (help takes
   * priority when both are given). Otherwise the flags route to one of the three modes, in priority
   * order: header removal and other flag-driven flows run in the non-interactive
   * mode (`--remove-headers` and `--apply-config` take priority over the
   * selection flags), `--verify` runs the verify mode, and an invocation with no
   * selection flags runs the interactive mode. Returns the answers collected by
   * the interactive mode, or an empty array for the flag-driven modes.
   */
  async run(): Promise<Answer[]> {
    if (this.#flags.help) {
      this.#reporter.usage(this.#createFlagParser().formatHelp());
      return [];
    }

    if (this.#flags.version) {
      this.#reporter.version(pkg.version);
      return [];
    }

    // Reject typo'd or malformed flags before dispatching: an unknown flag must
    // not silently fall through to the interactive prompt, and a value-accepting
    // flag with no value must not crash the run it would otherwise drive.
    const usageErrors = this.#createFlagParser().validate(this.#args);
    if (usageErrors.length > 0) {
      this.#reporter.error(usageErrors[0]);
      process.exitCode = 1;
      return [];
    }

    try {
      return await this.#dispatch();
    } catch (error) {
      // Last line of defense: any failure that the modes did not handle (a
      // network or file-system error) is reported as a single readable line
      // with a non-zero exit code, never as a stack trace and bundle dump.
      this.#reporter.error(this.#describeError(error));
      process.exitCode = 1;
      return [];
    }
  }

  /**
   * Routes the resolved flags to the matching mode, in priority order: header
   * removal and other flag-driven flows run in the non-interactive mode
   * (`--remove-headers` and `--apply-config` take priority over the selection
   * flags), `--verify` runs the verify mode, and an invocation with no selection
   * flags runs the interactive mode.
   */
  #dispatch(): Promise<Answer[]> {
    // --remove-headers is a standalone flow and takes priority over everything
    // else, including --verify: when both are given, the headers are removed.
    if (this.#flags["remove-headers"]) {
      return this.#nonInteractiveMode.run();
    }

    // --verify is a standalone mode: it ignores every selection flag and checks
    // the existing LICENSE against the saved configuration instead.
    if (this.#flags.verify) {
      return this.#verifyMode.run();
    }

    // --apply-config, --force-header, and the selection flags all run
    // non-interactively; --apply-config takes priority over the selection flags
    // it overrides, and --force-header is a standalone single-file override.
    if (
      this.#flags["apply-config"] ||
      this.#flags["force-header"] !== "" ||
      this.#isNonInteractive()
    ) {
      return this.#nonInteractiveMode.run();
    }

    return this.#interactiveMode.run();
  }

  /**
   * Reduces a caught failure to a single readable line for the user. Prefers the
   * error's own message and appends its underlying cause's message when one adds
   * detail (e.g. the network reason behind a license fetch failure).
   *
   * @param error - The value thrown by the failed run.
   */
  #describeError(error: unknown): string {
    if (!(error instanceof Error)) {
      return String(error);
    }
    const cause =
      error.cause instanceof Error ? error.cause.message : undefined;
    return cause && cause !== error.message
      ? `${error.message} (${cause})`
      : error.message;
  }
}
