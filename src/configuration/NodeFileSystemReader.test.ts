import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { NodeFileSystemReader } from "@configuration/NodeFileSystemReader.js";
import { FileSystemReaderError } from "@configuration/errors/FileSystemReaderError.js";

describe("NodeFileSystemReader", () => {
  let tmpDir: string;
  let reader: NodeFileSystemReader;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "license-wizard-test-"));
    reader = new NodeFileSystemReader();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe("read", () => {
    it("returns the file contents as a string", async () => {
      const filePath = path.join(tmpDir, "test.txt");
      await fs.writeFile(filePath, "hello world", "utf-8");

      const result = await reader.read(filePath);

      expect(result).toBe("hello world");
    });

    it("throws FileSystemReaderError when the file does not exist", async () => {
      const filePath = path.join(tmpDir, "nonexistent.txt");

      await expect(reader.read(filePath)).rejects.toThrow(
        FileSystemReaderError,
      );
    });

    it("preserves the original error as cause on read failure", async () => {
      const filePath = path.join(tmpDir, "nonexistent.txt");

      const error = await reader.read(filePath).catch((e) => e);

      expect(error.cause).toBeDefined();
    });
  });

  describe("exists", () => {
    it("returns true when the file exists", async () => {
      const filePath = path.join(tmpDir, "present.txt");
      await fs.writeFile(filePath, "content", "utf-8");

      const result = await reader.exists(filePath);

      expect(result).toBe(true);
    });

    it("returns false when the file does not exist", async () => {
      const filePath = path.join(tmpDir, "absent.txt");

      const result = await reader.exists(filePath);

      expect(result).toBe(false);
    });
  });
});
