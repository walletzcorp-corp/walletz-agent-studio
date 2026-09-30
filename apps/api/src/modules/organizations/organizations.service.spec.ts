import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../../common/prisma/prisma.service';

const mockPrisma: Record<string, any> = {
  organization: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  tenant: { create: jest.fn() },
  outboxEvent: { create: jest.fn() },
  auditEvent: { create: jest.fn() },
  organizationStatusHistory: { create: jest.fn() },
  $transaction: jest.fn((fn: (tx: any) => any) => fn(mockPrisma)),
};

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const validDto = {
      razaoSocial: 'Clínica Teste LTDA',
      nomeFantasia: 'Clínica Teste',
      cnpj: '11.222.333/0001-81', // CNPJ válido
      email: 'teste@clinica.com',
    };

    it('deve criar organização com CNPJ válido', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);
      mockPrisma.tenant.create.mockResolvedValue({ id: 'tenant-1', slug: 'slug-1' });
      mockPrisma.organization.create.mockResolvedValue({
        id: 'org-1',
        tenantId: 'tenant-1',
        ...validDto,
        cnpj: '11222333000181',
        status: 'RASCUNHO',
        rowVersion: 0,
      });
      mockPrisma.outboxEvent.create.mockResolvedValue({});
      mockPrisma.auditEvent.create.mockResolvedValue({});

      const result = await service.create(validDto, 'actor-1');
      expect(result.status).toBe('RASCUNHO');
      expect(mockPrisma.tenant.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.organization.create).toHaveBeenCalledTimes(1);
    });

    it('deve recusar CNPJ inválido sem persistência', async () => {
      await expect(
        service.create({ ...validDto, cnpj: '11.111.111/1111-11' }, 'actor-1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.organization.create).not.toHaveBeenCalled();
    });

    it('deve recusar CNPJ duplicado sem revelar dados existentes', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'other-org' });

      await expect(service.create(validDto, 'actor-1')).rejects.toThrow(ConflictException);
      expect(mockPrisma.organization.create).not.toHaveBeenCalled();
    });
  });

  describe('changeStatus', () => {
    it('deve permitir transição RASCUNHO → EM_VALIDACAO', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', tenantId: 't-1', status: 'RASCUNHO', rowVersion: 0 });
      mockPrisma.organization.update.mockResolvedValue({ id: 'org-1', status: 'EM_VALIDACAO' });
      mockPrisma.organizationStatusHistory.create.mockResolvedValue({});
      mockPrisma.outboxEvent.create.mockResolvedValue({});
      mockPrisma.auditEvent.create.mockResolvedValue({});

      const result = await service.changeStatus('org-1', { status: 'EM_VALIDACAO' }, 'actor-1');
      expect(mockPrisma.organization.update).toHaveBeenCalledTimes(1);
    });

    it('deve bloquear transição inválida', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', tenantId: 't-1', status: 'RASCUNHO', rowVersion: 0 });

      await expect(
        service.changeStatus('org-1', { status: 'ENCERRADA' }, 'actor-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve exigir motivo para suspensão', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', tenantId: 't-1', status: 'ATIVA', rowVersion: 0 });

      await expect(
        service.changeStatus('org-1', { status: 'SUSPENSA' }, 'actor-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('deve rejeitar edição com rowVersion errado (concorrência)', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', tenantId: 't-1', status: 'ATIVA', rowVersion: 5 });

      await expect(
        service.update('org-1', { razaoSocial: 'Novo Nome', rowVersion: 3 }, 'actor-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('não permite editar organização encerrada', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', tenantId: 't-1', status: 'ENCERRADA', rowVersion: 0 });

      await expect(
        service.update('org-1', { razaoSocial: 'Novo', rowVersion: 0 }, 'actor-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
