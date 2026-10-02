'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToken } from '@/hooks/useToken';
import { api } from '@/lib/api';
import { maskCpf, validateCpf, maskPhone } from '@/lib/masks';
import { CheckCircle2 } from 'lucide-react';

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

export default function NewProfessionalPage() {
  const router = useRouter();
  const token = useToken();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [orgs, setOrgs] = useState<{ id: string; nomeFantasia: string }[]>([]);
  const [specialties, setSpecialties] = useState<{ id: string; name: string }[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [form, setForm] = useState({
    organizationId: '',
    name: '',
    cpf: '',
    email: '',
    telefone: '',
    councilType: '',
    councilNumber: '',
    councilUf: '',
  });

  useEffect(() => {
    if (!token) return;
    api.get<any>('/organizations?limit=100&status=ATIVA', token)
      .then((r) => setOrgs(r.items ?? []))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!form.organizationId || !token) return;
    api.get<any>(`/specialties?organizationId=${form.organizationId}&active=true&limit=100`, token)
      .then((r) => setSpecialties(r.items ?? []))
      .catch(() => {});
  }, [form.organizationId, token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  function handleCpf(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = maskCpf(e.target.value);
    setForm((f) => ({ ...f, cpf: masked }));
    const raw = masked.replace(/\D/g, '');
    if (raw.length === 11) {
      setCpfError(validateCpf(raw) ? '' : 'CPF inválido');
    } else {
      setCpfError('');
    }
  }

  const toggleSpecialty = (id: string) =>
    setSelectedSpecialties((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const rawCpf = form.cpf.replace(/\D/g, '');
    if (rawCpf.length > 0 && rawCpf.length < 11) { setError('CPF incompleto.'); return; }
    if (rawCpf.length === 11 && !validateCpf(rawCpf)) { setError('CPF inválido — verifique os dígitos.'); return; }
    setLoading(true);
    try {
      const payload: any = { ...form, specialtyIds: selectedSpecialties };
      if (rawCpf) payload.cpf = rawCpf; else delete payload.cpf;
      await api.post('/professionals', payload, token);
      router.push('/professionals');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1>Novo Profissional</h1>
        <p className="text-slate-500 text-sm mt-1">Cadastrar profissional de saúde</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        <div>
          <label className="label">Organização *</label>
          <select name="organizationId" value={form.organizationId} onChange={handleChange} required className="input">
            <option value="">Selecione...</option>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.nomeFantasia}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Nome completo *</label>
          <input name="name" value={form.name} onChange={handleChange} required className="input" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">CPF</label>
            <div className="relative">
              <input
                className={`input pr-9 ${cpfError ? 'border-red-400 focus:ring-red-300' : form.cpf.replace(/\D/g,'').length === 11 && !cpfError ? 'border-emerald-400' : ''}`}
                value={form.cpf}
                onChange={handleCpf}
                placeholder="000.000.000-00"
                inputMode="numeric"
              />
              {form.cpf.replace(/\D/g,'').length === 11 && !cpfError && (
                <CheckCircle2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
              )}
            </div>
            {cpfError && <p className="text-red-500 text-xs mt-1">{cpfError}</p>}
          </div>
          <div>
            <label className="label">Telefone</label>
            <input
              className="input"
              value={form.telefone}
              onChange={(e) => setForm((f) => ({ ...f, telefone: maskPhone(e.target.value) }))}
              placeholder="(00) 00000-0000"
              inputMode="numeric"
            />
          </div>
        </div>

        <div>
          <label className="label">E-mail profissional</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} className="input" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Conselho</label>
            <select name="councilType" value={form.councilType} onChange={handleChange} className="input">
              <option value="">—</option>
              <option value="CRM">CRM</option>
              <option value="CRO">CRO</option>
              <option value="COREN">COREN</option>
              <option value="CRF">CRF</option>
              <option value="CREFITO">CREFITO</option>
              <option value="CRP">CRP</option>
              <option value="OUTRO">Outro</option>
            </select>
          </div>
          <div>
            <label className="label">Número</label>
            <input name="councilNumber" value={form.councilNumber} onChange={handleChange} className="input" />
          </div>
          <div>
            <label className="label">UF</label>
            <select name="councilUf" value={form.councilUf} onChange={handleChange} className="input">
              <option value="">—</option>
              {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
        </div>

        {specialties.length > 0 && (
          <div>
            <label className="label">Especialidades</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {specialties.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSpecialty(s.id)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    selectedSpecialties.includes(s.id)
                      ? 'bg-brand-emerald text-white border-brand-emerald'
                      : 'border-slate-300 text-slate-600 hover:border-brand-emerald'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : 'Cadastrar Profissional'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">Cancelar</button>
        </div>
      </form>
    </div>
  );
}
