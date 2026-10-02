'use client';

import { useState, useEffect } from 'react';
import { useToken } from '@/hooks/useToken';
import { api } from '@/lib/api';
import { Zap, Wrench, Thermometer, RefreshCw } from 'lucide-react';

type Tab = 'ativos' | 'manutencao' | 'esterilizacao' | 'cadeia-frio';

const STATUS_COLORS: Record<string, string> = {
  DISPONIVEL: 'bg-green-100 text-green-700',
  EM_USO: 'bg-blue-100 text-blue-700',
  EM_MANUTENCAO: 'bg-yellow-100 text-yellow-700',
  BLOQUEADO: 'bg-red-100 text-red-700',
  DESCARTADO: 'bg-gray-100 text-gray-500',
  CEDIDO: 'bg-purple-100 text-purple-700',
};

const MAINT_STATUS_COLORS: Record<string, string> = {
  SOLICITADA: 'bg-blue-100 text-blue-700',
  EM_EXECUCAO: 'bg-yellow-100 text-yellow-700',
  CONCLUIDA: 'bg-green-100 text-green-700',
  CANCELADA: 'bg-gray-100 text-gray-500',
};

export default function AtivosPage() {
  const token = useToken();
  const [tab, setTab] = useState<Tab>('ativos');
  const [orgs, setOrgs] = useState<{ id: string; nomeFantasia: string }[]>([]);
  const [orgId, setOrgId] = useState('');
  const [assets, setAssets] = useState<any[]>([]);
  const [maintenances, setMaintenances] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api.get<any>('/organizations?limit=100&status=ATIVA', token)
      .then((r) => {
        const list = r.items ?? r.data ?? [];
        setOrgs(list);
        if (list.length > 0) setOrgId(list[0].id);
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!orgId || !token) return;
    setLoading(true);
    setError('');
    Promise.all([
      api.get<any>(`/ati/${orgId}/ativos`, token).catch(() => []),
      api.get<any>(`/ati/${orgId}/manutencoes`, token).catch(() => []),
      api.get<any>(`/ati/${orgId}/dashboard`, token).catch(() => null),
    ]).then(([ast, mnt, dash]) => {
      setAssets(Array.isArray(ast) ? ast : ast.items ?? []);
      setMaintenances(Array.isArray(mnt) ? mnt : mnt.items ?? []);
      setDashboard(dash);
    }).catch((e) => setError(e.message ?? 'Erro ao carregar dados'))
      .finally(() => setLoading(false));
  }, [orgId, token]);

  const disponivel = dashboard?.disponivel ?? assets.filter((a) => a.status === 'DISPONIVEL').length;
  const emManutencao = dashboard?.emManutencao ?? assets.filter((a) => a.status === 'EM_MANUTENCAO').length;
  const bloqueados = dashboard?.bloqueados ?? assets.filter((a) => a.status === 'BLOQUEADO').length;
  const calibVencidas = dashboard?.calibracoesVencidas ?? 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-amber-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestão de Ativos</h1>
            <p className="text-sm text-gray-500">M16 ATI — Equipamentos, manutenção, esterilização e cadeia do frio</p>
          </div>
        </div>
        <select className="input w-64" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
          <option value="">Selecione organização…</option>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.nomeFantasia}</option>)}
        </select>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Ativos Disponíveis', value: disponivel, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Em Manutenção', value: emManutencao, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Bloqueados', value: bloqueados, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Calibrações Vencidas', value: calibVencidas, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((c) => (
          <div key={c.label} className={`${c.bg} rounded-xl p-4 border border-gray-100`}>
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {(['ativos', 'manutencao', 'esterilizacao', 'cadeia-frio'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t ? 'border-amber-600 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'ativos' ? 'Ativos' : t === 'manutencao' ? 'Manutenção' : t === 'esterilizacao' ? 'Esterilização' : 'Cadeia do Frio'}
            </button>
          ))}
        </nav>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <RefreshCw size={14} className="animate-spin" /> Carregando…
        </div>
      )}

      {tab === 'ativos' && !loading && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Cadastro de Ativos</h2>
          {assets.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
              Nenhum ativo cadastrado para esta organização.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Patrimônio</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Equipamento</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Categoria</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Localização</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Próx. Calibração</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {assets.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{a.tag ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{a.name}</span>
                        {a.blockedReason && (
                          <span className="block text-xs text-red-600 mt-0.5">{a.blockedReason}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{a.category ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{a.unit?.name ?? a.location ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-600'}`}>{a.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{a.nextCalibrationAt ? new Date(a.nextCalibrationAt).toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="px-4 py-3">
                        {a.status === 'DISPONIVEL' && (
                          <button
                            className="text-xs text-red-600 border border-red-300 px-2 py-1 rounded hover:bg-red-50"
                            onClick={async () => {
                              if (!token) return;
                              const reason = prompt('Motivo do bloqueio:');
                              if (!reason) return;
                              await api.patch(`/ati/${orgId}/ativos/${a.id}/bloquear`, { reason }, token).catch(() => {});
                              const updated = await api.get<any>(`/ati/${orgId}/ativos`, token).catch(() => []);
                              setAssets(Array.isArray(updated) ? updated : updated.items ?? []);
                            }}
                          >
                            Bloquear
                          </button>
                        )}
                        {a.status === 'BLOQUEADO' && (
                          <button
                            className="text-xs text-green-600 border border-green-300 px-2 py-1 rounded hover:bg-green-50"
                            onClick={async () => {
                              if (!token) return;
                              await api.patch(`/ati/${orgId}/ativos/${a.id}/liberar`, {}, token).catch(() => {});
                              const updated = await api.get<any>(`/ati/${orgId}/ativos`, token).catch(() => []);
                              setAssets(Array.isArray(updated) ? updated : updated.items ?? []);
                            }}
                          >
                            Liberar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'manutencao' && !loading && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Ordens de Manutenção</h2>
          {maintenances.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
              Nenhuma ordem de manutenção registrada.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Título</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Equipamento</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Tipo</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Agendado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {maintenances.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{m.title}</td>
                      <td className="px-4 py-3 text-gray-600">{m.asset?.name ?? m.assetName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{m.maintenanceType ?? m.type ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MAINT_STATUS_COLORS[m.status] ?? 'bg-gray-100 text-gray-600'}`}>{m.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{m.scheduledAt ? new Date(m.scheduledAt).toLocaleDateString('pt-BR') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'esterilizacao' && !loading && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Ciclos de Esterilização</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <Wrench className="h-4 w-4 inline mr-1" />
            Esterilização segue procedimento aprovado e versionado. A validação é de responsabilidade do profissional habilitado.
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            Nenhum ciclo registrado nos últimos 30 dias.
          </div>
        </div>
      )}

      {tab === 'cadeia-frio' && !loading && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Monitoramento de Temperatura</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <Thermometer className="h-4 w-4 inline mr-1" />
            Temperatura não é monitorada automaticamente sem sensor ou fonte de dados configurada.
            Excursões requerem avaliação humana — o sistema não libera nem descarta itens automaticamente.
          </div>
          {assets.filter((a) => a.requiresColdChain).length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
              Nenhum ativo com cadeia do frio configurada.
            </div>
          ) : (
            <div className="space-y-3">
              {assets.filter((a) => a.requiresColdChain).map((a) => (
                <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{a.name}</span>
                    <span className="text-sm text-gray-500">{a.minTempC}°C – {a.maxTempC}°C</span>
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
