'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useToken } from '@/hooks/useToken';
import { api } from '@/lib/api';
import { ArrowLeft, FilePlus, AlertTriangle, Pill, Stethoscope, History, ChevronRight } from 'lucide-react';

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  AGUARDANDO_ASSINATURA: 'Aguardando Assinatura',
  ASSINADO: 'Assinado',
  CANCELADO: 'Cancelado',
};
const STATUS_COLOR: Record<string, string> = {
  RASCUNHO: 'bg-amber-100 text-amber-800',
  AGUARDANDO_ASSINATURA: 'bg-blue-100 text-blue-800',
  ASSINADO: 'bg-emerald-100 text-emerald-800',
  CANCELADO: 'bg-red-100 text-red-800',
};
const ALLERGY_SEV: Record<string, string> = { grave: 'text-red-700', moderada: 'text-amber-700', leve: 'text-green-700' };

export default function PatientRecordPage({ params }: { params: { patientId: string } }) {
  const { patientId } = params;
  const searchParams = useSearchParams();
  const token = useToken();
  const [record, setRecord] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [orgId, setOrgId] = useState(searchParams.get('orgId') ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'timeline' | 'allergies' | 'medications' | 'diagnoses' | 'history'>('timeline');

  useEffect(() => {
    if (!token) return;
    api.get<any>('/organizations', token).then((r) => {
      const list = r.items ?? r.data ?? [];
      setOrgs(list);
      if (!orgId && list.length > 0) setOrgId(list[0].id);
    });
  }, [token]);

  useEffect(() => {
    if (!token || !orgId) return;
    api.get<any>(`/patients/${patientId}`, token).then(setPatient).catch(() => {});
    setLoading(true);
    api
      .get<any>(`/records/patient/${patientId}?organizationId=${orgId}`, token)
      .then(setRecord)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, patientId, orgId]);

  if (!token) return <div className="p-8 text-slate-500">Carregando...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href={`/patients/${patientId}`} className="text-slate-400 hover:text-slate-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Prontuário</h1>
          {patient && <p className="text-slate-500 text-sm">{patient.name} · CPF: {patient.cpf ?? '—'}</p>}
        </div>
        {record && (
          <Link
            href={`/records/${patientId}/entries/new?recordId=${record.id}&orgId=${orgId}`}
            className="ml-auto flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            <FilePlus className="w-4 h-4" /> Nova Evolução
          </Link>
        )}
      </div>

      {orgs.length > 1 && (
        <select className="mb-4 border border-slate-200 rounded-lg px-3 py-2 text-sm" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.nomeFantasia}</option>)}
        </select>
      )}

      {loading && <div className="text-slate-400 text-sm">Carregando prontuário...</div>}
      {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}

      {record && (
        <>
          {/* Tab nav */}
          <div className="flex gap-1 border-b border-slate-200 mb-6">
            {[
              { key: 'timeline', label: 'Evoluções', icon: <History className="w-4 h-4" /> },
              { key: 'allergies', label: 'Alergias', icon: <AlertTriangle className="w-4 h-4" /> },
              { key: 'medications', label: 'Medicamentos', icon: <Pill className="w-4 h-4" /> },
              { key: 'diagnoses', label: 'Diagnósticos', icon: <Stethoscope className="w-4 h-4" /> },
              { key: 'history', label: 'Antecedentes', icon: <History className="w-4 h-4" /> },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as any)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.key ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Timeline */}
          {tab === 'timeline' && (
            <div className="space-y-3">
              {(record.entries ?? []).length === 0 && (
                <div className="text-center py-12 text-slate-400">Nenhuma evolução registrada</div>
              )}
              {(record.entries ?? []).map((entry: any) => (
                <Link
                  key={entry.id}
                  href={`/records/${patientId}/entries/${entry.id}`}
                  className="flex items-start gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-teal-300 transition-colors group"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[entry.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {STATUS_LABEL[entry.status] ?? entry.status}
                      </span>
                      {entry.signature?.status === 'DEMO' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">[DEMONSTRAÇÃO]</span>
                      )}
                      <span className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2">{entry.subjective ?? <em className="text-slate-400">Sem queixa registrada</em>}</p>
                    {entry.vitalSigns && (
                      <p className="text-xs text-slate-500 mt-1">
                        PA: {entry.vitalSigns.systolicBp}/{entry.vitalSigns.diastolicBp} · FC: {entry.vitalSigns.heartRate} · Peso: {entry.vitalSigns.weightKg}kg
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 mt-1" />
                </Link>
              ))}
            </div>
          )}

          {/* Allergies */}
          {tab === 'allergies' && (
            <div className="space-y-2">
              {(record.allergies ?? []).length === 0 && <div className="text-center py-12 text-slate-400">Nenhuma alergia registrada</div>}
              {(record.allergies ?? []).map((a: any) => (
                <div key={a.id} className="p-4 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 ${ALLERGY_SEV[a.severity] ?? 'text-slate-500'}`} />
                    <span className="font-medium text-slate-800">{a.substance}</span>
                    <span className="text-xs text-slate-500">{a.severity ?? '—'}</span>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${a.status === 'ATIVO' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>{a.status}</span>
                  </div>
                  {a.reaction && <p className="text-sm text-slate-600 mt-1">Reação: {a.reaction}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Medications */}
          {tab === 'medications' && (
            <div className="space-y-2">
              {(record.medications ?? []).length === 0 && <div className="text-center py-12 text-slate-400">Nenhum medicamento registrado</div>}
              {(record.medications ?? []).map((m: any) => (
                <div key={m.id} className="p-4 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-teal-600" />
                    <span className="font-medium text-slate-800">{m.name}</span>
                    {m.dosage && <span className="text-sm text-slate-500">{m.dosage}</span>}
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${m.status === 'EM_USO' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>{m.status}</span>
                  </div>
                  {m.frequency && <p className="text-sm text-slate-600 mt-1">{m.frequency} · {m.route ?? '—'}</p>}
                  {m.indication && <p className="text-xs text-slate-400 mt-0.5">Indicação: {m.indication}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Diagnoses */}
          {tab === 'diagnoses' && (
            <div className="space-y-2">
              {(record.diagnoses ?? []).length === 0 && <div className="text-center py-12 text-slate-400">Nenhum diagnóstico registrado</div>}
              {(record.diagnoses ?? []).map((d: any) => (
                <div key={d.id} className="p-4 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono">{d.cidCode ?? '—'}</span>
                    <span className="font-medium text-slate-800">{d.description}</span>
                    <span className="ml-auto text-xs text-slate-400">{d.type}</span>
                  </div>
                  {d.notes && <p className="text-sm text-slate-600 mt-1">{d.notes}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Medical History */}
          {tab === 'history' && (
            <div className="space-y-2">
              {(record.medicalHistory ?? []).length === 0 && <div className="text-center py-12 text-slate-400">Nenhum antecedente registrado</div>}
              {(record.medicalHistory ?? []).map((h: any) => (
                <div key={h.id} className="p-4 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{h.category}</span>
                    <span className="font-medium text-slate-800">{h.description}</span>
                  </div>
                  {h.date && <p className="text-xs text-slate-400 mt-0.5">{new Date(h.date).toLocaleDateString('pt-BR')}</p>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
