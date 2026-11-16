/** Validação de CPF e CNPJ (dígitos verificadores da Receita Federal). */

export type CustomerType = 'pf' | 'pj';

export const onlyDigits = (value: string): string => value.replace(/\D/g, '');

const allSameDigit = (digits: string): boolean => /^(\d)\1+$/.test(digits);

export function isValidCpf(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 11 || allSameDigit(d)) return false;
  const check = (len: number): number => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(d[9]) && check(10) === Number(d[10]);
}

export function isValidCnpj(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 14 || allSameDigit(d)) return false;
  const check = (len: number): number => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * weights[i]!;
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return check(12) === Number(d[12]) && check(13) === Number(d[13]);
}

export function isValidTaxId(type: CustomerType, value: string): boolean {
  return type === 'pf' ? isValidCpf(value) : isValidCnpj(value);
}

export function formatTaxId(digits: string): string {
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return digits;
}

/** Esconde parte do documento para listagens e auditoria (LGPD): ***.456.789-** */
export function maskTaxId(digits: string | null | undefined): string | null {
  if (!digits) return null;
  if (digits.length === 11) return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
  if (digits.length === 14) return formatTaxId(digits); // CNPJ é dado público da empresa
  return '***';
}
