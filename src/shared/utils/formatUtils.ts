export const formatCurrency = (value: number): string => `${value.toFixed(2)} USD`;

export const formatPercent = (value: number): string => `${Math.round(value)}%`;

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};
