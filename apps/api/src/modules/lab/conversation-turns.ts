export interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Deixa a conversa no formato que todos os provedores aceitam: sem mensagens vazias,
 * mensagens seguidas do mesmo lado juntas (ex.: o cliente manda "oi" e "quero uma pizza"
 * separados) e começando pelo usuário.
 */
export function normalizeTurns(turns: Turn[]): Turn[] {
  const out: Turn[] = [];
  for (const t of turns) {
    const content = t.content.trim();
    if (!content) continue;
    const last = out[out.length - 1];
    if (last && last.role === t.role) last.content = `${last.content}\n\n${content}`;
    else out.push({ role: t.role, content });
  }
  while (out[0]?.role === 'assistant') out.shift();
  return out;
}
