import { describe, it, expect } from "vitest";
import {
  buildMarker,
  digestBody,
  hasMarker,
  markerToken,
  parseMarker,
} from "@headers/HeaderMarker.js";

describe("HeaderMarker", () => {
  it("builds a marker carrying the version, id, style, and hash", () => {
    const marker = buildMarker("MIT", "short", "abc123");

    expect(marker).toBe(`${markerToken()} v1 MIT short abc123`);
  });

  it("detects its own marker token in text", () => {
    expect(hasMarker(`prefix ${markerToken()} v1 MIT short abc`)).toBe(true);
    expect(hasMarker("just some source code")).toBe(false);
  });

  it("round-trips through parseMarker", () => {
    const parsed = parseMarker(
      buildMarker("Apache-2.0", "full", "deadbeef0000"),
    );

    expect(parsed).toEqual({
      version: 1,
      licenseId: "Apache-2.0",
      style: "full",
      hash: "deadbeef0000",
    });
  });

  it("returns null for a line that is not a marker", () => {
    expect(parseMarker(" * SPDX-License-Identifier: MIT")).toBeNull();
  });

  it("digests a body to a short, stable, content-specific hash", () => {
    const a = digestBody("SPDX-License-Identifier: MIT");
    const b = digestBody("SPDX-License-Identifier: MIT");
    const c = digestBody("SPDX-License-Identifier: Apache-2.0");

    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toHaveLength(12);
  });
});
