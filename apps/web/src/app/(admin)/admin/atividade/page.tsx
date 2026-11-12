'use client';

import { useCallback, useEffect, useState } from 'react';
import { cn } from '@walletz/ui';
import { adminApi, apiErrorMessage, fmtInt, type ActivityItem, type Paginated } from '../../../../lib/admin-api';
import { ActivityList, ErrorBlock, LoadingBlock, PageHeader, Pagination, Section } from '../../_components/admin-ui';

const FILTERS = [
  { id: '', label: 'Tudo' },
  { id: 'auth.', label: 'Acessos' },
  { id: 'tenant.', label: 'Organizações' },
  { id: 'agent.', label: 'Agentes' },
  { id: 'knowledge', label: 'Conhecimento' },
  { id: 'whatsapp.', label: 'WhatsApp' },
  { id: 'calendar.', label: 'Agenda' },
  { id: 'campaign.', label: 'Campanhas' },
  { id: 'privacy.', label: 'Privacidade' },
  { id: 'admin.', label: 'Ações de admin' },
];

export default function AdminAtividadePage() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<ActivityItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await adminApi.activity({ action, page, pageSize: 50 });
      setData(data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [action, page]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="page-container space-y-5">
      <PageHeader
        title="Atividade da plataforma"
        subtitle={data ? `${fmtInt(data.total)} evento(s) registrados na auditoria` : 'Tudo o que acontece na plataforma'}
      />
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => { setAction(f.id); setPage(1); }}
            className={cn(
              'rounded-full border px-3 py-1 text-xs transition-colors',
              action === f.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      {error ? <ErrorBlock message={error} onRetry={load} /> : loading && !data ? <LoadingBlock /> : (
        <Section title="Eventos">
          <ActivityList items={data?.items ?? []} />
          {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
        </Section>
      )}
    </div>
  );
}
