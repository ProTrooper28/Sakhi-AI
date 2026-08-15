/** Minimum password length required at account creation. */
export const MIN_PASSWORD_LENGTH = 8;

export type PasswordScore = 0 | 1 | 2 | 3 | 4;

/**
 * Lightweight client-side strength estimate (never a substitute for a real
 * password policy — it's a UX meter only).
 *
 *   0/1 → Weak, 2 → Fair, 3 → Good, 4 → Strong
 */
export const scorePassword = (password: string): PasswordScore => {
  if (!password) return 0;
  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4) as PasswordScore;
};

export const passwordStrengthLabel = (score: PasswordScore): string => {
  if (score <= 1) return "Weak";
  if (score === 2) return "Fair";
  if (score === 3) return "Good";
  return "Strong";
};

export const passwordStrengthColor = (score: PasswordScore): string => {
  if (score <= 1) return "#D4455C";
  if (score === 2) return "#F39C12";
  if (score === 3) return "#3D9970";
  return "#2E7D56";
};

export const validatePassword = (password: string, confirm: string): string | null => {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirm) return "Passwords do not match.";
  return null;
};
