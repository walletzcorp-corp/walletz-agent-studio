import { classifyMetaSendError, describeFailure, isCallingOnlyError } from '../meta-errors';

describe('classifyMetaSendError', () => {
  it('"Paid Message Account" (código 10) é problema de pagamento, permanente', () => {
    const f = classifyMetaSendError({ httpStatus: 400, code: 10, message: '(#10) Viewer cannot access the provided Paid Message Account 3961783927455245' });
    expect(f.kind).toBe('permanent');
    expect(f.reason).toMatch(/forma de pagamento/);
    expect(f.action).toMatch(/Configurações de pagamento/);
  });

  it('código 10 sem conta de pagamento é falta de permissão do token', () => {
    const f = classifyMetaSendError({ httpStatus: 403, code: 10, message: 'Application does not have permission for this action' });
    expect(f.kind).toBe('permanent');
    expect(f.reason).toMatch(/permissão/);
  });

  it.each([131042, 141006])('código %i é pagamento', (code) => {
    expect(classifyMetaSendError({ httpStatus: 400, code }).reason).toMatch(/pagamento/);
  });

  it.each([190, 102, 463, 467])('código %i é token vencido ou revogado', (code) => {
    const f = classifyMetaSendError({ httpStatus: 401, code });
    expect(f.kind).toBe('permanent');
    expect(f.reason).toMatch(/token/);
  });

  it('janela de 24 horas é permanente e explica o modelo aprovado', () => {
    const f = classifyMetaSendError({ httpStatus: 400, code: 131047 });
    expect(f.kind).toBe('permanent');
    expect(f.reason).toMatch(/24 horas/);
  });

  it.each([130429, 131056, 80007, 4, 131016, 131000, 1, 2])('código %i é temporário', (code) => {
    expect(classifyMetaSendError({ httpStatus: 400, code }).kind).toBe('transient');
  });

  it('sem resposta da Meta (rede, tempo esgotado, 5xx) é temporário', () => {
    expect(classifyMetaSendError({}).kind).toBe('transient');
    expect(classifyMetaSendError({ httpStatus: 502 }).kind).toBe('transient');
    expect(classifyMetaSendError({ httpStatus: 503, code: 999999 }).kind).toBe('transient');
  });

  it('código desconhecido com 4xx é permanente e mostra o código', () => {
    const f = classifyMetaSendError({ httpStatus: 400, code: 123456 });
    expect(f.kind).toBe('permanent');
    expect(f.reason).toContain('123456');
  });

  it('descrição junta motivo e ação', () => {
    expect(describeFailure({ reason: 'A.', action: 'B.' })).toBe('A. B.');
    expect(describeFailure({ reason: 'A.' })).toBe('A.');
  });

  it('erros de chamada de voz (SIP) não contam para mensagens', () => {
    expect(isCallingOnlyError(138024)).toBe(true);
    expect(isCallingOnlyError(141006)).toBe(false);
  });
});
