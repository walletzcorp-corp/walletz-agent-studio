import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ServiceStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';

interface CreateServiceDto {
  organizationId: string;
  specialtyId?: string;
  code: string;
  name: string;
  description?: string;
  type: string;
  durationMin: number;
  requiresProfessional?: boolean;
  requiresRoom?: boolean;
  priceAmount?: number;
  priceCurrency?: string;
  priceValidFrom?: string;
}

@Injectable()
export class ServicesCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateServiceDto, actorId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: dto.organizationId },
      select: { id: true, tenantId: true },
    });
    if (!org) throw new NotFoundException('Organização não encontrada');

    return this.prisma.$transaction(async (tx) => {
      const service = await tx.service.create({
        data: {
          id: randomUUID(),
          organizationId: dto.organizationId,
          specialtyId: dto.specialtyId,
          code: dto.code,
          name: dto.name,
          description: dto.description,
          type: dto.type,
          durationMin: dto.durationMin,
          requiresProfessional: dto.requiresProfessional ?? true,
          requiresRoom: dto.requiresRoom ?? true,
          status: 'RASCUNHO',
          version: 1,
        },
      });

      if (dto.priceAmount) {
        await tx.servicePrice.create({
          data: {
            id: randomUUID(),
            serviceId: service.id,
            currency: dto.priceCurrency ?? 'BRL',
            amount: new Decimal(dto.priceAmount),
            validFrom: dto.priceValidFrom ? new Date(dto.priceValidFrom) : new Date(),
          },
        });
      }

      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          tenantId: org.tenantId,
          organizationId: org.id,
          actorId,
          action: 'service.created',
          resource: 'Service',
          resourceId: service.id,
          result: 'SUCCESS',
          newValues: { code: dto.code, name: dto.name, type: dto.type },
        },
      });

      return service;
    });
  }

  async publish(id: string, actorId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: { organization: { select: { tenantId: true } } },
    });
    if (!service) throw new NotFoundException('Serviço não encontrado');
    if (service.status === 'PUBLICADO') return service;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.service.update({
        where: { id },
        data: { status: 'PUBLICADO', rowVersion: { increment: 1 } },
      });

      await tx.outboxEvent.create({
        data: {
          id: randomUUID(),
          tenantId: service.organization.tenantId,
          eventType: 'service.published',
          aggregateId: id,
          payload: { serviceId: id, name: service.name },
        },
      });

      return updated;
    });
  }

  async findAll(params: { organizationId?: string; status?: ServiceStatus; type?: string; page?: number; limit?: number }) {
    const { organizationId, status, type, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    if (status) where.status = status;
    if (type) where.type = type;

    const [items, total] = await Promise.all([
      this.prisma.service.findMany({ where, skip, take: limit, include: { prices: true, specialty: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.service.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const s = await this.prisma.service.findUnique({ where: { id }, include: { prices: true, specialty: true } });
    if (!s) throw new NotFoundException('Serviço não encontrado');
    return s;
  }
}
