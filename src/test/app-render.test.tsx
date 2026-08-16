import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../App";

/**
 * Smoke test — mounts the real app (providers + router) exactly like the
 * preview does, and asserts the welcome screen renders. Catches runtime
 * crashes (bad hooks, undefined module exports, provider wiring) that a
 * typecheck cannot.
 */
describe("app smoke render", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the role-selection welcome screen without crashing", async () => {
    render(<App />);

    expect(await screen.findByText("Welcome to Sakhi AI")).toBeInTheDocument();
    expect(screen.getByText("Continue as User")).toBeInTheDocument();
    expect(screen.getByText("Continue as Guardian")).toBeInTheDocument();
    expect(screen.getByText("Continue as Guest")).toBeInTheDocument();
  });
});
