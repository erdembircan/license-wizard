/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SpdxLicenseSource } from "@licensing/SpdxLicenseSource.js";
import { LicenseNotFoundError } from "@licensing/errors/LicenseNotFoundError.js";

const makeLicenseItem = (
  licenseId: string,
  name: string,
  isDeprecatedLicenseId = false,
) => ({
  licenseId,
  name,
  detailsUrl: `https://spdx.org/licenses/${licenseId}.json`,
  isDeprecatedLicenseId,
});

const makeIndexResponse = (licenses: ReturnType<typeof makeLicenseItem>[]) =>
  new Response(JSON.stringify({ licenses }), { status: 200 });

const makeDetailResponse = (detail: Record<string, unknown>) =>
  new Response(JSON.stringify(detail), { status: 200 });

/**
 * Mocks fetch to serve the index for the master index URL and a detail
 * payload for any per-license details URL.
 */
const mockIndexAndDetail = (detail: Record<string, unknown>) => {
  vi.mocked(fetch).mockImplementation((input) => {
    const url = String(input);
    if (url.includes("licenses.json")) {
      return Promise.resolve(
        makeIndexResponse([makeLicenseItem("MIT", "MIT License")]),
      );
    }
    return Promise.resolve(makeDetailResponse(detail));
  });
};

describe("SpdxLicenseSource", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("cache behaviour", () => {
    it("fetches the index only once within the TTL", async () => {
      vi.mocked(fetch).mockImplementation(() =>
        Promise.resolve(
          makeIndexResponse([makeLicenseItem("MIT", "MIT License")]),
        ),
      );

      const source = new SpdxLicenseSource(60_000);
      await source.search("mit");
      await source.search("mit");

      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("re-fetches the index when the cache has expired", async () => {
      vi.useFakeTimers();
      const TTL = 60_000;

      vi.mocked(fetch).mockImplementation(() =>
        Promise.resolve(
          makeIndexResponse([makeLicenseItem("MIT", "MIT License")]),
        ),
      );

      const source = new SpdxLicenseSource(TTL);
      await source.search("mit");

      vi.advanceTimersByTime(TTL + 1);
      await source.search("mit");

      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("does not re-fetch before the TTL has elapsed", async () => {
      vi.useFakeTimers();
      const TTL = 60_000;

      vi.mocked(fetch).mockImplementation(() =>
        Promise.resolve(
          makeIndexResponse([makeLicenseItem("MIT", "MIT License")]),
        ),
      );

      const source = new SpdxLicenseSource(TTL);
      await source.search("mit");

      vi.advanceTimersByTime(TTL - 1);
      await source.search("mit");

      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("does not re-fetch a license detail within the TTL", async () => {
      mockIndexAndDetail({
        licenseId: "MIT",
        name: "MIT License",
        licenseText: "text",
        standardLicenseTemplate: "tmpl",
      });

      const source = new SpdxLicenseSource(60_000);
      await source.fetchLicense("MIT");
      await source.fetchLicense("MIT");

      // One fetch for the index plus one for the detail; the second
      // fetchLicense is served from the detail cache.
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("suggest", () => {
    /**
     * Serves an index of the given licenses for any suggestion query.
     */
    const mockIndex = (licenses: ReturnType<typeof makeLicenseItem>[]) => {
      vi.mocked(fetch).mockImplementation(() =>
        Promise.resolve(makeIndexResponse(licenses)),
      );
    };

    it("matches an identifier despite separator and case differences", async () => {
      mockIndex([
        makeLicenseItem("Apache-2.0", "Apache License 2.0"),
        makeLicenseItem("MIT", "MIT License"),
        makeLicenseItem("GPL-3.0-only", "GNU General Public License v3.0 only"),
      ]);

      const source = new SpdxLicenseSource();
      const result = await source.suggest("apache-2-0", 5);

      expect(result[0]).toEqual({
        licenseId: "Apache-2.0",
        name: "Apache License 2.0",
      });
    });

    it("returns at most the requested number of suggestions", async () => {
      mockIndex([
        makeLicenseItem("Apache-2.0", "Apache License 2.0"),
        makeLicenseItem("Apache-1.1", "Apache Software License 1.1"),
        makeLicenseItem("Apache-1.0", "Apache Software License 1.0"),
        makeLicenseItem("MIT", "MIT License"),
      ]);

      const source = new SpdxLicenseSource();
      const result = await source.suggest("apache", 2);

      expect(result).toHaveLength(2);
    });

    it("offers nearest candidates even when no identifier contains the query", async () => {
      mockIndex([
        makeLicenseItem("MIT", "MIT License"),
        makeLicenseItem("ISC", "ISC License"),
      ]);

      const source = new SpdxLicenseSource();
      const result = await source.suggest("MTI", 5);

      expect(result.map((entry) => entry.licenseId)).toContain("MIT");
    });
  });

  describe("fetchLicense", () => {
    it("throws LicenseNotFoundError for an unknown identifier", async () => {
      vi.mocked(fetch).mockImplementation(() =>
        Promise.resolve(
          makeIndexResponse([makeLicenseItem("MIT", "MIT License")]),
        ),
      );

      const source = new SpdxLicenseSource();

      await expect(source.fetchLicense("NOPE-1.0")).rejects.toBeInstanceOf(
        LicenseNotFoundError,
      );
    });

    it("surfaces the standardLicenseTemplate from the detail response", async () => {
      mockIndexAndDetail({
        licenseId: "MIT",
        name: "MIT License",
        licenseText: "text",
        standardLicenseTemplate: "the-template",
      });

      const source = new SpdxLicenseSource();
      const detail = await source.fetchLicense("MIT");

      expect(detail.standardLicenseTemplate).toBe("the-template");
    });

    it("leaves standardLicenseTemplate undefined when absent", async () => {
      mockIndexAndDetail({
        licenseId: "MIT",
        name: "MIT License",
        licenseText: "text",
      });

      const source = new SpdxLicenseSource();
      const detail = await source.fetchLicense("MIT");

      expect(detail.standardLicenseTemplate).toBeUndefined();
    });
  });

  describe("network timeout", () => {
    it("passes an abort signal to every fetch", async () => {
      mockIndexAndDetail({
        licenseId: "MIT",
        name: "MIT License",
        licenseText: "text",
      });

      const source = new SpdxLicenseSource();
      await source.fetchLicense("MIT");

      for (const call of vi.mocked(fetch).mock.calls) {
        expect(call[1]?.signal).toBeInstanceOf(AbortSignal);
      }
    });

    it("surfaces a stalled request as a clean timeout error, not a hang", async () => {
      vi.mocked(fetch).mockImplementation(() =>
        Promise.reject(new DOMException("aborted", "TimeoutError")),
      );

      const source = new SpdxLicenseSource();

      await expect(source.search("mit")).rejects.toThrow(/timed out/);
    });
  });
});
