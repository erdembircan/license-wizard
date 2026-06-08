import { describe, expect, it } from "vitest";
import { DEFAULT_DOCS_SECTION, docsHref, parseRoute } from "./route";

describe("parseRoute", () => {
  it("treats an empty hash as the landing page", () => {
    expect(parseRoute("")).toEqual({ name: "landing" });
  });

  it("treats a same-page anchor as the landing page", () => {
    expect(parseRoute("#features")).toEqual({ name: "landing" });
    expect(parseRoute("#top")).toEqual({ name: "landing" });
  });

  it("routes #/docs to the default section", () => {
    expect(parseRoute("#/docs")).toEqual({
      name: "docs",
      section: DEFAULT_DOCS_SECTION,
    });
    expect(parseRoute("#/docs/")).toEqual({
      name: "docs",
      section: DEFAULT_DOCS_SECTION,
    });
  });

  it("routes #/docs/<section> to that section", () => {
    expect(parseRoute("#/docs/headers")).toEqual({
      name: "docs",
      section: "headers",
    });
    expect(parseRoute("#/docs/flags")).toEqual({
      name: "docs",
      section: "flags",
    });
  });

  it("falls back to the default section for an unknown section", () => {
    expect(parseRoute("#/docs/nonsense")).toEqual({
      name: "docs",
      section: DEFAULT_DOCS_SECTION,
    });
  });

  it("ignores a trailing sub-path beyond the section", () => {
    expect(parseRoute("#/docs/verify/strict")).toEqual({
      name: "docs",
      section: "verify",
    });
  });
});

describe("docsHref", () => {
  it("builds a hash href for a section", () => {
    expect(docsHref("getting-started")).toBe("#/docs/getting-started");
  });
});
