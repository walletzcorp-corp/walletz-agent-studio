import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { randomUUID } from 'crypto';

interface CreateProfessionalDto {
  organizationId: string;
  name: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  councilType?: string;
  councilNumber?: string;
  councilUf?: string;
  specialtyIds?: string[];
}

interface LinkProfessionalToUnitDto {
  professionalId: string;
  unitId: string;
  role?: string;
  startDate: string;
}

@Injectable()
export class ProfessionalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProfessionalDto, actorId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: dto.organizationId },
      select: { id: true, tenantId: true },
    });
    if (!org) throw new NotFoundException('Organização não encontrada');

    return this.prisma.$transaction(async (tx) => {
      const prof = await tx.professional.create({
        data: {
          id: randomUUID(),
          organizationId: dto.organizationId,
          name: dto.name,
          cpf: dto.cpf,
          email: dto.email,
          telefone: dto.telefone,
          councilType: dto.councilType,
          councilNumber: dto.councilNumber,
          councilUf: dto.councilUf,
          specialties: dto.specialtyIds?.length
            ? { create: dto.specialtyIds.map((id) => ({ specialtyId: id })) }
            : undefined,
        },
        include: { specialties: true },
      });

      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          tenantId: org.tenantId,
          organizationId: org.id,
          actorId,
          action: 'professional.created',
          resource: 'Professional',
          resourceId: prof.id,
          result: 'SUCCESS',
          newValues: { name: prof.name },
        },
      });

      return prof;
    });
  }

  async findAll(params: { organizationId?: string; page?: number; limit?: number }) {
    const { organizationId, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;

    const [items, total] = await Promise.all([
      this.prisma.professional.findMany({
        where,
        skip,
        take: limit,
        include: { specialties: { include: { specialty: true } }, unitLinks: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.professional.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const prof = await this.prisma.professional.findUnique({
      where: { id },
      include: {
        specialties: { include: { specialty: true } },
        credentials: true,
        unitLinks: { include: { unit: { select: { id: true, name: true } } } },
      },
    });
    if (!prof) throw new NotFoundException('Profissional não encontrado');
    return prof;
  }

  async linkToUnit(dto: LinkProfessionalToUnitDto, actorId: string) {
    const [prof, unit] = await Promise.all([
      this.prisma.professional.findUnique({ where: { id: dto.professionalId }, select: { id: true, organizationId: true } }),
      this.prisma.unit.findUnique({ where: { id: dto.unitId }, select: { id: true, organizationId: true, status: true } }),
    ]);

    if (!prof) throw new NotFoundException('Profissional não encontrado');
    if (!unit) throw new NotFoundException('Unidade não encontrada');
    if (unit.organizationId !== prof.organizationId) {
      throw new BadRequestException('Profissional e unidade pertencem a organizações diferentes');
    }
    if (unit.status !== 'ATIVA') {
      throw new BadRequestException('Não é possível vincular a uma unidade não ativa');
    }

    const org = await this.prisma.organization.findUnique({ where: { id: prof.organizationId }, select: { tenantId: true } });

    return this.prisma.$transaction(async (tx) => {
      const link = await tx.professionalUnitLink.upsert({
        where: { professionalId_unitId: { professionalId: dto.professionalId, unitId: dto.unitId } },
        create: {
          id: randomUUID(),
          professionalId: dto.professionalId,
          unitId: dto.unitId,
          role: dto.role,
          startDate: new Date(dto.startDate),
          status: 'PENDENTE',
        },
        update: { status: 'PENDENTE', role: dto.role },
      });

      await tx.outboxEvent.create({
        data: {
          id: randomUUID(),
          tenantId: org!.tenantId,
          eventType: 'professional.linked_to_unit',
          aggregateId: dto.professionalId,
          payload: { professionalId: dto.professionalId, unitId: dto.unitId },
        },
      });

      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          tenantId: org!.tenantId,
          organizationId: prof.organizationId,
          unitId: dto.unitId,
          actorId,
          action: 'professional.linked_to_unit',
          resource: 'ProfessionalUnitLink',
          resourceId: link.id,
          result: 'SUCCESS',
        },
      });

      return link;
    });
  }
}
