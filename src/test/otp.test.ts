import { describe, it, expect } from "vitest";
import { normalizePhone, isValidIndianMobile, isValidEmail } from "../lib/otp";

describe("otp helpers (Supabase Auth, Email OTP)", () => {
  it("normalizes Indian mobile numbers to E.164", () => {
    expect(normalizePhone("9876543210")).toBe("+919876543210");
    expect(normalizePhone("+91 98765 43210")).toBe("+919876543210");
    expect(normalizePhone("09876543210")).toBe("+919876543210");
    expect(normalizePhone("919876543210")).toBe("+919876543210");
  });

  it("validates Indian mobile numbers", () => {
    expect(isValidIndianMobile("9876543210")).toBe(true);
    expect(isValidIndianMobile("1234567890")).toBe(false);
    expect(isValidIndianMobile("+91 98765 43210")).toBe(true);
  });

  it("rejects non-10-digit and leading-zero inputs that are too short", () => {
    expect(isValidIndianMobile("98765")).toBe(false);
    expect(isValidIndianMobile("")).toBe(false);
  });

  it("validates email addresses (the OTP channel)", () => {
    expect(isValidEmail("preeti@example.com")).toBe(true);
    expect(isValidEmail("  preeti@example.com  ")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("preeti@")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});
