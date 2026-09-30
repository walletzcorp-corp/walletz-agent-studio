import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UnitStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { CreateUnitDto } from './dto/create-unit.dto';

interface UpdateUnitDto {
  name?: string;
  email?: string;
  telefone?: string;
  cidade?: string;
  uf?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  timezone?: string;
  responsavelId?: string;
  rowVersion: number;
}

interface ChangeUnitStatusDto {
  status: UnitStatus;
  reason?: string;
}

// Checklist mínimo para ativação da unidade
const ACTIVATION_CHECKLIST = ['name', 'cidade', 'uf', 'telefone', 'email'];

function isChecklistComplete(unit: any): boolean {
  return ACTIVATION_CHECKLIST.every((field) => !!unit[field]);
}

const ALLOWED_TRANSITIONS: Record<UnitStatus, UnitStatus[]> = {
  RASCUNHO: ['ATIVA'],
  ATIVA: ['BLOQUEADA', 'INATIVA'],
  BLOQUEADA: ['ATIVA', 'INATIVA'],
  INATIVA: ['ATIVA'],
};

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUnitDto, actorId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: dto.organizationId },
      select: { id: true, tenantId: true, status: true },
    });
    if (!org) throw new NotFoundException('Organização não encontrada');
    if (org.status === 'ENCERRADA') {
      throw new ForbiddenException('Organização encerrada não aceita novas unidades');
    }

    const existing = await this.prisma.unit.findUnique({
      where: { organizationId_code: { organizationId: dto.organizationId, code: dto.code } },
    });
    if (existing) throw new ConflictException('Código de unidade já existe na organização');

    const unit = await this.prisma.$transaction(async (tx) => {
      const u = await tx.unit.create({
        data: {
          id: randomUUID(),
          organizationId: dto.organizationId,
          code: dto.code,
          name: dto.name,
          email: dto.email,
          telefone: dto.telefone,
          cidade: dto.cidade,
          uf: dto.uf.toUpperCase(),
          logradouro: dto.logradouro,
          numero: dto.numero,
          complemento: dto.complemento,
          bairro: dto.bairro,
          cep: dto.cep,
          timezone: dto.timezone ?? 'America/Sao_Paulo',
          responsavelId: dto.responsavelId,
          status: 'RASCUNHO',
          checklistCompleted: false,
        },
      });

      await tx.outboxEvent.create({
        data: {
          id: randomUUID(),
          tenantId: org.tenantId,
          eventType: 'unit.created',
          aggregateId: u.id,
          payload: { unitId: u.id, organizationId: org.id, name: u.name },
        },
      });

      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          tenantId: org.tenantId,
          organizationId: org.id,
          unitId: u.id,
          actorId,
          action: 'unit.created',
          resource: 'Unit',
          resourceId: u.id,
          result: 'SUCCESS',
          newValues: { code: u.code, name: u.name, status: u.status },
        },
      });

      return u;
    });

    return unit;
  }

  async findAll(params: {
    organizationId?: string;
    status?: UnitStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { organizationId, status, search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { cidade: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.unit.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.unit.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, nomeFantasia: true, status: true } },
        _count: { select: { users: true, professionals: true, resources: true } },
        statusHistory: { orderBy: { changedAt: 'desc' }, take: 10 },
      },
    });
    if (!unit) throw new NotFoundException('Unidade não encontrada');
    return unit;
  }

  async update(id: string, dto: UpdateUnitDto, actorId: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: { organization: { select: { tenantId: true } } },
    });
    if (!unit) throw new NotFoundException('Unidade não encontrada');
    if (unit.status === 'INATIVA') {
      throw new ForbiddenException('Unidade inativa não pode ser editada');
    }
    if (unit.rowVersion !== dto.rowVersion) {
      throw new ConflictException('Conflito de concorrência: registro foi modificado. Recarregue e tente novamente.');
    }

    const { rowVersion: _rv, ...data } = dto;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.unit.update({
        where: { id },
        data: {
          ...data,
          checklistCompleted: isChecklistComplete({ ...unit, ...data }),
          rowVersion: { increment: 1 },
        },
      });

      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          tenantId: unit.organization.tenantId,
          organizationId: unit.organizationId,
          unitId: id,
          actorId,
          action: 'unit.updated',
          resource: 'Unit',
          resourceId: id,
          result: 'SUCCESS',
        },
      });

      return updated;
    });
  }

  async changeStatus(id: string, dto: ChangeUnitStatusDto, actorId: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: { organization: { select: { tenantId: true } } },
    });
    if (!unit) throw new NotFoundException('Unidade não encontrada');

    const allowed = ALLOWED_TRANSITIONS[unit.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(`Transição ${unit.status} → ${dto.status} não permitida`);
    }

    // Checklist obrigatório para ativação
    if (dto.status === 'ATIVA' && !unit.checklistCompleted) {
      const missing = ACTIVATION_CHECKLIST.filter((f) => !(unit as any)[f]);
      throw new BadRequestException(`Checklist incompleto. Campos faltando: ${missing.join(', ')}`);
    }

    if ((dto.status === 'BLOQUEADA' || dto.status === 'INATIVA') && !dto.reason) {
      throw new BadRequestException('Motivo obrigatório para bloquear ou inativar');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.unit.update({
        where: { id },
        data: { status: dto.status, statusReason: dto.reason, rowVersion: { increment: 1 } },
      });

      await tx.unitStatusHistory.create({
        data: {
          id: randomUUID(),
          unitId: id,
          fromStatus: unit.status,
          toStatus: dto.status,
          reason: dto.reason,
          changedBy: actorId,
        },
      });

      await tx.outboxEvent.create({
        data: {
          id: randomUUID(),
          tenantId: unit.organization.tenantId,
          eventType: 'unit.status_changed',
          aggregateId: id,
          payload: { unitId: id, fromStatus: unit.status, toStatus: dto.status },
        },
      });

      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          tenantId: unit.organization.tenantId,
          organizationId: unit.organizationId,
          unitId: id,
          actorId,
          action: 'unit.status_changed',
          resource: 'Unit',
          resourceId: id,
          result: 'SUCCESS',
          reason: dto.reason,
          previousValues: { status: unit.status },
          newValues: { status: dto.status },
        },
      });

      return updated;
    });
  }
}
