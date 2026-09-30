import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ResourceStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

interface CreateResourceDto {
  unitId: string;
  code: string;
  name: string;
  type: string;
  description?: string;
  capacity?: number;
  floor?: string;
  location?: string;
  restrictions?: string;
}

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateResourceDto, actorId: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: dto.unitId },
      include: { organization: { select: { tenantId: true } } },
    });
    if (!unit) throw new NotFoundException('Unidade não encontrada');
    if (unit.status !== 'ATIVA') throw new BadRequestException('Unidade não está ativa');

    return this.prisma.$transaction(async (tx) => {
      const resource = await tx.resource.create({
        data: {
          id: randomUUID(),
          unitId: dto.unitId,
          code: dto.code,
          name: dto.name,
          type: dto.type,
          description: dto.description,
          capacity: dto.capacity ?? 1,
          floor: dto.floor,
          location: dto.location,
          restrictions: dto.restrictions,
          status: 'RASCUNHO',
        },
      });

      await tx.outboxEvent.create({
        data: {
          id: randomUUID(),
          tenantId: unit.organization.tenantId,
          eventType: 'resource.created',
          aggregateId: resource.id,
          payload: { resourceId: resource.id, unitId: dto.unitId, type: dto.type },
        },
      });

      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          tenantId: unit.organization.tenantId,
          organizationId: unit.organizationId,
          unitId: dto.unitId,
          actorId,
          action: 'resource.created',
          resource: 'Resource',
          resourceId: resource.id,
          result: 'SUCCESS',
          newValues: { code: dto.code, name: dto.name, type: dto.type },
        },
      });

      return resource;
    });
  }

  async findAll(params: { unitId?: string; type?: string; status?: ResourceStatus; page?: number; limit?: number }) {
    const { unitId, type, status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (unitId) where.unitId = unitId;
    if (type) where.type = type;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.resource.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.resource.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const r = await this.prisma.resource.findUnique({ where: { id }, include: { unit: { select: { id: true, name: true } } } });
    if (!r) throw new NotFoundException('Recurso não encontrado');
    return r;
  }

  async changeStatus(id: string, status: ResourceStatus, reason: string | undefined, actorId: string) {
    const r = await this.prisma.resource.findUnique({
      where: { id },
      include: { unit: { include: { organization: { select: { tenantId: true } } } } },
    });
    if (!r) throw new NotFoundException('Recurso não encontrado');

    if ((status === 'BLOQUEADO' || status === 'INATIVO') && !reason) {
      throw new BadRequestException('Motivo obrigatório');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.resource.update({ where: { id }, data: { status, statusReason: reason, rowVersion: { increment: 1 } } });

      await tx.outboxEvent.create({
        data: {
          id: randomUUID(),
          tenantId: r.unit.organization.tenantId,
          eventType: 'resource.published',
          aggregateId: id,
          payload: { resourceId: id, status },
        },
      });

      return updated;
    });
  }
}
