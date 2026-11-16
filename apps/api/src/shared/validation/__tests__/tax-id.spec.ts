import { formatTaxId, isValidCnpj, isValidCpf, isValidTaxId, maskTaxId, onlyDigits } from '../tax-id';

describe('CPF / CNPJ', () => {
  it('aceita CPF válido com e sem pontuação', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224725')).toBe(true);
  });

  it('recusa CPF com dígito errado, tamanho errado ou repetido', () => {
    expect(isValidCpf('529.982.247-24')).toBe(false);
    expect(isValidCpf('5299822472')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('')).toBe(false);
  });

  it('aceita CNPJ válido e recusa inválido', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
    expect(isValidCnpj('11.222.333/0001-80')).toBe(false);
    expect(isValidCnpj('00.000.000/0000-00')).toBe(false);
  });

  it('valida conforme o tipo do cliente (CPF não passa como PJ e vice-versa)', () => {
    expect(isValidTaxId('pf', '529.982.247-25')).toBe(true);
    expect(isValidTaxId('pj', '529.982.247-25')).toBe(false);
    expect(isValidTaxId('pf', '11.222.333/0001-81')).toBe(false);
  });

  it('formata e mascara (CPF nunca aparece inteiro em listagem/auditoria)', () => {
    expect(onlyDigits('529.982.247-25')).toBe('52998224725');
    expect(formatTaxId('52998224725')).toBe('529.982.247-25');
    expect(formatTaxId('11222333000181')).toBe('11.222.333/0001-81');
    expect(maskTaxId('52998224725')).toBe('***.982.247-**');
    expect(maskTaxId(null)).toBeNull();
  });
});
