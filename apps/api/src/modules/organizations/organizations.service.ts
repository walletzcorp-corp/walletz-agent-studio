import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { ChangeOrganizationStatusDto } from './dto/change-status.dto';
import { OrganizationStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

function normalizeCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

function isValidCnpj(cnpj: string): boolean {
  const nums = cnpj.replace(/\D/g, '');
  if (nums.length !== 14) return false;
  if (/^(\d)\1+$/.test(nums)) return false;

  const calc = (mod: number) => {
    const weights = mod === 11
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const slice = nums.slice(0, mod === 11 ? 12 : 13);
    const sum = slice.split('').reduce((acc, n, i) => acc + Number(n) * weights[i], 0);
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };

  return calc(11) === Number(nums[12]) && calc(13) === Number(nums[13]);
}

// Transições de estado permitidas
const ALLOWED_TRANSITIONS: Record<OrganizationStatus, OrganizationStatus[]> = {
  RASCUNHO: ['EM_VALIDACAO'],
  EM_VALIDACAO: ['ATIVA', 'RASCUNHO'],
  ATIVA: ['SUSPENSA', 'ENCERRADA'],
  SUSPENSA: ['ATIVA', 'ENCERRADA'],
  ENCERRADA: [],
};

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrganizationDto, actorId: string, user: AuthenticatedUser) {
    if (!user.isWalletzAdmin) {
      throw new ForbiddenException('Apenas administradores Walletz podem criar organizações');
    }
    const cnpjRaw = normalizeCnpj(dto.cnpj);

    if (!isValidCnpj(cnpjRaw)) {
      throw new BadRequestException('CNPJ inválido');
    }

    // Verifica duplicidade sem revelar dados da organização existente
    const existing = await this.prisma.organization.findUnique({
      where: { cnpj: cnpjRaw },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('CNPJ já cadastrado');
    }

    const tenantSlug = cnpjRaw + '-' + randomUUID().slice(0, 8);

    // Criação atômica: tenant + organização
    const org = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { id: randomUUID(), slug: tenantSlug },
      });

      const organization = await tx.organization.create({
        data: {
          id: randomUUID(),
          tenantId: tenant.id,
          razaoSocial: dto.razaoSocial,
          nomeFantasia: dto.nomeFantasia,
          cnpj: cnpjRaw,
          email: dto.email,
          telefone: dto.telefone,
          site: dto.site,
          timezone: dto.timezone ?? 'America/Sao_Paulo',
          locale: dto.locale ?? 'pt-BR',
          status: 'RASCUNHO',
        },
      });

      // Evento de saída (outbox)
      await tx.outboxEvent.create({
        data: {
          id: randomUUID(),
          tenantId: tenant.id,
          eventType: 'organization.created',
          aggregateId: organization.id,
          payload: {
            organizationId: organization.id,
            tenantId: tenant.id,
            cnpj: cnpjRaw,
            nomeFantasia: organization.nomeFantasia,
          },
        },
      });

      // Auditoria
      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          tenantId: tenant.id,
          organizationId: organization.id,
          actorId,
          action: 'organization.created',
          resource: 'Organization',
          resourceId: organization.id,
          result: 'SUCCESS',
          newValues: {
            razaoSocial: organization.razaoSocial,
            nomeFantasia: organization.nomeFantasia,
            status: organization.status,
          },
        },
      });

      return organization;
    });

    return org;
  }

  async findAll(params: {
    status?: OrganizationStatus;
    search?: string;
    page?: number;
    limit?: number;
  }, user: AuthenticatedUser) {
    const { status, search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    // Non-admin users see only their own organizations; tenant derived from JWT, not the request
    if (!user.isWalletzAdmin) {
      where.id = { in: user.organizationIds };
    }
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { razaoSocial: { contains: search, mode: 'insensitive' } },
        { nomeFantasia: { contains: search, mode: 'insensitive' } },
        { cnpj: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          razaoSocial: true,
          nomeFantasia: true,
          cnpj: true,
          email: true,
          status: true,
          createdAt: true,
          _count: { select: { units: true } },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    if (!user.isWalletzAdmin && !user.organizationIds.includes(id)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, slug: true } },
        _count: { select: { units: true, users: true, professionals: true } },
        statusHistory: { orderBy: { changedAt: 'desc' }, take: 10 },
      },
    });

    if (!org) throw new NotFoundException('Organização não encontrada');
    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto, actorId: string, user: AuthenticatedUser) {
    if (!user.isWalletzAdmin && !user.organizationIds.includes(id)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organização não encontrada');
    if (org.status === 'ENCERRADA') {
      throw new ForbiddenException('Organização encerrada não pode ser editada');
    }
    if (org.rowVersion !== dto.rowVersion) {
      throw new ConflictException('Conflito de concorrência: registro foi modificado. Recarregue e tente novamente.');
    }

    const { rowVersion: _rv, ...data } = dto;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.organization.update({
        where: { id },
        data: { ...data, rowVersion: { increment: 1 } },
      });

      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          tenantId: org.tenantId,
          organizationId: id,
          actorId,
          action: 'organization.updated',
          resource: 'Organization',
          resourceId: id,
          result: 'SUCCESS',
          previousValues: { razaoSocial: org.razaoSocial, nomeFantasia: org.nomeFantasia },
          newValues: data,
        },
      });

      return result;
    });

    return updated;
  }

  async changeStatus(id: string, dto: ChangeOrganizationStatusDto, actorId: string, user: AuthenticatedUser) {
    if (!user.isWalletzAdmin && !user.organizationIds.includes(id)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organização não encontrada');

    const allowed = ALLOWED_TRANSITIONS[org.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Transição de ${org.status} para ${dto.status} não é permitida`,
      );
    }

    if ((dto.status === 'SUSPENSA' || dto.status === 'ENCERRADA') && !dto.reason) {
      throw new BadRequestException('Motivo obrigatório para suspensão ou encerramento');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id },
        data: { status: dto.status, statusReason: dto.reason, rowVersion: { increment: 1 } },
      });

      await tx.organizationStatusHistory.create({
        data: {
          id: randomUUID(),
          organizationId: id,
          fromStatus: org.status,
          toStatus: dto.status,
          reason: dto.reason,
          changedBy: actorId,
        },
      });

      await tx.outboxEvent.create({
        data: {
          id: randomUUID(),
          tenantId: org.tenantId,
          eventType: 'organization.status_changed',
          aggregateId: id,
          payload: { organizationId: id, fromStatus: org.status, toStatus: dto.status, reason: dto.reason },
        },
      });

      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          tenantId: org.tenantId,
          organizationId: id,
          actorId,
          action: 'organization.status_changed',
          resource: 'Organization',
          resourceId: id,
          result: 'SUCCESS',
          reason: dto.reason,
          previousValues: { status: org.status },
          newValues: { status: dto.status },
        },
      });

      return updated;
    });
  }
}
