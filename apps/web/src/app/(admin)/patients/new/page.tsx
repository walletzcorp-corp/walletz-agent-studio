'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToken } from '@/hooks/useToken';
import { api } from '@/lib/api';
import { AlertTriangle, Search } from 'lucide-react';

const SEXO = [{ value: '', label: 'Não informado' }, { value: 'F', label: 'Feminino' }, { value: 'M', label: 'Masculino' }, { value: 'O', label: 'Outro' }];
const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

interface DupCandidate {
  id: string;
  name: string;
  cpf?: string;
  dataNasc?: string;
  matchReason: string;
  score: number;
}

export default function NewPatientPage() {
  const router = useRouter();
  const token = useToken();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orgs, setOrgs] = useState<{ id: string; nomeFantasia: string }[]>([]);
  const [candidates, setCandidates] = useState<DupCandidate[]>([]);
  const [dupChecked, setDupChecked] = useState(false);
  const [form, setForm] = useState({
    organizationId: '', name: '', nomeSocial: '', cpf: '', cns: '', rg: '',
    dataNasc: '', sexo: '', estadoCivil: '', nacionalidade: '', naturalidade: '',
    telefone: '', email: '', notes: '',
    logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '',
    marketingBlocked: false,
  });

  useEffect(() => {
    if (!token) return;
    api.get<any>('/organizations?limit=100&status=ATIVA', token)
      .then((r) => setOrgs(r.items ?? r.data ?? []))
      .catch(() => {});
  }, [token]);

  const checkDuplicity = useCallback(async () => {
    if (!form.organizationId || (!form.cpf && !form.cns && !form.name)) return;
    const qs = new URLSearchParams({ organizationId: form.organizationId });
    if (form.cpf) qs.set('cpf', form.cpf);
    if (form.cns) qs.set('cns', form.cns);
    if (form.name) qs.set('name', form.name);
    if (form.dataNasc) qs.set('dataNasc', form.dataNasc);
    if (form.telefone) qs.set('telefone', form.telefone);
    try {
      const result = await api.get<DupCandidate[]>(`/patients/duplicity-check?${qs}`, token!);
      setCandidates(result);
      setDupChecked(true);
    } catch { /* ignore */ }
  }, [form.organizationId, form.cpf, form.cns, form.name, form.dataNasc, form.telefone, token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload: any = { organizationId: form.organizationId, name: form.name, marketingBlocked: form.marketingBlocked };
      const fields: (keyof typeof form)[] = ['nomeSocial','cpf','cns','rg','dataNasc','sexo','estadoCivil','nacionalidade','naturalidade','telefone','email','notes','logradouro','numero','complemento','bairro','cidade','uf','cep'];
      for (const f of fields) { if (form[f]) payload[f] = form[f]; }
      await api.post('/patients', payload, token!);
      router.push('/patients');
    } catch (e: any) {
      setError(e.message ?? 'Erro ao criar paciente');
    } finally {
      setLoading(false);
    }
  }

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6">Novo Paciente</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organização */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Organização</h2>
          <div>
            <label className="label">Organização *</label>
            <select className="input" required value={form.organizationId} onChange={set('organizationId')}>
              <option value="">Selecione…</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.nomeFantasia}</option>)}
            </select>
          </div>
        </div>

        {/* Dados pessoais */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Dados Pessoais</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Nome completo *</label>
              <input className="input" required value={form.name} onChange={set('name')} placeholder="Nome legal" />
            </div>
            <div className="col-span-2">
              <label className="label">Nome social</label>
              <input className="input" value={form.nomeSocial} onChange={set('nomeSocial')} placeholder="Como o paciente prefere ser chamado" />
            </div>
            <div>
              <label className="label">CPF</label>
              <input className="input" value={form.cpf} onChange={set('cpf')} placeholder="000.000.000-00" />
            </div>
            <div>
              <label className="label">CNS (Cartão Nacional de Saúde)</label>
              <input className="input" value={form.cns} onChange={set('cns')} placeholder="000 0000 0000 0000" />
            </div>
            <div>
              <label className="label">RG</label>
              <input className="input" value={form.rg} onChange={set('rg')} placeholder="0000000-0" />
            </div>
            <div>
              <label className="label">Data de Nascimento</label>
              <input type="date" className="input" value={form.dataNasc} onChange={set('dataNasc')} />
            </div>
            <div>
              <label className="label">Sexo</label>
              <select className="input" value={form.sexo} onChange={set('sexo')}>
                {SEXO.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Estado civil</label>
              <input className="input" value={form.estadoCivil} onChange={set('estadoCivil')} placeholder="Solteiro, Casado…" />
            </div>
            <div>
              <label className="label">Nacionalidade</label>
              <input className="input" value={form.nacionalidade} onChange={set('nacionalidade')} placeholder="Brasileiro" />
            </div>
            <div>
              <label className="label">Naturalidade</label>
              <input className="input" value={form.naturalidade} onChange={set('naturalidade')} placeholder="Cidade - UF" />
            </div>
          </div>
        </div>

        {/* Contato */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Contato</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Telefone</label>
              <input className="input" value={form.telefone} onChange={set('telefone')} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input type="email" className="input" value={form.email} onChange={set('email')} placeholder="paciente@email.com" />
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Endereço</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="label">Logradouro</label>
              <input className="input" value={form.logradouro} onChange={set('logradouro')} placeholder="Rua, Av., Travessa…" />
            </div>
            <div>
              <label className="label">Número</label>
              <input className="input" value={form.numero} onChange={set('numero')} placeholder="123" />
            </div>
            <div>
              <label className="label">Complemento</label>
              <input className="input" value={form.complemento} onChange={set('complemento')} placeholder="Apto, Bloco…" />
            </div>
            <div>
              <label className="label">Bairro</label>
              <input className="input" value={form.bairro} onChange={set('bairro')} />
            </div>
            <div>
              <label className="label">CEP</label>
              <input className="input" value={form.cep} onChange={set('cep')} placeholder="00000-000" />
            </div>
            <div className="col-span-2">
              <label className="label">Cidade</label>
              <input className="input" value={form.cidade} onChange={set('cidade')} />
            </div>
            <div>
              <label className="label">UF</label>
              <select className="input" value={form.uf} onChange={set('uf')}>
                <option value="">—</option>
                {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Privacidade */}
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Privacidade</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-slate-300"
              checked={form.marketingBlocked}
              onChange={(e) => setForm((f) => ({ ...f, marketingBlocked: e.target.checked }))}
            />
            <span className="text-sm text-slate-700">Bloquear comunicações de marketing</span>
          </label>
          <p className="text-xs text-slate-400">O bloqueio de marketing não impede comunicações assistenciais (confirmações de consulta, resultados, etc.)</p>
          <div>
            <label className="label">Observações clínicas</label>
            <textarea className="input min-h-[60px]" value={form.notes} onChange={set('notes')} placeholder="Observações relevantes…" />
          </div>
        </div>

        {/* Verificação de duplicidade */}
        {form.organizationId && (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Verificação de Duplicidade</h2>
              <button type="button" className="btn-secondary text-xs py-1 flex items-center gap-1" onClick={checkDuplicity}>
                <Search size={12} /> Verificar
              </button>
            </div>
            {dupChecked && candidates.length === 0 && (
              <p className="text-sm text-emerald-700">Nenhum cadastro semelhante encontrado.</p>
            )}
            {candidates.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  <span className="text-sm font-medium text-amber-800">{candidates.length} possível(is) duplicidade(s) encontrada(s). Revise antes de continuar.</span>
                </div>
                <div className="space-y-2">
                  {candidates.map((c) => (
                    <div key={c.id} className="bg-white border border-amber-200 rounded p-2 text-xs">
                      <span className="font-medium">{c.name}</span>
                      {c.cpf && <span className="text-slate-500 ml-2">CPF: {c.cpf}</span>}
                      {c.dataNasc && <span className="text-slate-500 ml-2">Nasc: {new Date(c.dataNasc).toLocaleDateString('pt-BR')}</span>}
                      <span className="ml-2 text-amber-700 font-medium">{c.matchReason}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-amber-700 mt-2">Não funda cadastros automaticamente — verifique com a equipe se é o mesmo paciente.</p>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Salvando…' : 'Criar Paciente'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
