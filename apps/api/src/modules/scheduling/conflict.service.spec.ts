import { ConflictException } from '@nestjs/common';
import { ConflictService } from './services/conflict.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';

const mockPrisma: Record<string, any> = {
  appointment: { findFirst: jest.fn() },
};

describe('ConflictService', () => {
  let service: ConflictService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConflictService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ConflictService>(ConflictService);
    jest.resetAllMocks();
  });

  const now = new Date();
  const s1 = new Date(now.getTime() + 86400000);        // tomorrow 08:00
  const e1 = new Date(s1.getTime() + 1800000);          // + 30 min
  const s2 = new Date(s1.getTime() + 900000);           // + 15 min — overlap
  const e2 = new Date(s2.getTime() + 1800000);

  it('deve lançar ConflictException quando há sobreposição de profissional', async () => {
    mockPrisma.appointment.findFirst.mockResolvedValue({ id: 'existing', startsAt: s1, endsAt: e1 });

    await expect(
      service.assertNoConflict(mockPrisma, { startsAt: s2, endsAt: e2, professionalId: 'prof-1' }),
    ).rejects.toThrow(ConflictException);
  });

  it('deve lançar ConflictException quando há sobreposição de recurso', async () => {
    // No professionalId → only resource check runs (one findFirst call)
    mockPrisma.appointment.findFirst.mockResolvedValue({ id: 'existing', startsAt: s1, endsAt: e1 });

    await expect(
      service.assertNoConflict(mockPrisma, { startsAt: s2, endsAt: e2, resourceId: 'room-1' }),
    ).rejects.toThrow(ConflictException);
  });

  it('não deve lançar quando não há sobreposição', async () => {
    mockPrisma.appointment.findFirst.mockResolvedValue(null);

    await expect(
      service.assertNoConflict(mockPrisma, { startsAt: e1, endsAt: new Date(e1.getTime() + 1800000), professionalId: 'prof-1' }),
    ).resolves.not.toThrow();
  });

  it('deve ignorar o próprio agendamento ao verificar reagendamento', async () => {
    mockPrisma.appointment.findFirst.mockResolvedValue(null);

    await service.assertNoConflict(mockPrisma, {
      startsAt: s1, endsAt: e1, professionalId: 'prof-1', excludeAppointmentId: 'appt-self',
    });

    const callArg = mockPrisma.appointment.findFirst.mock.calls[0][0].where;
    expect(callArg.id).toEqual({ not: 'appt-self' });
  });
});
