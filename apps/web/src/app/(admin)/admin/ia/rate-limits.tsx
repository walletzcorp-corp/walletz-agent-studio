'use client';

import { fmtAgo, fmtCompact, type RateLimitSnapshot } from '../../../../lib/admin-api';

const KIND_LABELS: Record<string, string> = {
  requests: 'Requisições',
  tokens: 'Tokens (total)',
  'input-tokens': 'Tokens de entrada',
  'output-tokens': 'Tokens de saída',
};

/**
 * Limites de taxa da conta Anthropic, lidos dos headers `anthropic-ratelimit-*`
 * da última resposta do Claude. São limites por minuto da organização inteira.
 */
export function RateLimitTable({ snapshot }: { snapshot: RateLimitSnapshot | null }) {
  if (!snapshot) {
    return (
      <p className="text-xs text-muted-foreground">
        Ainda não lido. Os limites aparecem depois da primeira resposta de um agente (laboratório ou conversa).
      </p>
    );
  }
  const entries = Object.entries(snapshot.limits);
  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="py-1 pr-2 font-medium">Limite</th>
            <th className="py-1 pr-2 font-medium text-right">Máximo/min</th>
            <th className="py-1 pr-2 font-medium text-right">Restante</th>
            <th className="py-1 font-medium">Uso</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([kind, e]) => {
            const pct = e.limit && e.remaining !== null ? ((e.limit - e.remaining) / e.limit) * 100 : null;
            return (
              <tr key={kind}>
                <td className="py-1 pr-2">{KIND_LABELS[kind] ?? kind}</td>
                <td className="py-1 pr-2 text-right tabular-nums">{fmtCompact(e.limit)}</td>
                <td className="py-1 pr-2 text-right tabular-nums">{fmtCompact(e.remaining)}</td>
                <td className="py-1 w-24">
                  {pct === null ? '—' : (
                    <div className="h-1.5 rounded-full bg-muted">
                      <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(2, pct)}%` }} />
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-1 text-[11px] text-muted-foreground">Leitura {fmtAgo(snapshot.capturedAt)} (última resposta do Claude)</p>
    </div>
  );
}
