import { normalizeTurns } from '../conversation-turns';

describe('normalizeTurns', () => {
  it('junta mensagens seguidas do mesmo lado', () => {
    expect(normalizeTurns([
      { role: 'user', content: 'oi' },
      { role: 'user', content: 'quero uma pizza' },
      { role: 'assistant', content: 'Qual sabor?' },
      { role: 'user', content: 'calabresa' },
    ])).toEqual([
      { role: 'user', content: 'oi\n\nquero uma pizza' },
      { role: 'assistant', content: 'Qual sabor?' },
      { role: 'user', content: 'calabresa' },
    ]);
  });

  it('começa sempre pelo usuário e ignora mensagens vazias', () => {
    expect(normalizeTurns([
      { role: 'assistant', content: 'Olá! Posso ajudar?' },
      { role: 'user', content: '   ' },
      { role: 'user', content: 'Quero marcar' },
    ])).toEqual([{ role: 'user', content: 'Quero marcar' }]);
  });

  it('não altera a lista recebida', () => {
    const input = [{ role: 'user' as const, content: 'a' }, { role: 'user' as const, content: 'b' }];
    normalizeTurns(input);
    expect(input).toEqual([{ role: 'user', content: 'a' }, { role: 'user', content: 'b' }]);
  });
});
