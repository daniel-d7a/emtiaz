export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('968') && digits.length === 11) return `+${digits}`;
  if (digits.length === 8) return `+968${digits.startsWith('0') ? digits.slice(1) : digits}`;
  return `+${digits}`;
}
