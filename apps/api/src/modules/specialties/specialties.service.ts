import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { randomUUID } from 'crypto';

interface CreateSpecialtyDto {
  organizationId: string;
  code: string;
  name: string;
  description?: string;
}

@Injectable()
export class SpecialtiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSpecialtyDto, actorId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: dto.organizationId },
      select: { id: true, tenantId: true },
    });
    if (!org) throw new NotFoundException('Organização não encontrada');

    const existing = await this.prisma.specialty.findUnique({
      where: { organizationId_code: { organizationId: dto.organizationId, code: dto.code } },
    });
    if (existing) throw new ConflictException('Código de especialidade já existe na organização');

    return this.prisma.$transaction(async (tx) => {
      const specialty = await tx.specialty.create({
        data: {
          id: randomUUID(),
          organizationId: dto.organizationId,
          code: dto.code,
          name: dto.name,
          description: dto.description,
          active: true,
        },
      });

      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          tenantId: org.tenantId,
          organizationId: org.id,
          actorId,
          action: 'specialty.created',
          resource: 'Specialty',
          resourceId: specialty.id,
          result: 'SUCCESS',
          newValues: { code: dto.code, name: dto.name },
        },
      });

      return specialty;
    });
  }

  async findAll(params: { organizationId?: string; active?: boolean; page?: number; limit?: number }) {
    const { organizationId, active, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    if (active !== undefined) where.active = active;

    const [items, total] = await Promise.all([
      this.prisma.specialty.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.specialty.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const s = await this.prisma.specialty.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Especialidade não encontrada');
    return s;
  }

  async toggleActive(id: string, actorId: string) {
    const s = await this.prisma.specialty.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Especialidade não encontrada');

    return this.prisma.specialty.update({
      where: { id },
      data: { active: !s.active },
    });
  }
}
