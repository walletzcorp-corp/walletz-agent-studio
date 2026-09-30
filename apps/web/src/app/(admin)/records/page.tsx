'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToken } from '@/hooks/useToken';
import { api } from '@/lib/api';
import { Search, FileText } from 'lucide-react';

export default function RecordsSearchPage() {
  const token = useToken();
  const router = useRouter();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [orgId, setOrgId] = useState('');
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get<any>('/organizations', token).then((r) => {
      const list = r.items ?? r.data ?? [];
      setOrgs(list);
      if (list.length > 0) setOrgId(list[0].id);
    });
  }, [token]);

  useEffect(() => {
    if (!token || !orgId) return;
    setLoading(true);
    api.get<any>(`/patients?organizationId=${orgId}&search=${encodeURIComponent(search)}&limit=20`, token)
      .then((r) => { setPatients(r.data ?? []); setTotal(r.total ?? 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, orgId, search]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <FileText className="w-6 h-6 text-teal-600" /> Prontuários
      </h1>

      <div className="flex gap-3 mb-6">
        {orgs.length > 1 && (
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.nomeFantasia}</option>)}
          </select>
        )}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar paciente por nome ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm"
          />
        </div>
      </div>

      {loading && <div className="text-slate-400 text-sm">Carregando...</div>}

      {!loading && patients.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Nenhum paciente encontrado</p>
        </div>
      )}

      <div className="space-y-2">
        {patients.map((p) => (
          <button
            key={p.id}
            onClick={() => router.push(`/records/${p.id}?orgId=${orgId}`)}
            className="w-full flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-teal-300 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 font-bold flex items-center justify-center text-sm shrink-0">
              {p.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 truncate">{p.name}</p>
              <p className="text-xs text-slate-500">
                CPF: {p.cpf ? p.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '—'}
                {p.dataNasc && ` · ${new Date(p.dataNasc).toLocaleDateString('pt-BR')}`}
              </p>
            </div>
            <FileText className="w-4 h-4 text-teal-400 shrink-0" />
          </button>
        ))}
      </div>
      {total > patients.length && (
        <p className="text-xs text-slate-400 text-center mt-4">{total - patients.length} pacientes não exibidos — refine a busca</p>
      )}
    </div>
  );
}
