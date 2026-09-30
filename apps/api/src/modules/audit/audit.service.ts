import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

interface AuditQueryParams {
  tenantId?: string;
  organizationId?: string;
  unitId?: string;
  actorId?: string;
  resource?: string;
  action?: string;
  result?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: AuditQueryParams) {
    const { tenantId, organizationId, unitId, actorId, resource, action, result, from, to, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (organizationId) where.organizationId = organizationId;
    if (unitId) where.unitId = unitId;
    if (actorId) where.actorId = actorId;
    if (resource) where.resource = { contains: resource, mode: 'insensitive' };
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (result) where.result = result;
    if (from || to) {
      where.occurredAt = {};
      if (from) where.occurredAt.gte = new Date(from);
      if (to) where.occurredAt.lte = new Date(to);
    }

    const [items, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { occurredAt: 'desc' },
        // Não expõe previousValues/newValues em listagem — apenas no detalhe
        select: {
          id: true,
          tenantId: true,
          organizationId: true,
          unitId: true,
          actorId: true,
          actorEmail: true,
          action: true,
          resource: true,
          resourceId: true,
          result: true,
          correlationId: true,
          occurredAt: true,
        },
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    return this.prisma.auditEvent.findUnique({ where: { id } });
  }
}
