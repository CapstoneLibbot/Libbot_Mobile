export const formatCurrency = (value: number): string => `${value.toFixed(2)} USD`;

export const formatPercent = (value: number): string => `${value}%`;

export const formatRoleLabel = (role: string): string =>
  role.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
