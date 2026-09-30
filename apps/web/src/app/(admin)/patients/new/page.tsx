'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToken } from '@/hooks/useToken';
import { api } from '@/lib/api';

const SEXO_OPTIONS = [
  { value: '', label: 'Não informado' },
  { value: 'F', label: 'Feminino' },
  { value: 'M', label: 'Masculino' },
  { value: 'O', label: 'Outro' },
];

export default function NewPatientPage() {
  const router = useRouter();
  const token = useToken();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orgs, setOrgs] = useState<{ id: string; nomeFantasia: string }[]>([]);
  const [form, setForm] = useState({
    organizationId: '',
    name: '',
    cpf: '',
    dataNasc: '',
    sexo: '',
    telefone: '',
    email: '',
    notes: '',
  });

  useEffect(() => {
    if (!token) return;
    api.get<any>('/organizations?limit=100&status=ATIVA', token)
      .then((r) => setOrgs(r.data ?? r.items ?? []))
      .catch(() => {});
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload: any = {
        organizationId: form.organizationId,
        name: form.name,
      };
      if (form.cpf) payload.cpf = form.cpf.replace(/\D/g, '');
      if (form.dataNasc) payload.dataNasc = form.dataNasc;
      if (form.sexo) payload.sexo = form.sexo;
      if (form.telefone) payload.telefone = form.telefone;
      if (form.email) payload.email = form.email;
      if (form.notes) payload.notes = form.notes;

      await api.post('/patients', payload, token!);
      router.push('/patients');
    } catch (e: any) {
      setError(e.message ?? 'Erro ao criar paciente');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-6">Novo Paciente</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Organização *</label>
          <select
            className="input"
            required
            value={form.organizationId}
            onChange={(e) => setForm({ ...form, organizationId: e.target.value })}
          >
            <option value="">Selecione…</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.nomeFantasia}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Nome completo *</label>
          <input
            className="input"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nome do paciente"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">CPF</label>
            <input
              className="input"
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: e.target.value })}
              placeholder="000.000.000-00"
            />
          </div>
          <div>
            <label className="label">Data de Nascimento</label>
            <input
              type="date"
              className="input"
              value={form.dataNasc}
              onChange={(e) => setForm({ ...form, dataNasc: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Sexo</label>
            <select
              className="input"
              value={form.sexo}
              onChange={(e) => setForm({ ...form, sexo: e.target.value })}
            >
              {SEXO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Telefone</label>
            <input
              className="input"
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>
        </div>

        <div>
          <label className="label">E-mail</label>
          <input
            type="email"
            className="input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="paciente@email.com"
          />
        </div>

        <div>
          <label className="label">Observações</label>
          <textarea
            className="input min-h-[80px]"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Alergias, observações clínicas relevantes…"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Salvando…' : 'Criar Paciente'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
