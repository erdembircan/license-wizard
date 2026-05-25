import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SpdxLicenseSource } from "./SpdxLicenseSource.js";

const mockIndex = {
  licenses: [
    {
      licenseId: "MIT",
      name: "MIT License",
      detailsUrl: "https://spdx.org/licenses/MIT.json",
      isDeprecatedLicenseId: false,
    },
    {
      licenseId: "Apache-2.0",
      name: "Apache License 2.0",
      detailsUrl: "https://spdx.org/licenses/Apache-2.0.json",
      isDeprecatedLicenseId: false,
    },
    {
      licenseId: "GPL-2.0-only",
      name: "GNU General Public License v2.0 only",
      detailsUrl: "https://spdx.org/licenses/GPL-2.0-only.json",
      isDeprecatedLicenseId: false,
    },
    {
      licenseId: "GPL-2.0",
      name: "GNU General Public License v2.0",
      detailsUrl: "https://spdx.org/licenses/GPL-2.0.json",
      isDeprecatedLicenseId: true,
    },
  ],
};

const mockMitDetail = {
  licenseId: "MIT",
  name: "MIT License",
  licenseText: "MIT License\n\nCopyright (c) <year> <author>",
};

const makeFetch = (responses: Record<string, unknown>) =>
  vi.fn(async (url: string) => {
    const body = responses[url];
    if (body === undefined) {
      return { ok: false, status: 404, statusText: "Not Found" };
    }
    return {
      ok: true,
      json: async () => body,
    };
  }) as unknown as typeof fetch;

describe("SpdxLicenseSource", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      makeFetch({
        "https://raw.githubusercontent.com/spdx/license-list-data/main/json/licenses.json":
          mockIndex,
        "https://spdx.org/licenses/MIT.json": mockMitDetail,
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("search", () => {
    it("returns entries whose licenseId matches the query case-insensitively", async () => {
      const source = new SpdxLicenseSource();
      const results = await source.search("mit");

      expect(results).toEqual([{ licenseId: "MIT", name: "MIT License" }]);
    });

    it("returns entries whose name matches the query case-insensitively", async () => {
      const source = new SpdxLicenseSource();
      const results = await source.search("apache");

      expect(results).toEqual([
        { licenseId: "Apache-2.0", name: "Apache License 2.0" },
      ]);
    });

    it("returns multiple matches when the query matches several licenses", async () => {
      const source = new SpdxLicenseSource();
      const results = await source.search("gpl");

      expect(results).toEqual([
        {
          licenseId: "GPL-2.0-only",
          name: "GNU General Public License v2.0 only",
        },
      ]);
    });

    it("excludes deprecated licenses", async () => {
      const source = new SpdxLicenseSource();
      const results = await source.search("GPL-2.0");

      const ids = results.map((r) => r.licenseId);
      expect(ids).not.toContain("GPL-2.0");
    });

    it("returns an empty array when no licenses match", async () => {
      const source = new SpdxLicenseSource();
      const results = await source.search("zzznomatch");

      expect(results).toEqual([]);
    });

    it("fetches the index only once across multiple calls", async () => {
      const source = new SpdxLicenseSource();
      await source.search("mit");
      await source.search("apache");

      const indexUrl =
        "https://raw.githubusercontent.com/spdx/license-list-data/main/json/licenses.json";
      const calls = vi
        .mocked(fetch)
        .mock.calls.filter(([url]) => url === indexUrl);
      expect(calls).toHaveLength(1);
    });
  });

  describe("fetchLicense", () => {
    it("returns the license detail for a valid license ID", async () => {
      const source = new SpdxLicenseSource();
      const detail = await source.fetchLicense("MIT");

      expect(detail).toEqual({
        licenseId: "MIT",
        name: "MIT License",
        licenseText: "MIT License\n\nCopyright (c) <year> <author>",
      });
    });

    it("resolves the license ID case-insensitively", async () => {
      const source = new SpdxLicenseSource();
      const detail = await source.fetchLicense("mit");

      expect(detail.licenseId).toBe("MIT");
    });

    it("throws when the license ID is not in the index", async () => {
      const source = new SpdxLicenseSource();

      await expect(source.fetchLicense("FAKE-LICENSE")).rejects.toThrow(
        "License not found: FAKE-LICENSE",
      );
    });

    it("throws when the details endpoint returns an error status", async () => {
      vi.stubGlobal(
        "fetch",
        makeFetch({
          "https://raw.githubusercontent.com/spdx/license-list-data/main/json/licenses.json":
            mockIndex,
        }),
      );
      const source = new SpdxLicenseSource();

      await expect(source.fetchLicense("MIT")).rejects.toThrow(
        "Failed to fetch license details for MIT",
      );
    });
  });
});
