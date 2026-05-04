export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{2,24}$/;

export const PASSWORD_RULES = {
  minLength: (value: string) => value.length >= 8,
  hasUppercase: (value: string) => /[A-Z]/.test(value),
  hasLowercase: (value: string) => /[a-z]/.test(value),
  hasNumber: (value: string) => /\d/.test(value),
  hasSpecial: (value: string) => /[^A-Za-z0-9]/.test(value),
};

export const getPasswordChecks = (password: string) => ({
  minLength: PASSWORD_RULES.minLength(password),
  hasUppercase: PASSWORD_RULES.hasUppercase(password),
  hasLowercase: PASSWORD_RULES.hasLowercase(password),
  hasNumber: PASSWORD_RULES.hasNumber(password),
  hasSpecial: PASSWORD_RULES.hasSpecial(password),
});

export const isPasswordValid = (password: string) => {
  return Object.values(getPasswordChecks(password)).every(Boolean);
};

export const isUsernameValid = (username: string) => USERNAME_PATTERN.test(username);
