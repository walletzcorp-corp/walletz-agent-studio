'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useToken } from '@/hooks/useToken';
import { api } from '@/lib/api';
import {
  AlertTriangle, Bell, FileText, Users, Shield, Calendar, Activity,
  ChevronLeft, Plus, Check, X, ShieldCheck, ShieldOff,
} from 'lucide-react';

const TABS = [
  { id: 'dados', label: 'Dados' },
  { id: 'alertas', label: 'Alertas' },
  { id: 'consentimentos', label: 'Consentimentos' },
  { id: 'contatos', label: 'Contatos' },
  { id: 'convenios', label: 'Convênios' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'vinculos', label: 'Vínculos' },
  { id: 'formularios', label: 'Formulários' },
  { id: 'timeline', label: 'Linha do Tempo' },
] as const;

type TabId = typeof TABS[number]['id'];

function Severity({ s }: { s: string }) {
  const map: Record<string, string> = { CRITICA: 'bg-red-100 text-red-700', ALTA: 'bg-orange-100 text-orange-700', MEDIA: 'bg-yellow-100 text-yellow-700', BAIXA: 'bg-blue-100 text-blue-700' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[s] ?? 'bg-slate-100 text-slate-600'}`}>{s}</span>;
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = { VIGENTE: 'text-emerald-700', REVOGADO: 'text-red-600', EXPIRADO: 'text-slate-500', PENDENTE: 'text-amber-600' };
  return <span className={`text-xs font-medium ${map[s] ?? 'text-slate-500'}`}>{s}</span>;
}

export default function PatientDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = useToken();
  const patientId = params.id as string;
  const [orgId, setOrgId] = useState(searchParams.get('orgId') ?? '');
  const [orgs, setOrgs] = useState<{ id: string; nomeFantasia: string }[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('dados');
  const [patient, setPatient] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [insurances, setInsurances] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [links, setLinks] = useState<any>(null);
  const [forms, setForms] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  // Load org list for selector
  useEffect(() => {
    if (!token) return;
    api.get<any>('/organizations?limit=100&status=ATIVA', token)
      .then((r) => {
        const list = r.items ?? r.data ?? [];
        setOrgs(list);
        if (!orgId && list.length > 0) setOrgId(list[0].id);
      })
      .catch(() => {});
  }, [token]);

  const loadPatient = useCallback(async () => {
    if (!orgId || !token) return;
    setLoading(true);
    setError('');
    try {
      const p = await api.get<any>(`/patients/${patientId}`, token);
      setPatient(p);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [patientId, orgId, token]);

  useEffect(() => { loadPatient(); }, [loadPatient]);

  const loadTab = useCallback(async (tab: TabId) => {
    if (!orgId || !token) return;
    const qs = `?organizationId=${orgId}`;
    try {
      if (tab === 'alertas') setAlerts(await api.get(`/patients/${patientId}/alerts${qs}`, token));
      if (tab === 'consentimentos') setConsents(await api.get(`/patients/${patientId}/consents${qs}`, token));
      if (tab === 'contatos') setContacts(await api.get(`/patients/${patientId}/contacts${qs}`, token));
      if (tab === 'convenios') setInsurances(await api.get(`/patients/${patientId}/insurance${qs}`, token));
      if (tab === 'documentos') setDocuments(await api.get(`/patients/${patientId}/documents${qs}`, token));
      if (tab === 'vinculos') setLinks(await api.get(`/patients/${patientId}/links${qs}`, token));
      if (tab === 'formularios') setForms(await api.get(`/patients/${patientId}/forms${qs}`, token));
      if (tab === 'timeline') setTimeline(await api.get(`/patients/${patientId}/timeline${qs}`, token));
    } catch (e: any) {
      setActionMsg(`Erro: ${e.message}`);
    }
  }, [patientId, orgId, token]);

  useEffect(() => {
    if (activeTab !== 'dados') loadTab(activeTab);
  }, [activeTab, loadTab]);

  async function revokeConsent(id: string) {
    const reason = prompt('Motivo da revogação:');
    if (!reason) return;
    try {
      await api.patch(`/patients/${patientId}/consents/${id}/revoke?organizationId=${orgId}`, { reason }, token!);
      setActionMsg('Consentimento revogado');
      loadTab('consentimentos');
    } catch (e: any) { setActionMsg(`Erro: ${e.message}`); }
  }

  async function resolveAlert(id: string) {
    try {
      await api.patch(`/patients/${patientId}/alerts/${id}/resolve?organizationId=${orgId}`, {}, token!);
      setActionMsg('Alerta resolvido');
      loadTab('alertas');
    } catch (e: any) { setActionMsg(`Erro: ${e.message}`); }
  }

  if (loading && !patient) return <div className="p-6 text-slate-400">Carregando…</div>;
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">{error}</div>;
  if (!patient) return null;

  const activeAlerts = (patient.alerts ?? []).filter((a: any) => a.active);

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2">
            <ChevronLeft size={14} /> Voltar
          </button>
          <h1 className="flex items-center gap-2">
            {patient.name}
            {patient.nomeSocial && <span className="text-slate-400 text-base font-normal">({patient.nomeSocial})</span>}
          </h1>
          {patient.cpf && <p className="text-slate-500 text-sm font-mono mt-0.5">CPF: {patient.cpf}</p>}
        </div>
        <div className="flex items-center gap-2">
          {patient.marketingBlocked && (
            <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs">
              <ShieldOff size={12} /> Marketing bloqueado
            </span>
          )}
          <select
            className="input text-sm py-1.5"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
          >
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.nomeFantasia}</option>)}
          </select>
        </div>
      </div>

      {/* Clinical alerts banner */}
      {activeAlerts.length > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-red-600" />
            <span className="text-sm font-semibold text-red-700">Alertas Clínicos Ativos ({activeAlerts.length})</span>
          </div>
          {activeAlerts.map((a: any) => (
            <div key={a.id} className="flex items-center gap-2 text-xs text-red-700 mt-1">
              <Severity s={a.severity} /> {a.message}
            </div>
          ))}
        </div>
      )}

      {actionMsg && (
        <div className="mb-3 text-sm bg-blue-50 border border-blue-200 text-blue-700 rounded px-3 py-2">{actionMsg}</div>
      )}

      {/* Tabs */}
      <div className="border-b border-surface-border mb-4 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-brand-emerald text-brand-emerald'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Dados ─── */}
      {activeTab === 'dados' && (
        <div className="card space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Sexo', patient.sexo ?? '—'],
              ['Data de nascimento', patient.dataNasc ? new Date(patient.dataNasc).toLocaleDateString('pt-BR') : '—'],
              ['Estado civil', patient.estadoCivil ?? '—'],
              ['Nacionalidade', patient.nacionalidade ?? '—'],
              ['Naturalidade', patient.naturalidade ?? '—'],
              ['CNS', patient.cns ?? '—'],
              ['RG', patient.rg ?? '—'],
              ['Telefone', patient.telefone ?? '—'],
              ['E-mail', patient.email ?? '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
                <p className="text-slate-800 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
          {(patient.logradouro || patient.cidade) && (
            <div className="pt-2 border-t border-surface-border">
              <span className="text-xs text-slate-400 uppercase tracking-wide">Endereço</span>
              <p className="text-slate-800 mt-0.5">
                {[patient.logradouro, patient.numero, patient.complemento].filter(Boolean).join(', ')}
                {patient.bairro && <>, {patient.bairro}</>}
                {patient.cidade && <> — {patient.cidade}</>}
                {patient.uf && <> / {patient.uf}</>}
                {patient.cep && <> · {patient.cep}</>}
              </p>
            </div>
          )}
          {patient.notes && (
            <div className="pt-2 border-t border-surface-border">
              <span className="text-xs text-slate-400 uppercase tracking-wide">Observações</span>
              <p className="text-slate-700 mt-0.5 whitespace-pre-wrap">{patient.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* ─── Alertas ─── */}
      {activeTab === 'alertas' && (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <p className="text-slate-400 text-sm">Nenhum alerta cadastrado.</p>
          ) : (
            alerts.map((a: any) => (
              <div key={a.id} className={`card p-3 flex items-start justify-between gap-3 ${a.active ? '' : 'opacity-50'}`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Severity s={a.severity} />
                    <span className="text-xs text-slate-500">{a.type}</span>
                    {!a.active && <span className="text-xs text-slate-400">Resolvido</span>}
                  </div>
                  <p className="text-sm text-slate-800">{a.message}</p>
                  <p className="text-xs text-slate-400 mt-1">{new Date(a.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                {a.active && (
                  <button onClick={() => resolveAlert(a.id)} className="shrink-0 btn-secondary text-xs py-1 flex items-center gap-1">
                    <Check size={12} /> Resolver
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Consentimentos ─── */}
      {activeTab === 'consentimentos' && (
        <div className="space-y-3">
          {consents.length === 0 ? (
            <p className="text-slate-400 text-sm">Nenhum consentimento registrado.</p>
          ) : (
            consents.map((c: any) => (
              <div key={c.id} className="card p-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-800">{c.type}</span>
                    <StatusBadge s={c.status} />
                  </div>
                  <p className="text-xs text-slate-500">
                    Canal: {c.channel} · Versão: {c.version} · {new Date(c.signedAt).toLocaleDateString('pt-BR')}
                  </p>
                  {c.status === 'REVOGADO' && (
                    <p className="text-xs text-red-600 mt-1">Revogado em {new Date(c.revokedAt).toLocaleDateString('pt-BR')} — {c.revocationReason}</p>
                  )}
                </div>
                {c.status === 'VIGENTE' && (
                  <button onClick={() => revokeConsent(c.id)} className="shrink-0 btn-secondary text-xs py-1 flex items-center gap-1 text-red-600">
                    <ShieldOff size={12} /> Revogar
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Contatos ─── */}
      {activeTab === 'contatos' && (
        <div className="space-y-2">
          {contacts.length === 0 ? (
            <p className="text-slate-400 text-sm">Nenhum contato cadastrado.</p>
          ) : (
            contacts.map((c: any) => (
              <div key={c.id} className="card p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">{c.name} <span className="text-slate-400 font-normal text-xs">({c.relationship})</span></p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {c.telefone && <span>{c.telefone}</span>}
                    {c.email && <span className="ml-2">{c.email}</span>}
                  </p>
                </div>
                <div className="flex gap-1">
                  {c.isPrimary && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs">Principal</span>}
                  {c.isEmergency && <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs">Emergência</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Convênios ─── */}
      {activeTab === 'convenios' && (
        <div className="space-y-2">
          {insurances.length === 0 ? (
            <p className="text-slate-400 text-sm">Nenhum convênio cadastrado.</p>
          ) : (
            insurances.map((i: any) => (
              <div key={i.id} className="card p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">{i.operator} — {i.planName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {i.cardNumber && <span>Cartão: {i.cardNumber}</span>}
                    {i.validUntil && <span className="ml-2">Válido até: {new Date(i.validUntil).toLocaleDateString('pt-BR')}</span>}
                  </p>
                </div>
                <span className={`text-xs font-medium ${i.active ? 'text-emerald-700' : 'text-slate-400'}`}>{i.active ? 'Ativo' : 'Inativo'}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Documentos ─── */}
      {activeTab === 'documentos' && (
        <div className="space-y-2">
          {documents.length === 0 ? (
            <p className="text-slate-400 text-sm">Nenhum documento anexado.</p>
          ) : (
            documents.map((d: any) => (
              <div key={d.id} className="card p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">{d.fileName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{d.type} · {d.mimeType} {d.sizeBytes ? `· ${(d.sizeBytes / 1024).toFixed(0)} KB` : ''}</p>
                  {d.description && <p className="text-xs text-slate-400">{d.description}</p>}
                </div>
                <span className="text-xs text-slate-400">{new Date(d.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Vínculos ─── */}
      {activeTab === 'vinculos' && (
        <div className="space-y-4">
          {links && (
            <>
              {links.asGuardian?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Este paciente é responsável por:</h3>
                  <div className="space-y-2">
                    {links.asGuardian.map((l: any) => (
                      <div key={l.id} className="card p-3">
                        <p className="text-sm font-medium">{l.dependent?.name}</p>
                        <p className="text-xs text-slate-500">{l.linkType}{l.validUntil ? ` · Até ${new Date(l.validUntil).toLocaleDateString('pt-BR')}` : ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {links.asDependent?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Responsável(is) deste paciente:</h3>
                  <div className="space-y-2">
                    {links.asDependent.map((l: any) => (
                      <div key={l.id} className="card p-3">
                        <p className="text-sm font-medium">{l.guardian?.name}</p>
                        <p className="text-xs text-slate-500">{l.linkType}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!links.asGuardian?.length && !links.asDependent?.length && (
                <p className="text-slate-400 text-sm">Nenhum vínculo cadastrado.</p>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── Formulários ─── */}
      {activeTab === 'formularios' && (
        <div className="space-y-2">
          {forms.length === 0 ? (
            <p className="text-slate-400 text-sm">Nenhum formulário respondido.</p>
          ) : (
            forms.map((f: any) => (
              <div key={f.id} className="card p-3">
                <p className="text-sm font-medium text-slate-800">{f.form?.name}</p>
                <p className="text-xs text-slate-500">Versão {f.formVersion} · {new Date(f.submittedAt).toLocaleDateString('pt-BR')}</p>
                {f.notes && <p className="text-xs text-slate-400 mt-1">{f.notes}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Linha do Tempo ─── */}
      {activeTab === 'timeline' && (
        <div className="space-y-2">
          {timeline.length === 0 ? (
            <p className="text-slate-400 text-sm">Nenhum evento na linha do tempo.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-200" />
              {timeline.map((e: any) => (
                <div key={e.id} className="flex gap-4 pl-8 relative pb-4">
                  <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-brand-emerald border-2 border-white" />
                  <div className="card p-2 flex-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-700">{e.type}</span>
                      <span className="text-xs text-slate-400">{new Date(e.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{e.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
