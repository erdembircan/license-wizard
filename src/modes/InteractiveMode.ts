/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import type { Answer } from "@cli/Answer.js";
import type {
  CompletionHeaders,
  IRenderer,
} from "@cli/interfaces/IRenderer.js";
import type { IReporter } from "@cli/interfaces/IReporter.js";
import { Orchestrator } from "@cli/Orchestrator.js";
import type {
  AutocompleteQuestion,
  ConfirmQuestion,
  Question,
  QuestionLifecycle,
  SelectQuestion,
  TextQuestion,
} from "@cli/Question.js";
import { QuestionRepository } from "@cli/QuestionRepository.js";
import type { Config } from "@configuration/Config.js";
import type { ProjectManifestRepository } from "@configuration/ProjectManifestRepository.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";
import { HeaderRenderer } from "@headers/HeaderRenderer.js";
import type { HeaderComment, HeaderStyle } from "@headers/HeaderPlan.js";
import type { LicenseDetail } from "@licensing/LicenseDetail.js";
import type { LicenseGenerator } from "@licensing/LicenseGenerator.js";
import type { LicenseRepository } from "@licensing/LicenseRepository.js";
import { LicenseCopyright } from "@licensing/LicenseCopyright.js";
import type { TemplateSlot } from "@licensing/TemplateSlot.js";
import type {
  HeaderApplier,
  HeaderApplyReport,
} from "@application/HeaderApplier.js";
import type {
  ConfigSave,
  LicenseSelection,
  LicenseInstaller,
} from "@application/LicenseInstaller.js";
import type { IWizardMode } from "./IWizardMode.js";
import type { WizardFlags } from "./WizardFlags.js";

const GENERATION_MODE_ID = "generationMode";
const SAVE_CONFIG_ID = "saveConfig";
const HEADERS_ENABLE_ID = "addHeaders";
const HEADERS_STYLE_ID = "headerStyle";
const MODE_ID = "mode";
const MODE_SETUP = "setup";
const MODE_REMOVE = "remove";
const REMOVE_HEADERS_ID = "removeHeaders";
const SKIP_SAVE = "skip";

/**
 * The interactive run mode: the prompt-driven wizard that runs when no
 * selection flags are given. It builds the ordered setup questions
 * (license → headers → save), drives them through the orchestrator, and applies
 * the resulting selection through the installer — or previews it under
 * `--dry-run`. When the saved configuration already opts into headers it opens
 * with a setup/remove choice, short-circuiting to header removal when chosen.
 */
export class InteractiveMode implements IWizardMode {
  readonly #licenses: LicenseRepository;
  readonly #config: Config;
  readonly #manifests: ProjectManifestRepository;
  readonly #installer: LicenseInstaller;
  readonly #generator: LicenseGenerator;
  readonly #headers: HeaderApplier;
  readonly #renderer: IRenderer;
  readonly #reporter: IReporter;
  readonly #flags: WizardFlags;
  // The detail of the license chosen in the flow, captured when the license is
  // answered so the later header questions can decide whether the `full` style
  // is available without fetching it again.
  #interactiveHeaderDetail: LicenseDetail | null = null;
  // The copyright slot values entered during customization, accumulated as each
  // slot is answered. Read when the header questions decide whether a `full`
  // header could actually be filled with what the user provided.
  #interactiveTokens: Record<string, string> = {};

  /**
   * Creates a new InteractiveMode.
   *
   * @param licenses - Searches licenses and resolves the chosen one's detail.
   * @param config - Reads the saved config and the available save targets.
   * @param manifests - Reads the project's declared license and reports them.
   * @param installer - Applies the resolved selection to the project.
   * @param generator - Renders the license text for dry-run previews.
   * @param headers - Writes, previews, and strips source-file headers.
   * @param renderer - Renders questions and the closing completion summary.
   * @param reporter - Renders the dry-run previews.
   * @param flags - The resolved CLI flags driving the run.
   */
  constructor(
    licenses: LicenseRepository,
    config: Config,
    manifests: ProjectManifestRepository,
    installer: LicenseInstaller,
    generator: LicenseGenerator,
    headers: HeaderApplier,
    renderer: IRenderer,
    reporter: IReporter,
    flags: WizardFlags,
  ) {
    this.#licenses = licenses;
    this.#config = config;
    this.#manifests = manifests;
    this.#installer = installer;
    this.#generator = generator;
    this.#headers = headers;
    this.#renderer = renderer;
    this.#reporter = reporter;
    this.#flags = flags;
  }

