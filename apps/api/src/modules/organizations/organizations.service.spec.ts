import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

const adminUser: AuthenticatedUser = { sub: 'admin', email: 'admin@test.com', userId: 'actor-1', isWalletzAdmin: true, organizationIds: [], tenantIds: [] };
const orgUser = (orgId: string): AuthenticatedUser => ({ sub: 'user', email: 'user@test.com', userId: 'actor-2', isWalletzAdmin: false, organizationIds: [orgId], tenantIds: [] });

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

      const result = await service.create(validDto, 'actor-1', adminUser);
      expect(result.status).toBe('RASCUNHO');
      expect(mockPrisma.tenant.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.organization.create).toHaveBeenCalledTimes(1);
    });

    it('deve recusar CNPJ inválido sem persistência', async () => {
      await expect(
        service.create({ ...validDto, cnpj: '11.111.111/1111-11' }, 'actor-1', adminUser),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.organization.create).not.toHaveBeenCalled();
    });

    it('deve recusar CNPJ duplicado sem revelar dados existentes', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'other-org' });

      await expect(service.create(validDto, 'actor-1', adminUser)).rejects.toThrow(ConflictException);
      expect(mockPrisma.organization.create).not.toHaveBeenCalled();
    });

    it('deve impedir criação por usuário sem perfil WALLETZ_ADMIN', async () => {
      const nonAdmin: AuthenticatedUser = { sub: 'u', email: 'u@t.com', userId: 'u1', isWalletzAdmin: false, organizationIds: [], tenantIds: [] };
      await expect(service.create(validDto, 'u1', nonAdmin)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('changeStatus', () => {
    it('deve permitir transição RASCUNHO → EM_VALIDACAO', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', tenantId: 't-1', status: 'RASCUNHO', rowVersion: 0 });
      mockPrisma.organization.update.mockResolvedValue({ id: 'org-1', status: 'EM_VALIDACAO' });
      mockPrisma.organizationStatusHistory.create.mockResolvedValue({});
      mockPrisma.outboxEvent.create.mockResolvedValue({});
      mockPrisma.auditEvent.create.mockResolvedValue({});

      const result = await service.changeStatus('org-1', { status: 'EM_VALIDACAO' }, 'actor-1', adminUser);
      expect(mockPrisma.organization.update).toHaveBeenCalledTimes(1);
    });

    it('deve bloquear transição inválida', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', tenantId: 't-1', status: 'RASCUNHO', rowVersion: 0 });

      await expect(
        service.changeStatus('org-1', { status: 'ENCERRADA' }, 'actor-1', adminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve exigir motivo para suspensão', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', tenantId: 't-1', status: 'ATIVA', rowVersion: 0 });

      await expect(
        service.changeStatus('org-1', { status: 'SUSPENSA' }, 'actor-1', adminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve impedir acesso cross-tenant em changeStatus', async () => {
      const user = orgUser('org-A');
      await expect(
        service.changeStatus('org-B', { status: 'EM_VALIDACAO' }, 'actor-1', user),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('tenant isolation', () => {
    it('findAll deve filtrar por organizationIds do usuário não-admin', async () => {
      mockPrisma.organization.findMany.mockResolvedValue([]);
      mockPrisma.organization.count.mockResolvedValue(0);

      await service.findAll({}, orgUser('org-A'));

      const [findManyCall] = mockPrisma.organization.findMany.mock.calls;
      expect(findManyCall[0].where.id).toEqual({ in: ['org-A'] });
    });

    it('findAll para WALLETZ_ADMIN não deve restringir por organizationIds', async () => {
      mockPrisma.organization.findMany.mockResolvedValue([]);
      mockPrisma.organization.count.mockResolvedValue(0);

      await service.findAll({}, adminUser);

      const [findManyCall] = mockPrisma.organization.findMany.mock.calls;
      expect(findManyCall[0].where.id).toBeUndefined();
    });

    it('findOne deve lançar ForbiddenException para org fora do tenant do usuário', async () => {
      await expect(service.findOne('org-B', orgUser('org-A'))).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('deve rejeitar edição com rowVersion errado (concorrência)', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', tenantId: 't-1', status: 'ATIVA', rowVersion: 5 });

      await expect(
        service.update('org-1', { razaoSocial: 'Novo Nome', rowVersion: 3 }, 'actor-1', adminUser),
      ).rejects.toThrow(ConflictException);
    });

    it('não permite editar organização encerrada', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', tenantId: 't-1', status: 'ENCERRADA', rowVersion: 0 });

      await expect(
        service.update('org-1', { razaoSocial: 'Novo', rowVersion: 0 }, 'actor-1', adminUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve impedir acesso cross-tenant em update', async () => {
      const user = orgUser('org-A');
      await expect(
        service.update('org-B', { razaoSocial: 'Hack', rowVersion: 0 }, 'actor-1', user),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
