'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToken } from '@/hooks/useToken';
import { api } from '@/lib/api';

export default function NewServicePage() {
  const router = useRouter();
  const token = useToken();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orgs, setOrgs] = useState<{ id: string; nomeFantasia: string }[]>([]);
  const [specialties, setSpecialties] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    organizationId: '',
    specialtyId: '',
    code: '',
    name: '',
    description: '',
    type: '',
    durationMin: '30',
    requiresProfessional: true,
    requiresRoom: true,
    priceAmount: '',
    priceValidFrom: new Date().toISOString().slice(0, 10),
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload: any = {
        ...form,
        durationMin: Number(form.durationMin),
        specialtyId: form.specialtyId || undefined,
        priceAmount: form.priceAmount ? Number(form.priceAmount) : undefined,
        priceValidFrom: form.priceAmount ? form.priceValidFrom : undefined,
      };
      await api.post('/services', payload, token);
      router.push('/services');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1>Novo Serviço</h1>
        <p className="text-slate-500 text-sm mt-1">Cadastrar consulta, procedimento ou exame</p>
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
          <label className="label">Especialidade</label>
          <select name="specialtyId" value={form.specialtyId} onChange={handleChange} className="input">
            <option value="">Nenhuma</option>
            {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Código *</label>
            <input name="code" value={form.code} onChange={handleChange} required className="input" placeholder="ex: CONS-CLINICA" />
          </div>
          <div>
            <label className="label">Nome *</label>
            <input name="name" value={form.name} onChange={handleChange} required className="input" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Tipo *</label>
            <select name="type" value={form.type} onChange={handleChange} required className="input">
              <option value="">Selecione...</option>
              <option value="consulta">Consulta</option>
              <option value="procedimento">Procedimento</option>
              <option value="exame">Exame</option>
            </select>
          </div>
          <div>
            <label className="label">Duração (min) *</label>
            <input name="durationMin" type="number" min="5" step="5" value={form.durationMin} onChange={handleChange} required className="input" />
          </div>
        </div>

        <div>
          <label className="label">Descrição</label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={2} className="input" />
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" name="requiresProfessional" checked={form.requiresProfessional} onChange={handleChange} className="rounded" />
            Requer profissional
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" name="requiresRoom" checked={form.requiresRoom} onChange={handleChange} className="rounded" />
            Requer sala/recurso
          </label>
        </div>

        <div className="border-t border-surface-border pt-4">
          <p className="text-sm font-medium text-slate-700 mb-3">Tabela de preços (opcional)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Valor (R$)</label>
              <input name="priceAmount" type="number" min="0" step="0.01" value={form.priceAmount} onChange={handleChange} className="input" placeholder="0,00" />
            </div>
            <div>
              <label className="label">Válido a partir de</label>
              <input name="priceValidFrom" type="date" value={form.priceValidFrom} onChange={handleChange} className="input" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : 'Criar Serviço'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">Cancelar</button>
        </div>
      </form>
    </div>
  );
}
