// ── CPF ──────────────────────────────────────────────────────────────────────

export function maskCpf(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function validateCpf(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(d[10]);
}

// ── CNPJ ─────────────────────────────────────────────────────────────────────

export function maskCnpj(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function validateCnpj(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (digits: string, weights: number[]) => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) sum += parseInt(digits[i]) * weights[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  return calc(d, w1) === parseInt(d[12]) && calc(d, w2) === parseInt(d[13]);
}

// ── Phone ─────────────────────────────────────────────────────────────────────

export function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// ── CEP ──────────────────────────────────────────────────────────────────────

export function maskCep(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export interface CepResult {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export async function lookupCep(cep: string): Promise<CepResult | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${digits}`);
    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    return {
      logradouro: data.street ?? '',
      bairro: data.neighborhood ?? '',
      cidade: data.city ?? '',
      uf: data.state ?? '',
    };
  } catch {
    try {
      const res2 = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!res2.ok) throw new Error('not found');
      const data2 = await res2.json();
      if (data2.erro) return null;
      return {
        logradouro: data2.logradouro ?? '',
        bairro: data2.bairro ?? '',
        cidade: data2.localidade ?? '',
        uf: data2.uf ?? '',
      };
    } catch {
      return null;
    }
  }
}

// ── Email ─────────────────────────────────────────────────────────────────────

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── CNPJ lookup (BrasilAPI — dados espelhados da Receita Federal) ─────────────

export interface CnpjResult {
  razaoSocial: string;
  nomeFantasia: string;
  situacao: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  fonte: string; // transparência da fonte usada
}

export async function lookupCnpj(cnpj: string): Promise<CnpjResult | null> {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return null;
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    if (d.message) throw new Error(d.message);
    return {
      razaoSocial: d.razao_social ?? '',
      nomeFantasia: d.nome_fantasia ?? '',
      situacao: d.descricao_situacao_cadastral ?? '',
      logradouro: d.logradouro,
      numero: d.numero,
      complemento: d.complemento,
      bairro: d.bairro,
      municipio: d.municipio,
      uf: d.uf,
      cep: d.cep?.replace(/\D/g, ''),
      telefone: d.ddd_telefone_1,
      email: d.email,
      fonte: 'BrasilAPI (dados espelhados da Receita Federal — não é consulta direta ao órgão)',
    };
  } catch (err: any) {
    throw new Error(err.message ?? 'Serviço de consulta de CNPJ indisponível');
  }
}
