import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Supabase client so signUpWithEmail's auth calls can be asserted
// without a real backend. The module is replaced wholesale, so the real
// client (which reads import.meta.env) never loads in these tests.
const { mockSignUp, mockResend, mockRpc } = vi.hoisted(() => ({
  mockSignUp: vi.fn(),
  mockResend: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      signUp: mockSignUp,
      resend: mockResend,
    },
    rpc: mockRpc,
  },
}));

import {
  signUpWithEmail,
  resendVerificationEmail,
  resolveLoginEmail,
  savePendingSignup,
  readPendingSignup,
  clearPendingSignup,
} from "../lib/otp";

const userProfile = { full_name: "Preeti Sharma", phone: "+919876543210" };

describe("signUpWithEmail (Create Account → built-in email verification)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignUp.mockResolvedValue({ data: {}, error: null });
    mockResend.mockResolvedValue({ data: {}, error: null });
  });

  it("creates the account via supabase.auth.signUp with the onboarding metadata", async () => {
    await signUpWithEmail({ email: "preeti@example.com", role: "user", profile: userProfile });

    expect(mockSignUp).toHaveBeenCalledTimes(1);
    const [arg] = mockSignUp.mock.calls[0] as [{ email: string; password: string; options: Record<string, unknown> }];
    expect(arg.email).toBe("preeti@example.com");
    // A throwaway password is used so the auth user is created the standard
    // way; the user sets their real password after verification.
    expect(typeof arg.password).toBe("string");
    expect(arg.password.length).toBeGreaterThanOrEqual(8);
    expect(arg.options.data).toEqual({
      full_name: "Preeti Sharma",
      role: "user",
      phone: "+919876543210",
    });
    // The verification link must redirect back to the app (implicit flow).
    expect(arg.options.emailRedirectTo).toBe(window.location.origin);
  });

  it("surfaces a friendly ALREADY_REGISTERED error for an existing account", async () => {
    mockSignUp.mockResolvedValueOnce({
      data: {},
      error: { message: "User already registered", status: 400 },
    });

    await expect(
      signUpWithEmail({ email: "existing@example.com", role: "user", profile: userProfile }),
    ).rejects.toMatchObject({ code: "ALREADY_REGISTERED" });
  });

  it("surfaces SIGNUP_DISABLED when new sign-ups are blocked", async () => {
    mockSignUp.mockResolvedValueOnce({
      data: {},
      error: { message: "Signup not allowed", status: 403 },
    });

    await expect(
      signUpWithEmail({ email: "blocked@example.com", role: "parent", profile: userProfile }),
    ).rejects.toMatchObject({ code: "SIGNUP_DISABLED" });
  });

  it("surfaces the REAL Supabase error (message + status + code) instead of a generic one", async () => {
    mockSignUp.mockResolvedValueOnce({
      data: {},
      error: {
        message: "Error sending confirmation email: SMTP connection refused",
        status: 500,
        code: "email_provider_disabled",
      },
    });

    const err = await signUpWithEmail({
      email: "new@example.com",
      role: "user",
      profile: userProfile,
    }).catch((e: unknown) => e);
    expect(err).toMatchObject({
      code: "SIGNUP_ERROR",
      status: 500,
      supabaseCode: "email_provider_disabled",
      message: expect.stringContaining("SMTP connection refused"),
    });
  });
});

describe("resendVerificationEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResend.mockResolvedValue({ data: {}, error: null });
  });

  it("re-sends the signup verification email via supabase.auth.resend", async () => {
    await resendVerificationEmail({ email: "preeti@example.com" });

    expect(mockResend).toHaveBeenCalledWith({
      type: "signup",
      email: "preeti@example.com",
      options: { emailRedirectTo: window.location.origin },
    });
  });

  it("surfaces the real backend error verbatim", async () => {
    mockResend.mockResolvedValueOnce({
      data: {},
      error: { message: "Email rate limit exceeded", status: 429 },
    });

    await expect(resendVerificationEmail({ email: "preeti@example.com" })).rejects.toMatchObject({
      code: "RESEND_ERROR",
      status: 429,
      message: expect.stringContaining("rate limit"),
    });
  });
});

describe("pending-signup marker (Create Account → Create Password routing)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips and clears", () => {
    expect(readPendingSignup()).toBeNull();

    savePendingSignup("preeti@example.com", "user");
    expect(readPendingSignup()).toEqual({ email: "preeti@example.com", role: "user" });

    savePendingSignup("rakesh@example.com", "parent");
    expect(readPendingSignup()).toEqual({ email: "rakesh@example.com", role: "parent" });

    clearPendingSignup();
    expect(readPendingSignup()).toBeNull();
  });

  it("normalizes an invalid stored value to null", () => {
    localStorage.setItem("sakhi_pending_signup", "{not json");
    expect(readPendingSignup()).toBeNull();
  });
});

describe("resolveLoginEmail (Email OR Mobile sign-in)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: "preeti@example.com", error: null });
  });

  it("passes an email through (lowercased)", async () => {
    await expect(resolveLoginEmail("  Preeti@Example.COM ")).resolves.toBe("preeti@example.com");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("resolves a 10-digit mobile number to the account email via the RPC", async () => {
    await expect(resolveLoginEmail("+91 98765 43210")).resolves.toBe("preeti@example.com");
    expect(mockRpc).toHaveBeenCalledWith("lookup_email_by_phone", { p_phone: "+919876543210" });
  });

  it("throws NO_ACCOUNT when the phone has no profile row", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(resolveLoginEmail("9876543210")).rejects.toMatchObject({ code: "NO_ACCOUNT" });
  });

  it("throws INVALID_IDENTIFIER for anything that is neither email nor mobile", async () => {
    await expect(resolveLoginEmail("not-a-contact")).rejects.toMatchObject({
      code: "INVALID_IDENTIFIER",
    });
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
