import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { NodeFileSystemWriter } from "@configuration/NodeFileSystemWriter.js";
import { FileSystemWriterError } from "@configuration/errors/FileSystemWriterError.js";

describe("NodeFileSystemWriter", () => {
  let tmpDir: string;
  let writer: NodeFileSystemWriter;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "license-wizard-test-"));
    writer = new NodeFileSystemWriter();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe("write", () => {
    it("writes content to the given file path", async () => {
      const filePath = path.join(tmpDir, "output.txt");

      await writer.write(filePath, "hello world");

      const written = await fs.readFile(filePath, "utf-8");
      expect(written).toBe("hello world");
    });

    it("creates missing parent directories", async () => {
      const filePath = path.join(tmpDir, "nested", "deep", "output.txt");

      await writer.write(filePath, "nested content");

      const written = await fs.readFile(filePath, "utf-8");
      expect(written).toBe("nested content");
    });

    it("overwrites an existing file", async () => {
      const filePath = path.join(tmpDir, "existing.txt");
      await fs.writeFile(filePath, "old content", "utf-8");

      await writer.write(filePath, "new content");

      const written = await fs.readFile(filePath, "utf-8");
      expect(written).toBe("new content");
    });

    it("throws FileSystemWriterError when writing fails", async () => {
      // A directory path cannot be written to as a file
      const filePath = tmpDir;

      await expect(writer.write(filePath, "content")).rejects.toThrow(
        FileSystemWriterError,
      );
    });

    it("preserves the original error as cause on write failure", async () => {
      const filePath = tmpDir;

      const error = await writer.write(filePath, "content").catch((e) => e);

      expect(error.cause).toBeDefined();
    });
  });
});
