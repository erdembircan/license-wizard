import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../App";

/**
 * Renders the app at a `#/docs` hash route and asserts the documentation page
 * takes over from the landing page: the docs header, the section sidebar, and
 * the requested section's content.
 */
describe("DocsPage via hash route", () => {
  afterEach(() => {
    window.location.hash = "";
  });

  it("renders the default section for #/docs", () => {
    window.location.hash = "#/docs";
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "Getting started", level: 2 }),
    ).toBeInTheDocument();
  });

  it("renders the requested section for #/docs/<section>", () => {
    window.location.hash = "#/docs/headers";
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "Source-file headers", level: 2 }),
    ).toBeInTheDocument();
  });

  it("lists every section in the sidebar", () => {
    window.location.hash = "#/docs";
    render(<App />);
    const sidebar = screen.getByRole("navigation", {
      name: "Documentation sections",
    });
    const links = within(sidebar);
    expect(links.getByText("Getting started")).toBeInTheDocument();
    expect(links.getByText("One-shot generation")).toBeInTheDocument();
    expect(links.getByText("Verify & CI")).toBeInTheDocument();
    expect(links.getByText("Flags reference")).toBeInTheDocument();
  });

  it("marks the active section in the sidebar", () => {
    window.location.hash = "#/docs/verify";
    render(<App />);
    const sidebar = screen.getByRole("navigation", {
      name: "Documentation sections",
    });
    const active = within(sidebar).getByText("Verify & CI");
    expect(active).toHaveAttribute("aria-current", "page");
  });

  it("renders the full flags reference table", () => {
    window.location.hash = "#/docs/flags";
    render(<App />);
    const table = screen.getByRole("table");
    const bodyRows = within(table).getAllByRole("row").slice(1);
    expect(bodyRows.length).toBe(14);
  });
});
