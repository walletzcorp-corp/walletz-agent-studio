'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToken } from '@/hooks/useToken';
import { api } from '@/lib/api';

const RESOURCE_TYPES = [
  { value: 'consultorio', label: 'Consultório' },
  { value: 'sala_procedimento', label: 'Sala de Procedimento' },
  { value: 'poltrona', label: 'Poltrona' },
  { value: 'maca', label: 'Maca' },
  { value: 'equipamento', label: 'Equipamento' },
];

export default function NewResourcePage() {
  const router = useRouter();
  const token = useToken();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [units, setUnits] = useState<{ id: string; name: string; code: string }[]>([]);
  const [form, setForm] = useState({
    unitId: '',
    code: '',
    name: '',
    type: '',
    description: '',
    capacity: '1',
    floor: '',
    location: '',
    restrictions: '',
  });

  useEffect(() => {
    if (!token) return;
    api.get<any>('/units?limit=100&status=ATIVA', token)
      .then((r) => setUnits(r.items ?? []))
      .catch(() => {});
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/resources', { ...form, capacity: Number(form.capacity) }, token);
      router.push('/resources');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1>Novo Recurso</h1>
        <p className="text-slate-500 text-sm mt-1">Cadastrar sala, poltrona ou equipamento</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        <div>
          <label className="label">Unidade *</label>
          <select name="unitId" value={form.unitId} onChange={handleChange} required className="input">
            <option value="">Selecione...</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.code})</option>
            ))}
          </select>
          {units.length === 0 && token && (
            <p className="text-xs text-yellow-600 mt-1">Nenhuma unidade ativa encontrada. Ative uma unidade primeiro.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Código *</label>
            <input name="code" value={form.code} onChange={handleChange} required className="input" placeholder="ex: CONS-01" />
          </div>
          <div>
            <label className="label">Nome *</label>
            <input name="name" value={form.name} onChange={handleChange} required className="input" />
          </div>
        </div>

        <div>
          <label className="label">Tipo *</label>
          <select name="type" value={form.type} onChange={handleChange} required className="input">
            <option value="">Selecione...</option>
            {RESOURCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Capacidade</label>
            <input name="capacity" type="number" min="1" value={form.capacity} onChange={handleChange} className="input" />
          </div>
          <div>
            <label className="label">Andar</label>
            <input name="floor" value={form.floor} onChange={handleChange} className="input" placeholder="ex: 2" />
          </div>
          <div>
            <label className="label">Localização</label>
            <input name="location" value={form.location} onChange={handleChange} className="input" placeholder="ex: Ala B" />
          </div>
        </div>

        <div>
          <label className="label">Descrição</label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={2} className="input" />
        </div>

        <div>
          <label className="label">Restrições</label>
          <input name="restrictions" value={form.restrictions} onChange={handleChange} className="input" placeholder="ex: Apenas profissionais com CRM" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : 'Criar Recurso'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">Cancelar</button>
        </div>
      </form>
    </div>
  );
}
