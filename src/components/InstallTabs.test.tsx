import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import InstallTabs from "./InstallTabs";

/**
 * The hero install widget lets a visitor pick their package manager and copy
 * the matching run command. These assert what the visitor sees and copies, not
 * how the component tracks state.
 */
describe("InstallTabs", () => {
  it("offers a tab for every package manager", () => {
    render(<InstallTabs />);
    const tablist = screen.getByRole("tablist", { name: "Package manager" });
    expect(tablist).toHaveTextContent("npm");
    expect(tablist).toHaveTextContent("pnpm");
    expect(tablist).toHaveTextContent("yarn");
    expect(tablist).toHaveTextContent("bun");
  });

  it("shows the npx command by default", () => {
    render(<InstallTabs />);
    expect(screen.getByRole("tabpanel")).toHaveTextContent(
      "npx license-wizard",
    );
    expect(
      screen.getByRole("button", { name: "Copy npm command" }),
    ).toBeInTheDocument();
  });

  it("swaps the command when another manager is selected", () => {
    render(<InstallTabs />);
    fireEvent.click(screen.getByRole("tab", { name: /pnpm/ }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent(
      "pnpm dlx license-wizard",
    );
    expect(
      screen.getByRole("button", { name: "Copy pnpm command" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /bun/ }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent(
      "bunx license-wizard",
    );
  });
});
