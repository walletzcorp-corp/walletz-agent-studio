import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { randomUUID } from 'crypto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

interface CreatePatientDto {
  organizationId: string;
  name: string;
  cpf?: string;
  dataNasc?: string;
  sexo?: string;
  telefone?: string;
  email?: string;
  notes?: string;
}

interface UpdatePatientDto {
  name?: string;
  cpf?: string;
  dataNasc?: string;
  sexo?: string;
  telefone?: string;
  email?: string;
  notes?: string;
  rowVersion: number;
}

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  private assertAccess(organizationId: string, user: AuthenticatedUser) {
    if (!user.isWalletzAdmin && !user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
  }

  async create(dto: CreatePatientDto, user: AuthenticatedUser) {
    this.assertAccess(dto.organizationId, user);

    if (dto.cpf) {
      const existing = await this.prisma.patient.findUnique({
        where: { organizationId_cpf: { organizationId: dto.organizationId, cpf: dto.cpf } },
      });
      if (existing) throw new ConflictException('CPF já cadastrado nesta organização');
    }

    return this.prisma.patient.create({
      data: {
        id: randomUUID(),
        organizationId: dto.organizationId,
        name: dto.name,
        cpf: dto.cpf ?? null,
        dataNasc: dto.dataNasc ? new Date(dto.dataNasc) : null,
        sexo: dto.sexo ?? null,
        telefone: dto.telefone ?? null,
        email: dto.email ?? null,
        notes: dto.notes ?? null,
      },
    });
  }

  async findAll(
    params: { organizationId?: string; search?: string; page?: number; limit?: number },
    user: AuthenticatedUser,
  ) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (user.isWalletzAdmin) {
      if (params.organizationId) where.organizationId = params.organizationId;
    } else {
      where.organizationId = params.organizationId
        ? user.organizationIds.includes(params.organizationId)
          ? params.organizationId
          : undefined
        : { in: user.organizationIds };
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { cpf: { contains: params.search } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { telefone: { contains: params.search } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.patient.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException('Paciente não encontrado');
    this.assertAccess(patient.organizationId, user);
    return patient;
  }

  async update(id: string, dto: UpdatePatientDto, user: AuthenticatedUser) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException('Paciente não encontrado');
    this.assertAccess(patient.organizationId, user);

    if (patient.rowVersion !== dto.rowVersion) {
      throw new ConflictException('Registro alterado por outro usuário. Recarregue e tente novamente.');
    }

    if (dto.cpf && dto.cpf !== patient.cpf) {
      const existing = await this.prisma.patient.findUnique({
        where: { organizationId_cpf: { organizationId: patient.organizationId, cpf: dto.cpf } },
      });
      if (existing) throw new ConflictException('CPF já cadastrado nesta organização');
    }

    return this.prisma.patient.update({
      where: { id },
      data: {
        name: dto.name,
        cpf: dto.cpf,
        dataNasc: dto.dataNasc ? new Date(dto.dataNasc) : undefined,
        sexo: dto.sexo,
        telefone: dto.telefone,
        email: dto.email,
        notes: dto.notes,
        rowVersion: { increment: 1 },
      },
    });
  }
}
