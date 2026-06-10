/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { describe, it, expect } from "vitest";
import { HeaderTemplate } from "@headers/HeaderTemplate.js";

const APACHE_HEADER_TEMPLATE = [
  '<<var;name="copyright";original="Copyright [yyyy] [name of copyright owner]";match=".{0,5000}">>',
  "",
  'Licensed under the Apache License, Version 2.0 (the "License");',
].join("\n");

describe("HeaderTemplate", () => {
  it("exposes the copyright slots of a header template", () => {
    const template = new HeaderTemplate(APACHE_HEADER_TEMPLATE);

    expect(template.slots()).toEqual([
      { token: "[yyyy]", label: "yyyy" },
      { token: "[name of copyright owner]", label: "name of copyright owner" },
    ]);
  });

  it("substitutes copyright tokens into the rendered header notice", () => {
    const result = new HeaderTemplate(APACHE_HEADER_TEMPLATE).render({
      "[yyyy]": "2026",
      "[name of copyright owner]": "Erdem Bircan",
    });

    expect(result).toBe(
      [
        "Copyright 2026 Erdem Bircan",
        "",
        'Licensed under the Apache License, Version 2.0 (the "License");',
      ].join("\n"),
    );
  });
});
