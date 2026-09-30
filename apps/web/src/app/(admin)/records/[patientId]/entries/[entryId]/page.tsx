'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToken } from '@/hooks/useToken';
import { api } from '@/lib/api';
import {
  ArrowLeft, PenLine, FileBadge, AlertOctagon, Printer, PlusCircle, Clock, CheckCircle2, FileEdit,
} from 'lucide-react';

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  AGUARDANDO_ASSINATURA: 'Aguardando Assinatura',
  ASSINADO: 'Assinado',
  CANCELADO: 'Cancelado',
};
const STATUS_COLOR: Record<string, string> = {
  RASCUNHO: 'bg-amber-100 text-amber-800 border-amber-200',
  AGUARDANDO_ASSINATURA: 'bg-blue-100 text-blue-800 border-blue-200',
  ASSINADO: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  CANCELADO: 'bg-red-100 text-red-800 border-red-200',
};

export default function EntryDetailPage({ params }: { params: { patientId: string; entryId: string } }) {
  const { patientId, entryId } = params;
  const token = useToken();
  const [entry, setEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showAddendum, setShowAddendum] = useState(false);
  const [addendumContent, setAddendumContent] = useState('');
  const [addendumReason, setAddendumReason] = useState('');
  const [signerCouncil, setSignerCouncil] = useState('');
  const [showSign, setShowSign] = useState(false);

  function load() {
    if (!token) return;
    api.get<any>(`/clinical-entries/${entryId}`, token)
      .then(setEntry)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [token, entryId]);

  async function doAction(fn: () => Promise<any>) {
    setActionLoading(true);
    setActionError('');
    try { await fn(); load(); } catch (e: any) { setActionError(e.message); } finally { setActionLoading(false); }
  }

  async function requestSignature() {
    await doAction(() => api.post(`/clinical-entries/${entryId}/request-signature`, {}, token));
  }

  async function sign() {
    await doAction(async () => {
      const result = await api.post<any>(`/clinical-entries/${entryId}/sign`, { signerCouncil }, token);
      if (result.warning) alert(result.warning);
    });
    setShowSign(false);
  }

  async function submitAddendum() {
    if (!addendumContent.trim() || !addendumReason.trim()) { setActionError('Conteúdo e motivo são obrigatórios'); return; }
    await doAction(() => api.post(`/clinical-entries/${entryId}/addenda`, { content: addendumContent, reason: addendumReason }, token));
    setShowAddendum(false);
    setAddendumContent('');
    setAddendumReason('');
  }

  async function logPrint() {
    await api.post(`/clinical-entries/${entryId}/log-print`, {}, token).catch(() => {});
    window.print();
  }

  if (!token || loading) return <div className="p-8 text-slate-400">Carregando...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!entry) return null;

  const isSigned = entry.status === 'ASSINADO';
  const isDraft = entry.status === 'RASCUNHO';
  const isWaiting = entry.status === 'AGUARDANDO_ASSINATURA';

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href={`/records/${patientId}`} className="text-slate-400 hover:text-slate-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Evolução Clínica</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLOR[entry.status]}`}>
              {STATUS_LABEL[entry.status]}
            </span>
            {entry.signature?.status === 'DEMO' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                [DEMONSTRAÇÃO — sem validade jurídica]
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString('pt-BR')}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {isDraft && (
            <Link
              href={`/records/${patientId}/entries/new?recordId=${entry.recordId}&orgId=${entry.organizationId}`}
              className="flex items-center gap-1 text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <FileEdit className="w-3 h-3" /> Editar
            </Link>
          )}
          {(isDraft || isWaiting) && (
            <button
              onClick={requestSignature}
              disabled={actionLoading}
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              <FileBadge className="w-3 h-3" /> Solicitar Assinatura
            </button>
          )}
          {isWaiting && (
            <button
              onClick={() => setShowSign(true)}
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              <CheckCircle2 className="w-3 h-3" /> Assinar
            </button>
          )}
          {!isDraft && (
            <button
              onClick={() => setShowAddendum(true)}
              className="flex items-center gap-1 text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <PlusCircle className="w-3 h-3" /> Adendo
            </button>
          )}
          <button
            onClick={logPrint}
            className="flex items-center gap-1 text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <Printer className="w-3 h-3" /> Imprimir
          </button>
        </div>
      </div>

      {actionError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{actionError}</div>}

      {/* Sign modal */}
      {showSign && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="font-semibold text-slate-900 mb-2">Assinar Evolução</h2>
            <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded p-2 mb-4">
              ⚠ [MODO DEMONSTRAÇÃO] A assinatura será simulada. Configure um provedor ICP-Brasil para assinatura com validade legal.
            </p>
            <label className="block text-sm font-medium text-slate-700 mb-1">Conselho profissional (ex: CRM/SP 123456)</label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4"
              value={signerCouncil}
              onChange={(e) => setSignerCouncil(e.target.value)}
              placeholder="CRM/SP 12345"
            />
            <div className="flex gap-3">
              <button onClick={sign} disabled={actionLoading} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                {actionLoading ? 'Assinando...' : 'Confirmar Assinatura'}
              </button>
              <button onClick={() => setShowSign(false)} className="px-4 border border-slate-200 rounded-lg text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* SOAP */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 mb-4">
        {[
          { key: 'subjective', label: 'S — Subjetivo' },
          { key: 'objective', label: 'O — Objetivo' },
          { key: 'assessment', label: 'A — Avaliação' },
          { key: 'plan', label: 'P — Plano' },
        ].map(({ key, label }) => (
          entry[key] && (
            <div key={key}>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</h3>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{entry[key]}</p>
            </div>
          )
        ))}
      </div>

      {/* Vitals */}
      {entry.vitalSigns && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Sinais Vitais</h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {[
              ['Temperatura', `${entry.vitalSigns.temperatureC ?? '—'}°C`],
              ['PA', `${entry.vitalSigns.systolicBp ?? '—'}/${entry.vitalSigns.diastolicBp ?? '—'} mmHg`],
              ['FC', `${entry.vitalSigns.heartRate ?? '—'} bpm`],
              ['FR', `${entry.vitalSigns.respiratoryRate ?? '—'} rpm`],
              ['SpO2', `${entry.vitalSigns.oxygenSatPct ?? '—'}%`],
              ['Dor', `${entry.vitalSigns.painScale ?? '—'}/10`],
              ['Peso', `${entry.vitalSigns.weightKg ?? '—'} kg`],
              ['Altura', `${entry.vitalSigns.heightCm ?? '—'} cm`],
              ['IMC', `${entry.vitalSigns.bmi ?? '—'}`],
            ].map(([l, v]) => (
              <div key={l} className="bg-slate-50 rounded-lg p-2">
                <p className="text-xs text-slate-500">{l}</p>
                <p className="font-medium text-slate-800">{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attachments */}
      {(entry.attachments ?? []).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Anexos</h3>
          <ul className="space-y-1">
            {entry.attachments.map((a: any) => (
              <li key={a.id} className="flex items-center gap-2 text-sm">
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011'}/api/v1/attachments/${a.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 hover:underline"
                >
                  {a.fileName}
                </a>
                {a.description && <span className="text-slate-400">— {a.description}</span>}
                <span className="text-xs text-slate-300">{a.sizeBytes ? `${Math.round(a.sizeBytes / 1024)}KB` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* RF-PEP-009: signature info */}
      {entry.signature && (
        <div className={`border rounded-xl p-4 mb-4 ${entry.signature.status === 'DEMO' ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-4 h-4 ${entry.signature.status === 'DEMO' ? 'text-orange-600' : 'text-emerald-600'}`} />
            <span className="text-sm font-medium">
              {entry.signature.status === 'DEMO' ? '[DEMONSTRAÇÃO] Assinatura Simulada' : 'Assinado Digitalmente'}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            {entry.signature.signerName} · {entry.signature.signerCouncil ?? '—'}
          </p>
          {entry.signature.signedAt && (
            <p className="text-xs text-slate-400">{new Date(entry.signature.signedAt).toLocaleString('pt-BR')}</p>
          )}
        </div>
      )}

      {/* RF-PEP-022: copy origin */}
      {entry.copiedFrom && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800 flex items-center gap-2">
          <AlertOctagon className="w-4 h-4" />
          Conteúdo reutilizado de evolução anterior ({new Date(entry.copiedFrom.createdAt).toLocaleDateString('pt-BR')})
        </div>
      )}

      {/* Addenda */}
      {(entry.addenda ?? []).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1">
            <PenLine className="w-3 h-3" /> Adendos
          </h3>
          <div className="space-y-3">
            {entry.addenda.map((add: any) => (
              <div key={add.id} className="border-l-2 border-teal-300 pl-3">
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{add.content}</p>
                <p className="text-xs text-slate-400 mt-1">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {add.authorName} · {new Date(add.createdAt).toLocaleString('pt-BR')} · Motivo: {add.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add addendum */}
      {showAddendum && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <h3 className="font-semibold text-slate-800 mb-3">Novo Adendo</h3>
          <p className="text-xs text-slate-500 mb-3">
            O adendo é permanente e não apaga nem altera o conteúdo original da evolução.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Conteúdo do adendo *</label>
              <textarea rows={4} value={addendumContent} onChange={(e) => setAddendumContent(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Descreva a correção ou complemento..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Motivo *</label>
              <input type="text" value={addendumReason} onChange={(e) => setAddendumReason(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Ex: Correção de dosagem" />
            </div>
            <div className="flex gap-3">
              <button onClick={submitAddendum} disabled={actionLoading} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-60">
                {actionLoading ? 'Salvando...' : 'Salvar Adendo'}
              </button>
              <button onClick={() => { setShowAddendum(false); setAddendumContent(''); setAddendumReason(''); }}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
