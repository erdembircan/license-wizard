import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NodeFileSystemWriter } from "@configuration/NodeFileSystemWriter.js";

describe("NodeFileSystemWriter", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "lw-writer-"));
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("writes content that reads back exactly", async () => {
    const file = path.join(dir, "LICENSE");
    await new NodeFileSystemWriter().write(file, "hello\n");

    expect(await fs.readFile(file, "utf-8")).toBe("hello\n");
  });

  it("replaces an existing file with the new content", async () => {
    const file = path.join(dir, "LICENSE");
    const writer = new NodeFileSystemWriter();
    await writer.write(file, "old\n");
    await writer.write(file, "new\n");

    expect(await fs.readFile(file, "utf-8")).toBe("new\n");
  });

  it("leaves no temporary debris behind after a successful write", async () => {
    const file = path.join(dir, "a.ts");
    await new NodeFileSystemWriter().write(file, "x\n");

    const entries = await fs.readdir(dir);
    expect(entries).toEqual(["a.ts"]);
  });

  it("creates missing parent directories", async () => {
    const file = path.join(dir, "nested", "deep", "b.ts");
    await new NodeFileSystemWriter().write(file, "y\n");

    expect(await fs.readFile(file, "utf-8")).toBe("y\n");
  });
});
