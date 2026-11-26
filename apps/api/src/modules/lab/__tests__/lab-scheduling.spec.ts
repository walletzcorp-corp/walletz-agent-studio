import type { DrizzleDB } from '../../../database/database.module';
import { LabService } from '../lab.service';

type SessionOptions = { system: string; tools: Array<{ name: string }> };

/** Executa uma conversa com um modelo falso e devolve o que seria enviado a ele. */
async function sentToModel(canSchedule: boolean): Promise<SessionOptions> {
  const rows = [[{ id: 'agent', tenantId: 'tenant', name: 'Ana', persona: {}, aiConnectionId: null }], []];
  const db = {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => rows.shift() ?? [] }) }) }),
  } as unknown as DrizzleDB;
  let sent: SessionOptions | undefined;
  const createSession = (options: SessionOptions) => {
    sent = options;
    return { send: async () => ({ text: 'ok', toolCalls: [], inputTokens: 1, outputTokens: 1 }), addToolResults: () => undefined };
  };
  const args = [
    db,
    { loadSettings: async () => ({ canSchedule, connectionId: 'c', defaultDurationMinutes: 30, defaultPlatform: 'google_meet' }) },
    { listDevices: async () => [] },
    { assertWithinMonthlyLimit: async () => undefined, recordUsage: async () => undefined },
    { resolveForAgent: async () => ({ adapter: { createSession }, apiKey: 'k', model: 'm', provider: 'p', connectionId: 'ai' }), recordResponseHeaders: () => undefined },
    { search: async () => [] },
    { assertUsable: async () => undefined, hasFeature: async (_t: string, f: string) => f === 'calendars' },
  ] as unknown as ConstructorParameters<typeof LabService>;
  await new LabService(...args).chat({ agentId: 'agent', message: 'Quero marcar amanhã às 14h' }, 'tenant');
  return sent!;
}

describe('LabService: agendamento', () => {
  it('agente sem permissão de agendar não recebe ferramentas e é proibido de confirmar reuniões', async () => {
    const { system, tools } = await sentToModel(false);
    expect(tools).toEqual([]);
    expect(system).toContain('Você NÃO tem acesso a nenhuma agenda');
    expect(system).toContain('NUNCA diga que marcou');
    expect(system).not.toContain('Você pode agendar reuniões reais');
  });

  it('agente com permissão recebe as ferramentas e não recebe a proibição', async () => {
    const { system, tools } = await sentToModel(true);
    expect(tools.map((t) => t.name)).toEqual(['get_availability', 'create_meeting', 'find_meetings', 'reschedule_meeting', 'cancel_meeting']);
    expect(system).toContain('Você pode agendar reuniões reais');
    expect(system).not.toContain('Você NÃO tem acesso a nenhuma agenda');
  });
});
