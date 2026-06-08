import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

/**
 * Content smoke test for the full landing page: renders App in jsdom and
 * asserts that every major landmark from the original monolithic page survives
 * the React migration — the nav links, each section heading, all flag rows,
 * and the footer. The hero terminal is filled asynchronously by timers,
 * so this only asserts that it mounts, never on its streamed lines.
 */
describe("App", () => {
  it("renders the nav links", () => {
    render(<App />);
    const nav = document.getElementById("nav")!;
    const links = within(nav);
    expect(links.getByText("Features")).toBeInTheDocument();
    expect(links.getByText("Usage")).toBeInTheDocument();
    expect(links.getByText("Headers")).toBeInTheDocument();
    expect(links.getByText("Agents")).toBeInTheDocument();
    expect(links.getByText("CI")).toBeInTheDocument();
    expect(links.getByText("Flags")).toBeInTheDocument();
  });

  it("renders every section heading", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", {
        name: "Everything the LICENSE file needs",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "A short, guided flow" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "A header in every file" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Second nature/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Keep it honest/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Available flags" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "License your project in seconds" }),
    ).toBeInTheDocument();
  });

  it("renders every flag row in the reference table", () => {
    render(<App />);
    const table = within(document.getElementById("flags")!).getByRole("table");
    const bodyRows = within(table).getAllByRole("row").slice(1); // drop header
    const flagLabels = bodyRows.map(
      (row) => within(row).getAllByRole("cell")[0]!.textContent,
    );
    expect(flagLabels).toEqual([
      "--help",
      "--verify",
      "--strict",
      "--license <spdx-id>",
      "--set <field=value>",
      "--save-rc",
      "--save-npm",
      "--save-composer",
      "--get-tokens",
      "--headers <short|full>",
      "--headers-ignore <glob>",
      "--remove-headers",
      "--dry-run",
    ]);
  });

  it("mounts the hero terminal shell", () => {
    render(<App />);
    expect(document.getElementById("terminal")).toBeInTheDocument();
    expect(document.getElementById("terminal-body")).toBeInTheDocument();
  });

  it("renders the footer copyright and links", () => {
    render(<App />);
    const footer = screen.getByRole("contentinfo");
    const within_ = within(footer);
    expect(within_.getByText(/Erdem Bircan/)).toBeInTheDocument();
    expect(within_.getByText("GitHub")).toBeInTheDocument();
    expect(within_.getByText("npm")).toBeInTheDocument();
    expect(within_.queryByText("Issues")).not.toBeInTheDocument();
  });
});
