import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SpdxLicenseSource } from "@licensing/SpdxLicenseSource.js";

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
  });
});
