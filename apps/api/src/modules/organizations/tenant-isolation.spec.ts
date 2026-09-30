/**
 * Testes de isolamento de tenant — Módulo 1
 * Verifica que um usuário de Org A não consegue acessar dados de Org B e vice-versa.
 * Usa mocks do Prisma (sem banco real) para validar a lógica de isolamento no service.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

// Duas organizações fictícias em tenants separados
const ORG_A = 'aaaaaaaa-1111-1111-1111-111111111111';
const ORG_B = 'bbbbbbbb-2222-2222-2222-222222222222';
const TENANT_A = 'tttttttt-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const TENANT_B = 'tttttttt-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

// Usuário membro somente da Org A
const userA: AuthenticatedUser = {
  sub: 'user-a', email: 'a@clinica-a.local', userId: 'uid-a',
  isWalletzAdmin: false, organizationIds: [ORG_A], tenantIds: [TENANT_A],
};

// Usuário membro somente da Org B
const userB: AuthenticatedUser = {
  sub: 'user-b', email: 'b@clinica-b.local', userId: 'uid-b',
  isWalletzAdmin: false, organizationIds: [ORG_B], tenantIds: [TENANT_B],
};

// Administrador Walletz — acesso a ambas
const walletzAdmin: AuthenticatedUser = {
  sub: 'admin', email: 'admin@walletz.com', userId: 'uid-admin',
  isWalletzAdmin: true, organizationIds: [ORG_A, ORG_B], tenantIds: [TENANT_A, TENANT_B],
};

const mockOrg = (id: string, tenantId: string) => ({
  id, tenantId, razaoSocial: `Clínica ${id.slice(0, 4)}`, nomeFantasia: 'Clínica DEV',
  cnpj: '00000000000001', email: 'dev@test.local', status: 'ATIVA', rowVersion: 0,
  tenant: { id: tenantId, slug: 'slug' }, _count: { units: 0, users: 0, professionals: 0 }, statusHistory: [],
});

const mockPrisma: Record<string, any> = {
  organization: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  tenant: { create: jest.fn() },
  outboxEvent: { create: jest.fn() },
  auditEvent: { create: jest.fn() },
  organizationStatusHistory: { create: jest.fn() },
  $transaction: jest.fn((fn: (tx: any) => any) => fn(mockPrisma)),
};

describe('Tenant Isolation — OrganizationsService', () => {
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

  describe('findAll — escopo por tenant do JWT', () => {
    beforeEach(() => {
      mockPrisma.organization.findMany.mockResolvedValue([mockOrg(ORG_A, TENANT_A)]);
      mockPrisma.organization.count.mockResolvedValue(1);
    });

    it('Usuário A vê somente dados da Org A', async () => {
      await service.findAll({}, userA);
      const [call] = mockPrisma.organization.findMany.mock.calls;
      expect(call[0].where.id).toEqual({ in: [ORG_A] });
      expect(call[0].where.id.in).not.toContain(ORG_B);
    });

    it('Usuário B vê somente dados da Org B', async () => {
      await service.findAll({}, userB);
      const [call] = mockPrisma.organization.findMany.mock.calls;
      expect(call[0].where.id).toEqual({ in: [ORG_B] });
      expect(call[0].where.id.in).not.toContain(ORG_A);
    });

    it('WALLETZ_ADMIN não tem restrição de id por tenant', async () => {
      await service.findAll({}, walletzAdmin);
      const [call] = mockPrisma.organization.findMany.mock.calls;
      expect(call[0].where.id).toBeUndefined();
    });
  });

  describe('findOne — impede acesso cross-tenant', () => {
    it('Usuário A não consegue acessar Org B', async () => {
      await expect(service.findOne(ORG_B, userA)).rejects.toThrow(ForbiddenException);
    });

    it('Usuário B não consegue acessar Org A', async () => {
      await expect(service.findOne(ORG_A, userB)).rejects.toThrow(ForbiddenException);
    });

    it('Usuário A consegue acessar sua própria Org A', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg(ORG_A, TENANT_A));
      const result = await service.findOne(ORG_A, userA);
      expect(result.id).toBe(ORG_A);
    });

    it('WALLETZ_ADMIN consegue acessar qualquer org', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg(ORG_B, TENANT_B));
      const result = await service.findOne(ORG_B, walletzAdmin);
      expect(result.id).toBe(ORG_B);
    });
  });

  describe('update — impede escrita cross-tenant', () => {
    it('Usuário A não consegue editar Org B', async () => {
      await expect(
        service.update(ORG_B, { razaoSocial: 'Hack', rowVersion: 0 }, 'uid-a', userA),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Usuário B não consegue editar Org A', async () => {
      await expect(
        service.update(ORG_A, { razaoSocial: 'Hack', rowVersion: 0 }, 'uid-b', userB),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('changeStatus — impede escrita cross-tenant', () => {
    it('Usuário A não consegue mudar status de Org B', async () => {
      await expect(
        service.changeStatus(ORG_B, { status: 'SUSPENSA', reason: 'teste' }, 'uid-a', userA),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Usuário B não consegue mudar status de Org A', async () => {
      await expect(
        service.changeStatus(ORG_A, { status: 'SUSPENSA', reason: 'teste' }, 'uid-b', userB),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create — somente WALLETZ_ADMIN pode criar orgs', () => {
    it('Usuário A (ORG_ADMIN) não pode criar organização', async () => {
      await expect(
        service.create({ razaoSocial: 'Nova', nomeFantasia: 'Nova', cnpj: '11.222.333/0001-81', email: 'n@t.com' }, 'uid-a', userA),
      ).rejects.toThrow(ForbiddenException);
    });

    it('WALLETZ_ADMIN pode criar organização', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);
      mockPrisma.tenant.create.mockResolvedValue({ id: 'new-t', slug: 'slug' });
      mockPrisma.organization.create.mockResolvedValue({ id: 'new-o', tenantId: 'new-t', status: 'RASCUNHO' });
      mockPrisma.outboxEvent.create.mockResolvedValue({});
      mockPrisma.auditEvent.create.mockResolvedValue({});

      const result = await service.create(
        { razaoSocial: 'Nova Clínica', nomeFantasia: 'Nova', cnpj: '11.222.333/0001-81', email: 'n@t.com' },
        'uid-admin', walletzAdmin,
      );
      expect(result.status).toBe('RASCUNHO');
    });
  });
});
