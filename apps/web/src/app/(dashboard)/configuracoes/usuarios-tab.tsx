'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Loader2, KeyRound, Copy, Check, X } from 'lucide-react';
import { useAuth } from '../../../hooks/use-auth';
import { tenantsApi, type TenantMember } from '../../../lib/api';
import { apiErrorMessage, plansApi, type TenantPlanSummary } from '../../../lib/studio-api';
import { withBasePath } from '../../../lib/paths';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Dono', admin: 'Admin', manager: 'Gestor', agent_operator: 'Operador', analyst: 'Analista', viewer: 'Leitor',
};
const ASSIGNABLE = ['admin', 'manager', 'agent_operator', 'analyst', 'viewer'] as const;

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

const input = 'w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50';

/** Usuários reais da organização atual (cada organização tem os próprios usuários). */
export function TabUsuarios() {
  const { tenantId, userId } = useAuth();
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [plan, setPlan] = useState<TenantPlanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', role: 'agent_operator' as (typeof ASSIGNABLE)[number], password: generatePassword() });
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      const [m, p] = await Promise.all([tenantsApi.getMembers(tenantId), plansApi.summary(tenantId)]);
      setMembers(m.data);
      setPlan(p.data);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível carregar os usuários.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { void load(); }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try { await fn(); await load(); return true; } catch (err) { setError(apiErrorMessage(err)); return false; } finally { setBusy(false); }
  };

  const limit = plan?.plan.limits.users ?? 0;
  const myRole = members.find((m) => m.userId === userId)?.role;
  const canManage = myRole === 'owner' || myRole === 'admin';
  const loginUrl = typeof window !== 'undefined' ? `${window.location.origin}${withBasePath('/auth/login')}` : '';
  const credentials = created ? `Seu acesso ao Walletz Studio IA:\n${loginUrl}\nE-mail: ${created.email}\nSenha: ${created.password}` : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-foreground">Usuários e permissões</h2>
          <p className="text-sm text-muted-foreground">
            Usuários desta organização{plan ? ` · ${members.length} de ${limit} no plano ${plan.plan.name}` : ''}.
          </p>
        </div>
        {canManage && !adding && members.length < limit && (
          <button onClick={() => { setAdding(true); setCreated(null); }} className="btn-primary rounded-lg px-3 py-2 text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" /> Adicionar usuário
          </button>
        )}
      </div>

      {error && <div className="rounded-lg border border-neural-danger/40 bg-neural-danger/5 p-3 text-sm text-neural-danger">{error}</div>}
      {canManage && plan && members.length >= limit && (
        <p className="text-xs text-muted-foreground">O plano {plan.plan.name} permite {limit} {limit === 1 ? 'usuário' : 'usuários'}. Para adicionar mais, fale com a Walletz sobre mudar de plano.</p>
      )}

      {created && (
        <div className="neural-card p-4 space-y-3 border-neural-success/40">
          <p className="text-sm text-foreground">Usuário criado. Envie os dados de acesso (a senha não aparece de novo):</p>
          <pre className="whitespace-pre-wrap rounded-lg bg-surface-2 px-3 py-2 text-xs">{credentials}</pre>
          <div className="flex gap-2">
            <button onClick={() => { void navigator.clipboard.writeText(credentials); setCopied(true); }} className="btn-primary rounded-lg px-3 py-2 text-xs inline-flex items-center gap-1.5">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copiado' : 'Copiar dados de acesso'}
            </button>
            <button onClick={() => setCreated(null)} className="btn-ghost rounded-lg px-3 py-2 text-xs border border-border">Fechar</button>
          </div>
        </div>
      )}

      {adding && tenantId && (
        <div className="neural-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Novo usuário</h3>
            <button onClick={() => setAdding(false)} aria-label="Fechar" className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <p className="text-xs text-muted-foreground">O login é criado só para esta organização. O e-mail não pode já ter conta na plataforma.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className={input} placeholder="Nome" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} maxLength={100} />
            <input className={input} placeholder="Sobrenome (opcional)" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} maxLength={100} />
            <input className={input} type="email" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <select className={input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as (typeof ASSIGNABLE)[number] })}>
              {ASSIGNABLE.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <input className={`${input} font-mono`} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} maxLength={100} aria-label="Senha inicial" />
            <button onClick={() => setForm({ ...form, password: generatePassword() })} className="btn-ghost rounded-lg px-3 py-2 text-xs border border-border inline-flex items-center gap-1.5 shrink-0">
              <KeyRound className="h-3.5 w-3.5" /> Gerar senha
            </button>
          </div>
          <button
            disabled={busy || !form.firstName.trim() || !form.email.trim() || form.password.length < 8}
            onClick={async () => {
              const ok = await act(() => tenantsApi.addMember(tenantId, {
                email: form.email.trim(),
                firstName: form.firstName.trim(),
                ...(form.lastName.trim() ? { lastName: form.lastName.trim() } : {}),
                role: form.role,
                password: form.password,
              }));
              if (ok) {
                setCreated({ email: form.email.trim().toLowerCase(), password: form.password });
                setCopied(false);
                setAdding(false);
                setForm({ firstName: '', lastName: '', email: '', role: 'agent_operator', password: generatePassword() });
              }
            }}
            className="btn-primary rounded-lg px-4 py-2 text-sm inline-flex items-center gap-2"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Criar usuário
          </button>
        </div>
      )}

      <div className="neural-card overflow-hidden">
        {loading ? (
          <div className="p-5 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Usuário</th><th>Papel</th><th>Status</th><th>Desde</th><th></th></tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const name = [m.firstName, m.lastName].filter(Boolean).join(' ');
                const editable = canManage && m.role !== 'owner' && m.userId !== userId;
                return (
                  <tr key={m.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neural-violet/10 text-neural-violet text-xs font-bold">
                          {(name || m.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm text-foreground">{name || m.email}</p>
                          {name && <p className="text-xs text-muted-foreground">{m.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td>
                      {editable ? (
                        <select
                          disabled={busy}
                          value={m.role}
                          onChange={(e) => tenantId && void act(() => tenantsApi.updateMemberRole(tenantId, m.id, e.target.value))}
                          className="rounded-md border border-border bg-surface-1 px-2 py-1 text-xs"
                        >
                          {ASSIGNABLE.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                      ) : (
                        <span className="badge-primary inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium">{ROLE_LABELS[m.role] ?? m.role}</span>
                      )}
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${m.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                        {m.status === 'active' ? 'Ativo' : 'Convite pendente'}
                      </span>
                    </td>
                    <td className="text-sm">{new Date(m.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td>
                      {editable && (
                        <button
                          disabled={busy}
                          aria-label="Remover usuário"
                          onClick={() => { if (tenantId && window.confirm(`Remover o acesso de ${m.email} a esta organização?`)) void act(() => tenantsApi.removeMember(tenantId, m.id)); }}
                          className="p-1.5 text-muted-foreground hover:text-neural-danger rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
