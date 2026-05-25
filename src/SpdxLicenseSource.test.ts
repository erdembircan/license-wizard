import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SpdxLicenseSource } from "./SpdxLicenseSource.js";

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

const makeDetailResponse = (
  licenseId: string,
  name: string,
  licenseText: string,
) =>
  new Response(JSON.stringify({ licenseId, name, licenseText }), {
    status: 200,
  });

describe("SpdxLicenseSource", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("search", () => {
    it("returns matching licenses by id", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        makeIndexResponse([
          makeLicenseItem("MIT", "MIT License"),
          makeLicenseItem("Apache-2.0", "Apache License 2.0"),
        ]),
      );

      const source = new SpdxLicenseSource();
      const results = await source.search("mit");

      expect(results).toEqual([{ licenseId: "MIT", name: "MIT License" }]);
    });

    it("returns matching licenses by name", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        makeIndexResponse([
          makeLicenseItem("MIT", "MIT License"),
          makeLicenseItem("Apache-2.0", "Apache License 2.0"),
        ]),
      );

      const source = new SpdxLicenseSource();
      const results = await source.search("apache");

      expect(results).toEqual([
        { licenseId: "Apache-2.0", name: "Apache License 2.0" },
      ]);
    });

    it("is case-insensitive", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        makeIndexResponse([makeLicenseItem("MIT", "MIT License")]),
      );

      const source = new SpdxLicenseSource();
      const results = await source.search("MIT LICENSE");

      expect(results).toEqual([{ licenseId: "MIT", name: "MIT License" }]);
    });

    it("excludes deprecated licenses", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        makeIndexResponse([
          makeLicenseItem("MIT", "MIT License"),
          makeLicenseItem(
            "GPL-1.0",
            "GNU General Public License v1.0 only",
            true,
          ),
        ]),
      );

      const source = new SpdxLicenseSource();
      const results = await source.search("gpl");

      expect(results).toEqual([]);
    });

    it("returns an empty array when nothing matches", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        makeIndexResponse([makeLicenseItem("MIT", "MIT License")]),
      );

      const source = new SpdxLicenseSource();
      const results = await source.search("nonexistent");

      expect(results).toEqual([]);
    });

    it("throws when the index fetch fails", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(null, { status: 503, statusText: "Service Unavailable" }),
      );

      const source = new SpdxLicenseSource();

      await expect(source.search("mit")).rejects.toThrow(
        "Failed to fetch SPDX license index",
      );
    });
  });

  describe("fetchLicense", () => {
    it("returns license detail for a known id", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          makeIndexResponse([makeLicenseItem("MIT", "MIT License")]),
        )
        .mockResolvedValueOnce(
          makeDetailResponse(
            "MIT",
            "MIT License",
            "Permission is hereby granted...",
          ),
        );

      const source = new SpdxLicenseSource();
      const detail = await source.fetchLicense("MIT");

      expect(detail).toEqual({
        licenseId: "MIT",
        name: "MIT License",
        licenseText: "Permission is hereby granted...",
      });
    });

    it("is case-insensitive when matching the license id", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          makeIndexResponse([makeLicenseItem("MIT", "MIT License")]),
        )
        .mockResolvedValueOnce(
          makeDetailResponse(
            "MIT",
            "MIT License",
            "Permission is hereby granted...",
          ),
        );

      const source = new SpdxLicenseSource();
      const detail = await source.fetchLicense("mit");

      expect(detail.licenseId).toBe("MIT");
    });

    it("throws when the license id is not in the index", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        makeIndexResponse([makeLicenseItem("MIT", "MIT License")]),
      );

      const source = new SpdxLicenseSource();

      await expect(source.fetchLicense("FAKE-LICENSE")).rejects.toThrow(
        "License not found",
      );
    });

    it("throws when the details fetch fails", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          makeIndexResponse([makeLicenseItem("MIT", "MIT License")]),
        )
        .mockResolvedValueOnce(
          new Response(null, { status: 404, statusText: "Not Found" }),
        );

      const source = new SpdxLicenseSource();

      await expect(source.fetchLicense("MIT")).rejects.toThrow(
        "Failed to fetch license details",
      );
    });
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
  });
});
