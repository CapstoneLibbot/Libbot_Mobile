export const isEmailValid = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const isPasswordValid = (value: string): boolean => value.trim().length >= 6;
