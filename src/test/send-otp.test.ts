import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Supabase client so sendOtp's auth calls can be asserted without a
// real backend. The module is replaced wholesale, so the real client (which
// reads import.meta.env) never loads in these tests.
const { mockSignInWithOtp, mockSignUp } = vi.hoisted(() => ({
  mockSignInWithOtp: vi.fn(),
  mockSignUp: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      signInWithOtp: mockSignInWithOtp,
      signUp: mockSignUp,
    },
  },
}));

import { sendOtp } from "../lib/otp";

const userProfile = { full_name: "Preeti Sharma", phone: "+919876543210" };

describe("sendOtp (sign-up vs sign-in)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignInWithOtp.mockResolvedValue({ data: {}, error: null });
    mockSignUp.mockResolvedValue({ data: {}, error: null });
  });

  it("sign-up: sends with shouldCreateUser true and the onboarding metadata", async () => {
    await sendOtp({ email: "preeti@example.com", role: "user", profile: userProfile });

    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: "preeti@example.com",
      options: {
        shouldCreateUser: true,
        data: { full_name: "Preeti Sharma", role: "user", phone: "+919876543210" },
      },
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("sign-up: creates the auth user explicitly when lazy creation is refused, then sends the code", async () => {
    mockSignInWithOtp
      .mockResolvedValueOnce({ data: {}, error: { message: "Signup not allowed for otp" } })
      .mockResolvedValueOnce({ data: {}, error: null });

    await expect(
      sendOtp({ email: "new@example.com", role: "user", profile: userProfile }),
    ).resolves.toBeUndefined();

    // Auth user created first with the metadata…
    expect(mockSignUp).toHaveBeenCalledTimes(1);
    const signUpArgs = mockSignUp.mock.calls[0]![0];
    expect(signUpArgs.email).toBe("new@example.com");
    expect(signUpArgs.password.length).toBeGreaterThanOrEqual(24);
    expect(signUpArgs.options.data).toEqual({
      full_name: "Preeti Sharma",
      role: "user",
      phone: "+919876543210",
    });

    // …then the code is sent to the now-existing account (no lazy creation).
    expect(mockSignInWithOtp).toHaveBeenCalledTimes(2);
    const secondCall = mockSignInWithOtp.mock.calls[1]![0];
    expect(secondCall.options.shouldCreateUser).toBe(false);
  });

  it("sign-up: a returning user (already registered) still receives the code", async () => {
    mockSignInWithOtp
      .mockResolvedValueOnce({ data: {}, error: { message: "Signup not allowed for otp" } })
      .mockResolvedValueOnce({ data: {}, error: null });
    mockSignUp.mockResolvedValueOnce({ data: {}, error: { message: "User already registered" } });

    await expect(
      sendOtp({ email: "existing@example.com", role: "parent", profile: { full_name: "Rakesh", phone: "+919876543210" } }),
    ).resolves.toBeUndefined();

    expect(mockSignInWithOtp).toHaveBeenCalledTimes(2);
  });

  it("sign-up: surfaces a clear error when sign-ups are fully disabled", async () => {
    mockSignInWithOtp.mockResolvedValueOnce({ data: {}, error: { message: "Signup not allowed for otp" } });
    mockSignUp.mockResolvedValueOnce({ data: {}, error: { message: "Signup not allowed" } });

    await expect(
      sendOtp({ email: "blocked@example.com", role: "user", profile: userProfile }),
    ).rejects.toMatchObject({ code: "SIGNUP_DISABLED" });
  });

  it("sign-in: a brand-new email is refused with the NO_ACCOUNT hint (never created)", async () => {
    mockSignInWithOtp.mockResolvedValueOnce({ data: {}, error: { message: "Signup not allowed for otp" } });

    await expect(
      sendOtp({ email: "new@example.com", role: "user", shouldCreateUser: false }),
    ).rejects.toMatchObject({ code: "NO_ACCOUNT" });

    expect(mockSignUp).not.toHaveBeenCalled();
  });
});
