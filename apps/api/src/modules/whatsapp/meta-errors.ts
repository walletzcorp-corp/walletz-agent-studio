/**
 * Erros de envio da API do WhatsApp (Meta) em linguagem de quem usa o painel.
 * "transient": vale tentar de novo (instabilidade, limite de envio).
 * "permanent": tentar de novo não resolve; alguém precisa agir (pagamento, token, janela de 24h...).
 */
export interface MetaErrorInfo {
  httpStatus?: number;
  code?: number;
  subcode?: number;
  /** Mensagem original da Meta (usada só para distinguir casos do mesmo código). */
  message?: string;
}

export interface SendFailure {
  kind: 'transient' | 'permanent';
  /** O que aconteceu, para o painel. */
  reason: string;
  /** O que fazer, quando houver algo a fazer. */
  action?: string;
  code?: number;
}

const PAYMENT: Omit<SendFailure, 'code'> = {
  kind: 'permanent',
  reason: 'A Meta bloqueou o envio por problema na forma de pagamento da conta do WhatsApp.',
  action: 'Corrija a forma de pagamento em WhatsApp Manager → Configurações de pagamento.',
};
const TOKEN: Omit<SendFailure, 'code'> = {
  kind: 'permanent',
  reason: 'O token da Meta expirou ou foi revogado.',
  action: 'Troque o token na tela WhatsApp (Trocar token / App Secret).',
};
const PERMISSION: Omit<SendFailure, 'code'> = {
  kind: 'permanent',
  reason: 'O token da Meta não tem permissão para enviar por este número.',
  action: 'Confira se o usuário do sistema tem controle total da conta do WhatsApp nas Configurações do negócio.',
};
const RATE: Omit<SendFailure, 'code'> = {
  kind: 'transient',
  reason: 'A Meta limitou temporariamente o envio deste número.',
};
const UNAVAILABLE: Omit<SendFailure, 'code'> = {
  kind: 'transient',
  reason: 'A Meta não respondeu agora.',
};

const BY_CODE: Record<number, Omit<SendFailure, 'code'>> = {
  // Instabilidade e limites: tentar de novo resolve.
  1: UNAVAILABLE,
  2: UNAVAILABLE,
  131000: UNAVAILABLE,
  131016: UNAVAILABLE,
  4: RATE,
  17: RATE,
  341: RATE,
  80007: RATE,
  130429: RATE,
  131056: RATE,
  // Pagamento
  131042: PAYMENT,
  141006: PAYMENT,
  // Token
  102: TOKEN,
  190: TOKEN,
  463: TOKEN,
  467: TOKEN,
  // Janela de atendimento
  131047: {
    kind: 'permanent',
    reason: 'Passaram mais de 24 horas desde a última mensagem do cliente. Fora desse prazo a Meta só aceita modelo de mensagem aprovado.',
  },
  470: {
    kind: 'permanent',
    reason: 'Passaram mais de 24 horas desde a última mensagem do cliente. Fora desse prazo a Meta só aceita modelo de mensagem aprovado.',
  },
  131026: {
    kind: 'permanent',
    reason: 'A Meta não conseguiu entregar a mensagem a este número (sem WhatsApp ou com versão antiga).',
  },
  131031: {
    kind: 'permanent',
    reason: 'A conta do WhatsApp está bloqueada pela Meta.',
    action: 'Veja o motivo e a solicitação de revisão no WhatsApp Manager.',
  },
  368: {
    kind: 'permanent',
    reason: 'A Meta bloqueou temporariamente o envio por violação de política.',
    action: 'Veja os detalhes no WhatsApp Manager → Qualidade da conta.',
  },
  133010: {
    kind: 'permanent',
    reason: 'O número não está registrado na API do WhatsApp.',
    action: 'Conclua o registro do número no WhatsApp Manager.',
  },
};

export function classifyMetaSendError(err: MetaErrorInfo): SendFailure {
  const { code, httpStatus, message } = err;
  if (code === undefined) {
    // Sem resposta de erro da Meta: rede, tempo esgotado ou 5xx.
    if (httpStatus === undefined || httpStatus >= 500 || httpStatus === 429) return { ...UNAVAILABLE };
    return { kind: 'permanent', reason: `A Meta recusou o envio (HTTP ${httpStatus}).` };
  }
  // O código 10 cobre permissões em geral; com "Paid Message Account" é a conta de pagamento.
  if (code === 10) return { ...(/paid message account/i.test(message ?? '') ? PAYMENT : PERMISSION), code };
  if (code >= 200 && code <= 299) return { ...PERMISSION, code };
  const known = BY_CODE[code];
  if (known) return { ...known, code };
  if (httpStatus !== undefined && httpStatus >= 500) return { ...UNAVAILABLE, code };
  return { kind: 'permanent', reason: `A Meta recusou o envio (código ${code}).`, code };
}

/** Texto único (motivo + ação) para gravar e exibir. */
export function describeFailure(f: Pick<SendFailure, 'reason' | 'action'>): string {
  return f.action ? `${f.reason} ${f.action}` : f.reason;
}

/** Códigos de erro do health_status ligados a chamadas de voz (SIP), que não afetam mensagens. */
export function isCallingOnlyError(code: number): boolean {
  return code >= 138000 && code < 139000;
}
