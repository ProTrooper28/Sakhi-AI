import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import AuthChoicePage from "../pages/AuthChoicePage";
import SignInPage from "../pages/SignInPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";

/**
 * Smoke tests — mounts the new auth screens (choice + sign-in) with the real
 * AuthProvider so provider wiring and hooks are exercised. Supabase is not
 * configured in the test env, so AuthContext resolves to signed-out instantly.
 */
const renderAt = (pathname: string, state?: unknown, ui?: React.ReactNode) =>
  render(
    <AuthProvider>
      <MemoryRouter
        initialEntries={[{ pathname, state }]}
        initialIndex={0}
      >
        {ui}
      </MemoryRouter>
    </AuthProvider>,
  );

describe("auth flow screens", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows the Welcome Back choice with Sign In and Create Account (user role)", async () => {
    renderAt("/auth", { role: "user" }, <AuthChoicePage />);

    expect(await screen.findByText("Welcome Back")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("shows the Welcome Back choice for parents", async () => {
    renderAt("/auth", { role: "parent" }, <AuthChoicePage />);

    expect(await screen.findByText("Welcome Back")).toBeInTheDocument();
    expect(screen.getByText(/parent \/ guardian/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("sign-in asks for email + password (no OTP)", async () => {
    renderAt("/signin", { role: "user" }, <SignInPage />);

    expect(await screen.findByText(/sign in to your safety app/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /forgot password/i })).toBeInTheDocument();
  });

  it("forgot-password collects the email for the recovery link", async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={[{ pathname: "/forgot-password", state: { role: "user" } }]} initialIndex={0}>
          <ForgotPasswordPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(await screen.findByText(/reset your password/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
  });
});
