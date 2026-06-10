import type { LicenseDetail } from "@licensing/LicenseDetail.js";
import { HeaderTemplate } from "@headers/HeaderTemplate.js";
import type { HeaderPlan } from "@headers/HeaderPlan.js";

/**
 * Renders the body text of a license header — the notice or tag lines that go
 * inside the comment, before any language-specific comment wrapping. It is the
 * header counterpart to {@link LicenseGenerator} for the `LICENSE` file, and
 * mirrors how that path chooses between a license's template and its plain text:
 * a customized selection renders the SPDX header template with the copyright
 * tokens substituted, while a standard selection uses the plain standard header
 * unchanged.
 */
export class HeaderRenderer {
  readonly #plan: HeaderPlan;

  /**
   * Creates a new HeaderRenderer for the given selection.
   *
   * @param plan - The license detail, header style, and copyright tokens.
   */
  constructor(plan: HeaderPlan) {
    this.#plan = plan;
  }

  /**
   * Reports whether a license can produce a `full` header — that is, whether it
   * publishes a non-empty standard header notice. Licenses without one (MIT,
   * BSD, ISC, and others) support only the `short` SPDX-tag style.
   *
   * @param detail - The license detail to inspect.
   */
  static supportsFull(detail: LicenseDetail): boolean {
    return (
      typeof detail.standardLicenseHeader === "string" &&
      detail.standardLicenseHeader.trim() !== ""
    );
  }

  /**
   * Reports whether rendering this license's `full` header notice with the given
   * copyright tokens would leave one of the header's own placeholder tokens
   * unsubstituted — the signal that the notice cannot be completed and would ship
   * a literal `<year>` / `[name of copyright owner]` into every file. A license
   * whose header carries no placeholders (or none the wizard discovers) is always
   * fillable; one whose placeholders survive the render with the supplied tokens
   * is not. Both run modes consult this so the interactive and flag-driven paths
   * guard the `full` style identically.
   *
   * @param detail - The license detail whose standard header is inspected.
   * @param tokens - The copyright tokens that would fill the header, keyed by token.
   */
  static fullHeaderHasUnfilledPlaceholders(
    detail: LicenseDetail,
    tokens: Record<string, string>,
  ): boolean {
    if (!detail.standardLicenseHeaderTemplate) {
      return false;
    }
    const headerSlots = new HeaderTemplate(
      detail.standardLicenseHeaderTemplate,
    ).slots();
    if (headerSlots.length === 0) {
      return false;
    }
    const body = new HeaderRenderer({ detail, style: "full", tokens }).body();
    return headerSlots.some((slot) => body.includes(slot.token));
  }

  /**
   * Renders the header body for the plan's style: the SPDX tag lines for
   * `short`, or the standard header notice (template-substituted when the
   * selection was customized) for `full`. Returns the text with no surrounding
   * blank lines and no trailing whitespace, ready to be wrapped in comments.
   */
  body(): string {
    return this.#plan.style === "short" ? this.#shortBody() : this.#fullBody();
  }

  /**
   * Builds the `short` body: the SPDX license-identifier tag, plus an
   * SPDX-FileCopyrightText tag when copyright token values are available to fill
   * it. With no tokens (a standard selection) only the identifier line is
   * emitted, which is valid for every license.
   */
  #shortBody(): string {
    const lines = [`SPDX-License-Identifier: ${this.#plan.detail.licenseId}`];
    const copyright = this.#copyrightText();
    if (copyright !== "") {
      lines.push(`SPDX-FileCopyrightText: ${copyright}`);
    }
    return lines.join("\n");
  }

  /**
   * Builds the `full` body from the license's standard header. When the
   * selection supplied copyright tokens and the license ships a header template,
   * the template is rendered with those tokens; otherwise the plain standard
   * header is used unchanged. The result is trimmed of surrounding blank lines.
   */
  #fullBody(): string {
    const { detail, tokens } = this.#plan;
    const source =
      Object.keys(tokens).length > 0 && detail.standardLicenseHeaderTemplate
        ? new HeaderTemplate(detail.standardLicenseHeaderTemplate).render(
            tokens,
          )
        : (detail.standardLicenseHeader ?? "");
    return this.#trimBlankEdges(source);
  }

  /**
   * Joins the supplied copyright token values, in the order they were collected,
   * into a single copyright string (e.g. `2026 Erdem Bircan`). Returns the empty
   * string when no tokens were supplied.
   */
  #copyrightText(): string {
    return Object.values(this.#plan.tokens)
      .map((value) => value.trim())
      .filter((value) => value !== "")
      .join(" ");
  }

  /**
   * Strips trailing whitespace from every line and removes blank lines from the
   * start and end, so the rendered body sits cleanly inside a comment block.
   */
  #trimBlankEdges(text: string): string {
    const lines = text.split("\n").map((line) => line.replace(/\s+$/, ""));
    while (lines.length > 0 && lines[0] === "") {
      lines.shift();
    }
    while (lines.length > 0 && lines[lines.length - 1] === "") {
      lines.pop();
    }
    return lines.join("\n");
  }
}
