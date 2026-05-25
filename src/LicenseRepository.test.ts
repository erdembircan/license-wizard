import { describe, it, expect, vi } from "vitest";
import { LicenseRepository } from "./LicenseRepository.js";
import { LicenseRepositoryError } from "./LicenseRepositoryError.js";
import type { ILicenseSource } from "./ILicenseSource.js";
import type { LicenseDetail } from "./LicenseDetail.js";
import type { LicenseIndexEntry } from "./LicenseIndexEntry.js";

const makeSource = (): ILicenseSource => ({
  search: vi.fn(async (): Promise<LicenseIndexEntry[]> => []),
  fetchLicense: vi.fn(
    async (): Promise<LicenseDetail> => ({
      licenseId: "MIT",
      name: "MIT License",
      licenseText: "Permission is hereby granted...",
    }),
  ),
});

describe("LicenseRepository", () => {
  describe("search", () => {
    it("returns the entries provided by the source", async () => {
      const entries: LicenseIndexEntry[] = [
        { licenseId: "MIT", name: "MIT License" },
        { licenseId: "Apache-2.0", name: "Apache License 2.0" },
      ];
      const source = makeSource();
      vi.mocked(source.search).mockResolvedValueOnce(entries);
      const repo = new LicenseRepository(source);

      const result = await repo.search("mit");

      expect(result).toEqual(entries);
    });

    it("forwards the query to the source", async () => {
      const source = makeSource();
      const repo = new LicenseRepository(source);

      await repo.search("apache");

      expect(source.search).toHaveBeenCalledWith("apache");
    });

    it("returns an empty array when the source finds nothing", async () => {
      const source = makeSource();
      vi.mocked(source.search).mockResolvedValueOnce([]);
      const repo = new LicenseRepository(source);

      const result = await repo.search("nonexistent");

      expect(result).toEqual([]);
    });
  });

  describe("getLicense", () => {
    it("returns the license detail provided by the source", async () => {
      const detail: LicenseDetail = {
        licenseId: "MIT",
        name: "MIT License",
        licenseText: "Permission is hereby granted...",
      };
      const source = makeSource();
      vi.mocked(source.fetchLicense).mockResolvedValueOnce(detail);
      const repo = new LicenseRepository(source);

      const result = await repo.getLicense("MIT");

      expect(result).toEqual(detail);
    });

    it("forwards the licenseId to the source", async () => {
      const source = makeSource();
      const repo = new LicenseRepository(source);

      await repo.getLicense("Apache-2.0");

      expect(source.fetchLicense).toHaveBeenCalledWith("Apache-2.0");
    });

    it("throws LicenseRepositoryError when the source fails", async () => {
      const source = makeSource();
      const cause = new Error("License not found: FAKE-LICENSE");
      vi.mocked(source.fetchLicense).mockRejectedValueOnce(cause);
      const repo = new LicenseRepository(source);

      await expect(repo.getLicense("FAKE-LICENSE")).rejects.toThrow(
        LicenseRepositoryError,
      );
    });

    it("preserves the original error as cause", async () => {
      const source = makeSource();
      const cause = new Error("License not found: FAKE-LICENSE");
      vi.mocked(source.fetchLicense).mockRejectedValueOnce(cause);
      const repo = new LicenseRepository(source);

      const error = await repo.getLicense("FAKE-LICENSE").catch((e) => e);

      expect(error.cause).toBe(cause);
    });
  });

  describe("search error handling", () => {
    it("throws LicenseRepositoryError when the source fails", async () => {
      const source = makeSource();
      vi.mocked(source.search).mockRejectedValueOnce(
        new Error("Network error"),
      );
      const repo = new LicenseRepository(source);

      await expect(repo.search("mit")).rejects.toThrow(LicenseRepositoryError);
    });

    it("preserves the original error as cause", async () => {
      const source = makeSource();
      const cause = new Error("Network error");
      vi.mocked(source.search).mockRejectedValueOnce(cause);
      const repo = new LicenseRepository(source);

      const error = await repo.search("mit").catch((e) => e);

      expect(error.cause).toBe(cause);
    });
  });
});
