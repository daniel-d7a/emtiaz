export type Country = 'OM' | 'EG';
export type Currency = 'OMR' | 'EGP';

export function countryCurrency(country: Country): Currency {
  return country === 'EG' ? 'EGP' : 'OMR';
}

export function normalizePhone(input: string, country?: Country): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('968') && digits.length === 11) return `+${digits}`;
  if (digits.startsWith('20') && (digits.length === 12 || digits.length === 13)) return `+${digits}`;
  if (country === 'EG' || (!country && digits.startsWith('01') && digits.length === 11)) {
    if (digits.startsWith('01') && digits.length === 11) {
      return `+20${digits.slice(1)}`;
    }
    if (digits.startsWith('1') && digits.length === 10) {
      return `+20${digits}`;
    }
  }
  if (country === 'OM' || !country) {
    if (digits.length === 8) {
      return `+968${digits.startsWith('0') ? digits.slice(1) : digits}`;
    }
  }
  return `+${digits}`;
}

export function isValidPhoneForCountry(phone: string, country?: Country): boolean {
  if (!country) {
    return /^\+[1-9]\d{6,14}$/.test(phone);
  }
  if (country === 'OM') {
    return /^\+968\d{8}$/.test(phone);
  }
  if (country === 'EG') {
    return /^\+20\d{9,10}$/.test(phone);
  }
  return /^\+[1-9]\d{6,14}$/.test(phone);
}
