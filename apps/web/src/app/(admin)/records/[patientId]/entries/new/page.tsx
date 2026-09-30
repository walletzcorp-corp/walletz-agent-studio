'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToken } from '@/hooks/useToken';
import { api } from '@/lib/api';
import { ArrowLeft, Save, Thermometer, Activity, Weight, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function NewEntryPage({ params }: { params: { patientId: string } }) {
  const { patientId } = params;
  const searchParams = useSearchParams();
  const recordId = searchParams.get('recordId') ?? '';
  const orgId = searchParams.get('orgId') ?? '';
  const router = useRouter();
  const token = useToken();

  const [units, setUnits] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [cid, setCid] = useState('');
  const [cidResults, setCidResults] = useState<any[]>([]);

  const [form, setForm] = useState({
    unitId: '',
    templateId: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  });
  const [vitals, setVitals] = useState({
    temperatureC: '', systolicBp: '', diastolicBp: '', heartRate: '',
    respiratoryRate: '', oxygenSatPct: '', weightKg: '', heightCm: '', painScale: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [unsaved, setUnsaved] = useState(false);

  useEffect(() => {
    if (!token || !orgId) return;
    api.get<any>(`/units?organizationId=${orgId}`, token).then((r) => {
      const list = r.items ?? r.data ?? (Array.isArray(r) ? r : []);
      setUnits(list);
      if (list.length > 0) setForm((f) => ({ ...f, unitId: list[0].id }));
    }).catch(() => {});
    api.get<any>(`/pep-templates?organizationId=${orgId}`, token).then(setTemplates).catch(() => {});
  }, [token, orgId]);

  const searchCid = useCallback(
    async (q: string) => {
      if (!token || q.length < 2) { setCidResults([]); return; }
      const results = await api.get<any[]>(`/cid?q=${encodeURIComponent(q)}&limit=10`, token).catch(() => []);
      setCidResults(results);
    },
    [token],
  );

  useEffect(() => {
    const t = setTimeout(() => searchCid(cid), 300);
    return () => clearTimeout(t);
  }, [cid, searchCid]);

  // RF-PEP-011: warn on accidental navigation with unsaved text
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (unsaved) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [unsaved]);

  function setField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setUnsaved(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.unitId) { setError('Selecione uma unidade'); return; }
    setSaving(true);
    setError('');
    try {
      const entry = await api.post<any>('/clinical-entries', {
        recordId,
        organizationId: orgId,
        unitId: form.unitId,
        templateId: form.templateId || undefined,
        subjective: form.subjective || undefined,
        objective: form.objective || undefined,
        assessment: form.assessment || undefined,
        plan: form.plan || undefined,
      }, token);

      const hasVitals = Object.values(vitals).some((v) => v !== '');
      if (hasVitals) {
        const payload: Record<string, number | undefined> = {};
        if (vitals.temperatureC) payload.temperatureC = +vitals.temperatureC;
        if (vitals.systolicBp) payload.systolicBp = +vitals.systolicBp;
        if (vitals.diastolicBp) payload.diastolicBp = +vitals.diastolicBp;
        if (vitals.heartRate) payload.heartRate = +vitals.heartRate;
        if (vitals.respiratoryRate) payload.respiratoryRate = +vitals.respiratoryRate;
        if (vitals.oxygenSatPct) payload.oxygenSatPct = +vitals.oxygenSatPct;
        if (vitals.weightKg) payload.weightKg = +vitals.weightKg;
        if (vitals.heightCm) payload.heightCm = +vitals.heightCm;
        if (vitals.painScale) payload.painScale = +vitals.painScale;
        await api.post<any>(`/clinical-entries/${entry.id}/vitals`, payload, token);
      }

      setUnsaved(false);
      router.push(`/records/${patientId}/entries/${entry.id}`);
    } catch (err: any) {
      setError(err.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href={`/records/${patientId}`} className="text-slate-400 hover:text-slate-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Nova Evolução Clínica</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Unidade */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Contexto do Atendimento</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unidade *</label>
              <select
                required
                value={form.unitId}
                onChange={(e) => setField('unitId', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Selecione...</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Modelo (opcional)</label>
              <select
                value={form.templateId}
                onChange={(e) => setField('templateId', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Sem modelo</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* SOAP */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-slate-800">Evolução SOAP</h2>
          {[
            { key: 'subjective', label: 'S — Subjetivo (queixa, história)', rows: 4 },
            { key: 'objective', label: 'O — Objetivo (exame físico, achados)', rows: 4 },
            { key: 'assessment', label: 'A — Avaliação / Diagnóstico', rows: 3 },
            { key: 'plan', label: 'P — Plano Terapêutico', rows: 3 },
          ].map(({ key, label, rows }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
              <textarea
                rows={rows}
                value={(form as any)[key]}
                onChange={(e) => setField(key, e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-y"
                placeholder={label}
              />
            </div>
          ))}
        </div>

        {/* Sinais Vitais */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-600" /> Sinais Vitais
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'temperatureC', label: 'Temperatura (°C)', placeholder: '36.5' },
              { key: 'systolicBp', label: 'PA Sistólica (mmHg)', placeholder: '120' },
              { key: 'diastolicBp', label: 'PA Diastólica (mmHg)', placeholder: '80' },
              { key: 'heartRate', label: 'FC (bpm)', placeholder: '72' },
              { key: 'respiratoryRate', label: 'FR (rpm)', placeholder: '16' },
              { key: 'oxygenSatPct', label: 'SpO2 (%)', placeholder: '98' },
              { key: 'weightKg', label: 'Peso (kg)', placeholder: '70' },
              { key: 'heightCm', label: 'Altura (cm)', placeholder: '170' },
              { key: 'painScale', label: 'Dor (0–10)', placeholder: '0' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={(vitals as any)[key]}
                  onChange={(e) => { setVitals((v) => ({ ...v, [key]: e.target.value })); setUnsaved(true); }}
                  placeholder={placeholder}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* CID-10 autocomplete hint */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold text-slate-800 mb-3">Buscar CID-10</h2>
          <input
            type="text"
            value={cid}
            onChange={(e) => setCid(e.target.value)}
            placeholder="Digite o código ou descrição (ex: I10, hipertensão)"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
          {cidResults.length > 0 && (
            <ul className="mt-2 border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {cidResults.map((c) => (
                <li key={c.id} className="px-3 py-2 flex gap-2 text-sm hover:bg-slate-50 cursor-pointer"
                    onClick={() => { setField('assessment', (form.assessment ? form.assessment + '\n' : '') + `${c.code} — ${c.description}`); setCid(''); setCidResults([]); }}>
                  <span className="font-mono text-blue-600 shrink-0">{c.code}</span>
                  <span className="text-slate-700">{c.description}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium px-6 py-2.5 rounded-lg disabled:opacity-60"
          >
            <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar Rascunho'}
          </button>
          <Link href={`/records/${patientId}`} className="px-6 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
