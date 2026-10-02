'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToken } from '@/hooks/useToken';
import { api } from '@/lib/api';
import { maskCnpj, validateCnpj, maskPhone, maskCep, lookupCep, lookupCnpj, CnpjResult } from '@/lib/masks';
import { Search, Loader2, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export default function NewOrganizationPage() {
  const router = useRouter();
  const token = useToken();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cnpjError, setCnpjError] = useState('');
  const [cnpjLookupLoading, setCnpjLookupLoading] = useState(false);
  const [cnpjLookupResult, setCnpjLookupResult] = useState<CnpjResult | null>(null);
  const [cnpjLookupError, setCnpjLookupError] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [form, setForm] = useState({
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    email: '',
    telefone: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
  });

  async function handleCnpj(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = maskCnpj(e.target.value);
    setForm((f) => ({ ...f, cnpj: masked }));
    const raw = masked.replace(/\D/g, '');
    if (raw.length === 14) {
      if (!validateCnpj(raw)) {
        setCnpjError('CNPJ inválido — verifique os dígitos');
        setCnpjLookupResult(null);
        setCnpjLookupError('');
      } else {
        setCnpjError('');
        setCnpjLookupResult(null);
        setCnpjLookupError('');
        setCnpjLookupLoading(true);
        try {
          const result = await lookupCnpj(raw);
          setCnpjLookupResult(result);
          if (result) {
            setForm((f) => ({
              ...f,
              razaoSocial: result.razaoSocial || f.razaoSocial,
              nomeFantasia: result.nomeFantasia || f.nomeFantasia,
              logradouro: result.logradouro || f.logradouro,
              numero: result.numero || f.numero,
              complemento: result.complemento || f.complemento,
              bairro: result.bairro || f.bairro,
              cidade: result.municipio || f.cidade,
              uf: result.uf || f.uf,
              cep: result.cep ? maskCep(result.cep) : f.cep,
              telefone: result.telefone ? maskPhone(result.telefone) : f.telefone,
              email: result.email || f.email,
            }));
          }
        } catch (err: any) {
          setCnpjLookupError(err.message ?? 'Não foi possível consultar o CNPJ — preencha manualmente.');
        } finally {
          setCnpjLookupLoading(false);
        }
      }
    } else {
      setCnpjError('');
      setCnpjLookupResult(null);
      setCnpjLookupError('');
    }
  }

  async function handleCep(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = maskCep(e.target.value);
    setForm((f) => ({ ...f, cep: masked }));
    if (masked.replace(/\D/g, '').length === 8) {
      setCepLoading(true);
      const result = await lookupCep(masked);
      setCepLoading(false);
      if (result) {
        setForm((f) => ({
          ...f,
          logradouro: result.logradouro || f.logradouro,
          bairro: result.bairro || f.bairro,
          cidade: result.cidade || f.cidade,
          uf: result.uf || f.uf,
        }));
      }
    }
  }

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const rawCnpj = form.cnpj.replace(/\D/g, '');
    if (rawCnpj.length !== 14) { setError('Informe o CNPJ completo (14 dígitos).'); return; }
    if (!validateCnpj(rawCnpj)) { setError('CNPJ inválido — verifique os dígitos verificadores.'); return; }
    setLoading(true);
    try {
      const payload: any = {
        cnpj: rawCnpj,
        razaoSocial: form.razaoSocial,
        nomeFantasia: form.nomeFantasia || form.razaoSocial,
      };
      if (form.email) payload.email = form.email;
      if (form.telefone) payload.telefone = form.telefone.replace(/\D/g, '');
      if (form.cep) payload.cep = form.cep.replace(/\D/g, '');
      if (form.logradouro) payload.logradouro = form.logradouro;
      if (form.numero) payload.numero = form.numero;
      if (form.complemento) payload.complemento = form.complemento;
      if (form.bairro) payload.bairro = form.bairro;
      if (form.cidade) payload.cidade = form.cidade;
      if (form.uf) payload.uf = form.uf;
      await api.post('/organizations', payload, token);
      router.push('/organizations');
    } catch (err: any) {
      setError(err.message ?? 'Erro ao criar organização');
    } finally {
      setLoading(false);
    }
  };

  const cnpjComplete = form.cnpj.replace(/\D/g, '').length === 14;
  const cnpjValid = cnpjComplete && validateCnpj(form.cnpj.replace(/\D/g, ''));

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Nova Organização</h1>
        <p className="text-slate-500 text-sm mt-1">Preencha os dados da organização</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        {/* CNPJ first */}
        <div>
          <label className="label">CNPJ *</label>
          <div className="relative">
            <input
              value={form.cnpj}
              onChange={handleCnpj}
              required
              placeholder="00.000.000/0000-00"
              className={`input pr-9 ${cnpjError ? 'border-red-400 focus:ring-red-300' : cnpjValid ? 'border-emerald-400' : ''}`}
              inputMode="numeric"
            />
            {cnpjValid && (
              <CheckCircle2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
            )}
          </div>
          {cnpjError && <p className="text-red-500 text-xs mt-1">{cnpjError}</p>}
          {cnpjLookupLoading && (
            <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> Consultando dados cadastrais…
            </p>
          )}
          {cnpjLookupError && (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
              <span>{cnpjLookupError} — preencha os campos manualmente.</span>
            </div>
          )}
          {cnpjLookupResult && (
            <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-800">
              <div className="flex items-start gap-2">
                <Info size={13} className="flex-shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <p className="font-semibold">{cnpjLookupResult.razaoSocial}</p>
                  {cnpjLookupResult.nomeFantasia && <p className="text-emerald-700">{cnpjLookupResult.nomeFantasia}</p>}
                  <p className={`mt-0.5 font-medium ${cnpjLookupResult.situacao === 'ATIVA' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    Situação: {cnpjLookupResult.situacao}
                  </p>
                  <p className="mt-1 text-emerald-600 italic">{cnpjLookupResult.fonte}</p>
                </div>
              </div>
            </div>
          )}
          <p className="text-slate-400 text-xs mt-1">O CNPJ é validado pelos dígitos verificadores</p>
        </div>

        <div>
          <label className="label">Razão Social *</label>
          <input value={form.razaoSocial} onChange={set('razaoSocial')} required className="input" placeholder="Nome empresarial conforme CNPJ" />
        </div>

        <div>
          <label className="label">Nome Fantasia</label>
          <input value={form.nomeFantasia} onChange={set('nomeFantasia')} className="input" placeholder="Como a clínica é conhecida" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">E-mail</label>
            <input type="email" value={form.email} onChange={set('email')} className="input" placeholder="contato@clinica.com.br" />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input
              value={form.telefone}
              onChange={(e) => setForm(f => ({ ...f, telefone: maskPhone(e.target.value) }))}
              className="input"
              placeholder="(00) 00000-0000"
              inputMode="numeric"
            />
          </div>
        </div>

        {/* Endereço */}
        <div className="border-t border-slate-100 pt-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">Endereço (opcional)</p>

          <div className="mb-3">
            <label className="label">CEP</label>
            <div className="relative">
              <input
                value={form.cep}
                onChange={handleCep}
                className="input pr-9"
                placeholder="00000-000"
                inputMode="numeric"
              />
              {cepLoading && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
            </div>
          </div>

          <div className="mb-3">
            <label className="label">Logradouro</label>
            <input value={form.logradouro} onChange={set('logradouro')} className="input" placeholder="Rua, Av., Travessa..." />
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="label">Número</label>
              <input value={form.numero} onChange={set('numero')} className="input" placeholder="123" />
            </div>
            <div className="col-span-2">
              <label className="label">Complemento</label>
              <input value={form.complemento} onChange={set('complemento')} className="input" placeholder="Sala, Andar..." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="label">Bairro</label>
              <input value={form.bairro} onChange={set('bairro')} className="input" />
            </div>
            <div>
              <label className="label">Cidade</label>
              <input value={form.cidade} onChange={set('cidade')} className="input" />
            </div>
          </div>

          <div className="w-24">
            <label className="label">UF</label>
            <select value={form.uf} onChange={set('uf')} className="input">
              <option value="">—</option>
              {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading || !!cnpjError} className="btn-primary">
            {loading ? 'Salvando...' : 'Criar Organização'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
