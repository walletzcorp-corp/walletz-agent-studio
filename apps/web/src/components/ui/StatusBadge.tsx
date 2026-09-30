const statusConfig: Record<string, { label: string; className: string }> = {
  RASCUNHO:     { label: 'Rascunho',      className: 'badge badge-gray' },
  EM_VALIDACAO: { label: 'Em validação',  className: 'badge badge-blue' },
  ATIVA:        { label: 'Ativa',         className: 'badge badge-green' },
  ATIVO:        { label: 'Ativo',         className: 'badge badge-green' },
  SUSPENSA:     { label: 'Suspensa',      className: 'badge badge-yellow' },
  ENCERRADA:    { label: 'Encerrada',     className: 'badge badge-red' },
  BLOQUEADA:    { label: 'Bloqueada',     className: 'badge badge-red' },
  BLOQUEADO:    { label: 'Bloqueado',     className: 'badge badge-red' },
  INATIVA:      { label: 'Inativa',       className: 'badge badge-gray' },
  INATIVO:      { label: 'Inativo',       className: 'badge badge-gray' },
  CONVIDADO:    { label: 'Convidado',     className: 'badge badge-blue' },
  PUBLICADO:    { label: 'Publicado',     className: 'badge badge-green' },
  DESCONTINUADO:{ label: 'Descontinuado', className: 'badge badge-gray' },
  PENDENTE:     { label: 'Pendente',      className: 'badge badge-yellow' },
  VIGENTE:      { label: 'Vigente',       className: 'badge badge-green' },
  EXPIRADO:     { label: 'Expirado',      className: 'badge badge-red' },
  SUSPENSO:     { label: 'Suspenso',      className: 'badge badge-yellow' },
  ENCERRADO:    { label: 'Encerrado',     className: 'badge badge-gray' },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? { label: status, className: 'badge badge-gray' };
  return <span className={cfg.className}>{cfg.label}</span>;
}