  /**
   * Runs the interactive wizard: optionally opens with a setup/remove choice,
   * collects the setup answers, then installs the selection — or previews it
   * under `--dry-run`. Returns the collected answers.
   */
  async run(): Promise<Answer[]> {
    const config = await this.#config.read();

    // Adaptive opening: when the project already opted into headers, ask up front
    // whether to set up a license or remove the headers. Removal is rendered on
    // its own and short-circuits the license setup flow entirely.
    if (config?.headers) {
      const mode = await this.#renderer.render(this.#buildModeQuestion());
      if (mode.value === MODE_REMOVE) {
        const confirmed = await this.#renderer.render(
          this.#buildRemoveHeadersQuestion(),
        );
        if (confirmed.value === true) {
          await this.#removeHeaders();
        }
        return [mode, confirmed];
      }
    }

    const questions = await this.#buildSetupQuestions(config);
    const repository = new QuestionRepository(questions);
    const orchestrator = new Orchestrator(repository, this.#renderer);

    const answers = await orchestrator.run();

    const licenseAnswer = answers.find((a) => a.questionId === "license");
    const saveConfigAnswer = answers.find(
      (a) => a.questionId === SAVE_CONFIG_ID,
    );
    const headersAnswer = answers.find(
      (a) => a.questionId === HEADERS_ENABLE_ID,
    );

    if (typeof licenseAnswer?.value === "string") {
      const tokens = this.#slotValuesFrom(licenseAnswer.fields);
      const headerStyle = this.#headerStyleFrom(headersAnswer);
      const headerComment = this.#headerComment();
      const extraIgnores = this.#flags["headers-ignore"];
      const selection: LicenseSelection = {
        licenseId: licenseAnswer.value,
        tokens,
        save: this.#saveFrom(saveConfigAnswer),
        // Persist the comment delimiter (only when non-default) and the ignore
        // scope alongside the style so verification reproduces the same block
        // and re-scans the same files this run headed.
        headers: headerStyle
          ? {
              style: headerStyle,
              ...(headerComment !== "block" ? { comment: headerComment } : {}),
              ...(extraIgnores.length > 0 ? { ignore: extraIgnores } : {}),
            }
          : undefined,
      };

      if (this.#flags["dry-run"]) {
        await this.#preview(selection);
        if (headerStyle) {
          await this.#previewHeaders(
            selection.licenseId,
            headerStyle,
            headerComment,
            tokens,
          );
        }
      } else {
        await this.#installer.install(selection);
        const headers = headerStyle
          ? this.#toCompletionHeaders(
              await this.#headers.apply(
                selection.licenseId,
                headerStyle,
                headerComment,
                tokens,
                this.#flags["headers-ignore"],
              ),
            )
          : undefined;
        await this.#reportCompletion(selection, headers);
      }
    }

    return answers;
  }

  /**
   * Builds the ordered license-setup questions (license → headers → save),
   * pre-populating defaults from the saved config and project manifest.
   *
   * @param config - The saved configuration, used for license/token defaults.
   */
  async #buildSetupQuestions(config: WizardConfig | null): Promise<Question[]> {
    const projectLicense = await this.#manifests.readLicense();

    const licenseQuestion: AutocompleteQuestion = {
      id: "license",
      text: "Which license do you want to use?",
      type: "autocomplete",
      // A license must be chosen: an empty submission would otherwise sail
      // through every later question and exit having written nothing at all.
      required: true,
      defaultValue: this.#flags.license || projectLicense || config?.licenseId,
      search: async (query) => {
        const results = await this.#licenses.search(query);
        return results.map((entry) => ({
          value: entry.licenseId,
          label: entry.name,
          hint: entry.licenseId,
        }));
      },
      onAnswer: (answer, lifecycle) =>
        this.#offerCustomization(answer, lifecycle, config?.tokens),
    };

    const headersQuestion = this.#buildHeadersQuestion();
    const saveConfigQuestion = await this.#buildSaveConfigQuestion();

    return [licenseQuestion, headersQuestion, saveConfigQuestion];
  }

  /**
   * Builds the opening mode prompt, shown only when the saved config carries a
   * headers preference. Its answer routes {@link run} to either the license
   * setup flow or the header-removal path.
   */
  #buildModeQuestion(): SelectQuestion {
    return {
      id: MODE_ID,
      text: "What would you like to do?",
      type: "select",
      defaultValue: MODE_SETUP,
      options: [
        {
          value: MODE_SETUP,
          label: "Set up a license",
          hint: "choose a license, optionally add headers",
        },
        {
          value: MODE_REMOVE,
          label: "Remove license headers",
          hint: "delete the wizard-written headers from your files",
        },
      ],
    };
  }

  /**
   * Builds the removal confirmation shown after the "remove license headers"
   * mode is chosen. Its answer decides whether {@link run} strips the headers.
   */
  #buildRemoveHeadersQuestion(): ConfirmQuestion {
    return {
      id: REMOVE_HEADERS_ID,
      text: "Remove the wizard-written license headers from your source files?",
      type: "confirm",
      defaultValue: true,
    };
  }

  /**
   * Builds the top-level "add headers?" prompt. Answering yes injects a
   * short/full style choice, but only when the chosen license publishes a
   * standard header *and* that `full` notice could actually be filled with the
   * copyright the user provided — otherwise `full` would stamp literal
   * placeholders (the GPL family exposes no copyright fields at all; an
   * uncustomized Apache-2.0 leaves `[yyyy]` unfilled), so only the always-safe
   * `short` style applies and no further question is needed. The license's
   * support and the entered copyright are both read from state captured while
   * the license question ran, which completes before this one.
   */
  #buildHeadersQuestion(): ConfirmQuestion {
    return {
      id: HEADERS_ENABLE_ID,
      text: "Add SPDX license headers to your source files?",
      type: "confirm",
      defaultValue: false,
      onAnswer: (answer, lifecycle) => {
        const detail = this.#interactiveHeaderDetail;
        const fullIsFillable =
          detail !== null &&
          HeaderRenderer.supportsFull(detail) &&
          !HeaderRenderer.fullHeaderHasUnfilledPlaceholders(
            detail,
            this.#interactiveTokens,
          );
        if (answer.value === true && fullIsFillable) {
          lifecycle.inject([this.#buildHeaderStyleQuestion()]);
        }
      },
    };
  }

  /**
   * Builds the short/full header-style choice, offered only for licenses that
   * publish a standard header (so `full` is a real option). The copyright fields
   * are not asked again here — the header reuses whatever was chosen for the
   * license text.
   */
  #buildHeaderStyleQuestion(): SelectQuestion {
    return {
      id: HEADERS_STYLE_ID,
      text: "Which header style do you want in each file?",
      type: "select",
      defaultValue: "short",
      options: [
        {
          value: "short",
          label: "Short",
          hint: "SPDX-License-Identifier tag lines",
        },
        {
          value: "full",
          label: "Full",
          hint: "the complete license notice",
        },
      ],
    };
  }

  /**
   * Builds the save-location picker. Offers every store currently eligible as a
   * target — the `.licensewizardrc.json` dot-file is always present, and each
   * project manifest appears only when its file exists — plus a "skip" option.
   * Choosing a target later writes the config there and clears it everywhere
   * else; choosing "skip" saves nowhere and clears the config from every
   * location.
   */
  async #buildSaveConfigQuestion(): Promise<SelectQuestion> {
    const targets = await this.#config.targets();

    return {
      id: SAVE_CONFIG_ID,
      text: "Where do you want to save the wizard config?",
      type: "select",
      defaultValue: targets[0]?.id ?? SKIP_SAVE,
      options: [
        ...targets.map((target) => ({
          value: target.id,
          label: target.label,
        })),
        {
          value: SKIP_SAVE,
          label: "Skip",
          hint: "save nowhere, clear any existing",
        },
      ],
    };
  }

  /**
   * After a license is chosen, fetches its SPDX template and — only when the
   * license has customizable copyright slots — injects a Standard/Customize
   * question. Licenses with no slots skip the choice entirely and are written
   * as their standard text.
   *
   * @param savedTokens - Previously saved token values, keyed by slot token,
   *   used to pre-fill the copyright slot questions' defaults.
   */
  async #offerCustomization(
    answer: Answer,
    lifecycle: QuestionLifecycle,
    savedTokens?: Record<string, string>,
  ): Promise<void> {
    // Reset any customization captured for a previously considered license so a
    // re-answer never carries stale copyright values into the header decision.
    this.#interactiveTokens = {};

    if (typeof answer.value !== "string" || answer.value === "") {
      this.#interactiveHeaderDetail = null;
      return;
    }

    const detail = await this.#licenses.getLicense(answer.value);
    // Remember the detail so the later header-style question can tell whether
    // this license supports a `full` header without fetching it again.
    this.#interactiveHeaderDetail = detail;
    // Discover the copyright fields from the body *and* the header notice: a
    // license such as the GPL family has none in its body but has them in its
    // header, and those must still be offered so a full header can be filled.
    const slots = LicenseCopyright.fromDetail(detail).slots();

    if (slots.length === 0) {
      return;
    }

    lifecycle.inject([this.#buildGenerationModeQuestion(slots, savedTokens)]);
  }

  /**
   * Builds the Standard/Customize select. Choosing "customize" injects one text
   * question per copyright slot, labeled by the slot's placeholder text and
   * pre-filled with any previously saved value for that token.
   *
   * @param savedTokens - Previously saved token values, keyed by slot token.
   */
  #buildGenerationModeQuestion(
    slots: TemplateSlot[],
    savedTokens?: Record<string, string>,
  ): SelectQuestion {
    const slotQuestions: TextQuestion[] = slots.map((slot) => ({
      id: slot.token,
      text: slot.label,
      type: "text",
      // Customizing means filling the copyright: a blank value would otherwise
      // be written as an empty copyright line (e.g. `Copyright (c)  holders`),
      // the very state the non-interactive path rejects as a missing field.
      required: true,
      defaultValue: savedTokens?.[slot.token],
      onAnswer: (slotAnswer) => {
        if (typeof slotAnswer.value === "string") {
          this.#interactiveTokens[slot.token] = slotAnswer.value;
        }
      },
    }));

    return {
      id: GENERATION_MODE_ID,
      text: "How do you want to generate the license?",
      type: "select",
      defaultValue: "standard",
      options: [
        {
          value: "standard",
          label: "Standard",
          hint: "official text, unchanged",
        },
        {
          value: "customize",
          label: "Customize",
          hint: "fill in the copyright",
        },
      ],
      onAnswer: (modeAnswer, modeLifecycle) => {
        if (modeAnswer.value === "customize") {
          modeLifecycle.inject(slotQuestions);
        }
      },
    };
  }

  /**
   * Strips wizard-written headers from every source file and drops the saved
   * headers preference. Honors `--headers-ignore` for scope and `--dry-run`,
   * which lists the files that would be cleared without touching them.
   */
  async #removeHeaders(): Promise<void> {
    const extraIgnores = this.#flags["headers-ignore"];

    if (this.#flags["dry-run"]) {
      const report = await this.#headers.previewRemoval(extraIgnores);
      this.#reporter.headersRemoveDryRun(report);
      return;
    }

    const report = await this.#headers.remove(extraIgnores);
    this.#reporter.headersRemoved(report);
    await this.#config.clearHeaders();
  }

  /**
   * Renders the selection's license and reports what a real run would have
   * written, without performing any write.
   *
   * @param selection - The resolved license, copyright tokens, and save instruction.
   */
  async #preview(selection: LicenseSelection): Promise<void> {
    const content = await this.#generator.render(
      selection.licenseId,
      selection.tokens,
    );
    const manifests = (await this.#manifests.declaredLicenses()).map(
      (manifest) => manifest.name,
    );

    this.#reporter.dryRun({
      licenseId: selection.licenseId,
      content,
      save: selection.save,
      manifests,
    });
  }

  /**
   * Previews the header that would be written and the files it would touch,
   * writing nothing.
   *
   * @param licenseId - The SPDX identifier whose header would be written.
   * @param style - The header style (`short` or `full`).
   * @param comment - The comment delimiter (`block` or `docblock`).
   * @param tokens - Copyright tokens inherited from the license customization.
   */
  async #previewHeaders(
    licenseId: string,
    style: HeaderStyle,
    comment: HeaderComment,
    tokens: Record<string, string>,
  ): Promise<void> {
    const preview = await this.#headers.preview(
      licenseId,
      style,
      comment,
      tokens,
      this.#flags["headers-ignore"],
    );

    if (preview === null) {
      this.#reporter.headersNoFiles(licenseId);
      return;
    }

    this.#reporter.headersDryRun({
      licenseId,
      style,
      files: preview.files,
      skipped: preview.skipped,
      sample: preview.sample,
    });
  }

  /**
   * Resolves the chosen header style from the interactive answers: undefined
   * when headers were declined, otherwise the selected style — defaulting to
   * `short` when no style sub-question was asked (the license had no `full`
   * option).
   */
  #headerStyleFrom(headersAnswer: Answer | undefined): HeaderStyle | undefined {
    if (headersAnswer?.value !== true) {
      return undefined;
    }
    const style = headersAnswer.fields?.[HEADERS_STYLE_ID];
    return style === "full" ? "full" : "short";
  }

  /**
   * Resolves the comment delimiter for written headers from the
   * `--headers-comment` flag — an advanced knob honored in the interactive flow
   * just as `--headers-ignore` is, rather than asked as a prompt. Defaults to
   * `block`; only an explicit `docblock` switches the style. (The non-interactive
   * path validates the flag value; here an unrecognised value simply keeps the
   * default.)
   */
  #headerComment(): HeaderComment {
    return this.#flags["headers-comment"].trim().toLowerCase() === "docblock"
      ? "docblock"
      : "block";
  }

  /**
   * Adapts a header apply report into the completion-summary shape.
   */
  #toCompletionHeaders(report: HeaderApplyReport): CompletionHeaders {
    return {
      style: report.style,
      written: report.written,
      total: report.total,
      skipped: report.skipped,
    };
  }

  /**
   * Hands the renderer a summary of the install so it can show the closing
   * confirmation: which license was conjured (and whether its copyright was
   * customized), the present manifests it was recorded in, how its header was
   * applied, and where the configuration was saved.
   *
   * @param selection - The resolved license, copyright tokens, and save instruction.
   * @param headers - The header outcome, when headers were written.
   */
  async #reportCompletion(
    selection: LicenseSelection,
    headers: CompletionHeaders | undefined,
  ): Promise<void> {
    const manifests = (await this.#manifests.declaredLicenses()).map(
      (manifest) => manifest.name,
    );

    this.#renderer.complete({
      licenseId: selection.licenseId,
      customized: Object.keys(selection.tokens).length > 0,
      savedTo: selection.save.action === "save" ? selection.save.target : "",
      manifests,
      headers,
    });
  }

  /**
   * Translates the save-location answer into a config save instruction:
   * "skip" clears every location, a chosen target writes there (clearing the
   * rest), and an unanswered question leaves the configuration untouched.
   */
  #saveFrom(saveConfigAnswer: Answer | undefined): ConfigSave {
    if (typeof saveConfigAnswer?.value !== "string") {
      return { action: "none" };
    }
    if (saveConfigAnswer.value === SKIP_SAVE) {
      return { action: "clear" };
    }
    return { action: "save", target: saveConfigAnswer.value };
  }

  /**
   * Extracts the copyright slot values from a license answer's collected fields,
   * dropping the generation-mode marker and any non-string entries. Returns an
   * empty map when no customization fields were collected (the standard path).
   */
  #slotValuesFrom(
    fields: Answer["fields"] | undefined,
  ): Record<string, string> {
    const slotValues: Record<string, string> = {};

    if (!fields) {
      return slotValues;
    }

    for (const [key, value] of Object.entries(fields)) {
      if (key !== GENERATION_MODE_ID && typeof value === "string") {
        slotValues[key] = value;
      }
    }

    return slotValues;
  }
}
