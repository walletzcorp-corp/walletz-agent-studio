import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { randomUUID } from 'crypto';

// CPF validation (Luhn-like algorithm)
export function isValidCpf(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const calc = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += +d[i] * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === +d[9] && calc(10) === +d[10];
}

// CNS validation (18-digit format, modulo-11)
export function isValidCns(cns: string): boolean {
  const d = cns.replace(/\D/g, '');
  if (d.length !== 15) return false;
  const first = +d[0];
  if (first < 1 || first > 9) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) sum += +d[i] * (15 - i);
  return sum % 11 === 0;
}

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  private assertAccess(organizationId: string, user: AuthenticatedUser) {
    if (!user.isWalletzAdmin && !user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
  }

  // RF-PAC-004: Verificação de possível duplicidade antes de criar
  async checkDuplicity(dto: {
    organizationId: string;
    cpf?: string;
    cns?: string;
    name?: string;
    dataNasc?: string;
    telefone?: string;
  }, user: AuthenticatedUser) {
    this.assertAccess(dto.organizationId, user);
    const candidates: any[] = [];

    // CPF exato
    if (dto.cpf) {
      const byCpf = await this.prisma.patient.findMany({
        where: { organizationId: dto.organizationId, cpf: dto.cpf.replace(/\D/g, '') },
        select: { id: true, name: true, cpf: true, dataNasc: true, telefone: true, deactivatedAt: true },
      });
      candidates.push(...byCpf.map((p) => ({ ...p, matchReason: 'CPF idêntico', score: 100 })));
    }

    // CNS exato
    if (dto.cns) {
      const byCns = await this.prisma.patient.findMany({
        where: { organizationId: dto.organizationId, cns: dto.cns.replace(/\D/g, '') },
        select: { id: true, name: true, cpf: true, cns: true, dataNasc: true, telefone: true, deactivatedAt: true },
      });
      candidates.push(...byCns.map((p) => ({ ...p, matchReason: 'CNS idêntico', score: 100 })));
    }

    // Nome + data nascimento
    if (dto.name && dto.dataNasc) {
      const byNameDate = await this.prisma.patient.findMany({
        where: {
          organizationId: dto.organizationId,
          name: { contains: dto.name.trim(), mode: 'insensitive' },
          dataNasc: new Date(dto.dataNasc),
        },
        select: { id: true, name: true, cpf: true, dataNasc: true, telefone: true, deactivatedAt: true },
      });
      for (const p of byNameDate) {
        if (!candidates.find((c) => c.id === p.id))
          candidates.push({ ...p, matchReason: 'Nome e data de nascimento similares', score: 80 });
      }
    }

    // Telefone
    if (dto.telefone) {
      const byPhone = await this.prisma.patient.findMany({
        where: { organizationId: dto.organizationId, telefone: dto.telefone.replace(/\D/g, '') },
        select: { id: true, name: true, cpf: true, dataNasc: true, telefone: true, deactivatedAt: true },
      });
      for (const p of byPhone) {
        if (!candidates.find((c) => c.id === p.id))
          candidates.push({ ...p, matchReason: 'Telefone idêntico', score: 60 });
      }
    }

    // Deduplica e ordena por score
    const seen = new Set<string>();
    const unique = candidates.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
    return unique.sort((a, b) => b.score - a.score);
  }

  async create(dto: any, user: AuthenticatedUser) {
    this.assertAccess(dto.organizationId, user);

    const cpf = dto.cpf ? dto.cpf.replace(/\D/g, '') : undefined;
    const cns = dto.cns ? dto.cns.replace(/\D/g, '') : undefined;

    if (cpf) {
      const exists = await this.prisma.patient.findFirst({
        where: { organizationId: dto.organizationId, cpf },
      });
      if (exists) throw new ConflictException('Já existe um paciente com este CPF nesta organização');
    }

    if (cns) {
      const exists = await this.prisma.patient.findFirst({
        where: { organizationId: dto.organizationId, cns },
      });
      if (exists) throw new ConflictException('Já existe um paciente com este CNS nesta organização');
    }

    const patient = await this.prisma.patient.create({
      data: {
        id: randomUUID(),
        organizationId: dto.organizationId,
        name: dto.name,
        nomeSocial: dto.nomeSocial,
        cpf,
        cns,
        rg: dto.rg,
        rgOrgaoEmissor: dto.rgOrgaoEmissor,
        dataNasc: dto.dataNasc ? new Date(dto.dataNasc) : undefined,
        sexo: dto.sexo,
        estadoCivil: dto.estadoCivil,
        nacionalidade: dto.nacionalidade,
        naturalidade: dto.naturalidade,
        etnia: dto.etnia,
        escolaridade: dto.escolaridade,
        profissao: dto.profissao,
        telefone: dto.telefone ? dto.telefone.replace(/\D/g, '') : undefined,
        email: dto.email,
        notes: dto.notes,
        logradouro: dto.logradouro,
        numero: dto.numero,
        complemento: dto.complemento,
        bairro: dto.bairro,
        cidade: dto.cidade,
        uf: dto.uf,
        cep: dto.cep ? dto.cep.replace(/\D/g, '') : undefined,
        marketingBlocked: dto.marketingBlocked ?? false,
        preferencias: dto.preferencias as any,
      },
    });

    await this.writeAudit(patient.id, dto.organizationId, user, 'CREATE', 'patient', patient.id);
    return patient;
  }

  async findAll(params: {
    organizationId?: string;
    search?: string;
    page?: number;
    limit?: number;
    includeInactive?: boolean;
  }, user: AuthenticatedUser) {
    if (params.organizationId) {
      this.assertAccess(params.organizationId, user);
    }

    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const orgFilter = user.isWalletzAdmin
      ? params.organizationId ? { organizationId: params.organizationId } : {}
      : { organizationId: params.organizationId ?? { in: user.organizationIds } };

    const where: any = {
      ...orgFilter,
      ...(params.includeInactive ? {} : { deactivatedAt: null }),
    };

    if (params.search?.trim()) {
      const s = params.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { nomeSocial: { contains: s, mode: 'insensitive' } },
        { cpf: { contains: s.replace(/\D/g, '') } },
        { cns: { contains: s.replace(/\D/g, '') } },
        { email: { contains: s, mode: 'insensitive' } },
        { telefone: { contains: s.replace(/\D/g, '') } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          alerts: { where: { active: true }, select: { id: true, type: true, severity: true, message: true } },
          insurances: { where: { active: true }, select: { id: true, operator: true, planName: true, cardNumber: true } },
        },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        alerts: { where: { active: true }, orderBy: { createdAt: 'desc' } },
        contacts: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
        insurances: { where: { active: true }, orderBy: { createdAt: 'desc' } },
        consents: { orderBy: { signedAt: 'desc' } },
        documents: { orderBy: { createdAt: 'desc' } },
        guardianLinks: { include: { guardian: { select: { id: true, name: true, cpf: true } } } },
        dependentLinks: { include: { dependent: { select: { id: true, name: true, cpf: true, dataNasc: true } } } },
        formResponses: { orderBy: { submittedAt: 'desc' }, take: 10, include: { form: { select: { id: true, name: true, version: true } } } },
      },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado');
    this.assertAccess(patient.organizationId, user);

    await this.writeAudit(id, patient.organizationId, user, 'VIEW', 'patient', id);
    return patient;
  }

  async update(id: string, dto: any, user: AuthenticatedUser) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException('Paciente não encontrado');
    this.assertAccess(patient.organizationId, user);

    if (patient.rowVersion !== dto.rowVersion) {
      throw new ConflictException('Conflito de versão — recarregue e tente novamente');
    }

    const cpf = dto.cpf !== undefined ? (dto.cpf ? dto.cpf.replace(/\D/g, '') : null) : undefined;
    const cns = dto.cns !== undefined ? (dto.cns ? dto.cns.replace(/\D/g, '') : null) : undefined;

    if (cpf && cpf !== patient.cpf) {
      const exists = await this.prisma.patient.findFirst({
        where: { organizationId: patient.organizationId, cpf, NOT: { id } },
      });
      if (exists) throw new ConflictException('Já existe um paciente com este CPF nesta organização');
    }

    if (cns && cns !== patient.cns) {
      const exists = await this.prisma.patient.findFirst({
        where: { organizationId: patient.organizationId, cns, NOT: { id } },
      });
      if (exists) throw new ConflictException('Já existe um paciente com este CNS nesta organização');
    }

    const updated = await this.prisma.patient.update({
      where: { id },
      data: {
        name: dto.name,
        nomeSocial: dto.nomeSocial,
        cpf,
        cns,
        rg: dto.rg,
        rgOrgaoEmissor: dto.rgOrgaoEmissor,
        dataNasc: dto.dataNasc !== undefined ? (dto.dataNasc ? new Date(dto.dataNasc) : null) : undefined,
        sexo: dto.sexo,
        estadoCivil: dto.estadoCivil,
        nacionalidade: dto.nacionalidade,
        naturalidade: dto.naturalidade,
        etnia: dto.etnia,
        escolaridade: dto.escolaridade,
        profissao: dto.profissao,
        telefone: dto.telefone !== undefined ? (dto.telefone ? dto.telefone.replace(/\D/g, '') : null) : undefined,
        email: dto.email,
        notes: dto.notes,
        logradouro: dto.logradouro,
        numero: dto.numero,
        complemento: dto.complemento,
        bairro: dto.bairro,
        cidade: dto.cidade,
        uf: dto.uf,
        cep: dto.cep !== undefined ? (dto.cep ? dto.cep.replace(/\D/g, '') : null) : undefined,
        marketingBlocked: dto.marketingBlocked,
        preferencias: dto.preferencias as any,
        rowVersion: { increment: 1 },
      },
    });

    await this.writeAudit(id, patient.organizationId, user, 'UPDATE', 'patient', id);
    return updated;
  }

  async deactivate(id: string, user: AuthenticatedUser) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException('Paciente não encontrado');
    this.assertAccess(patient.organizationId, user);

    const updated = await this.prisma.patient.update({
      where: { id },
      data: { deactivatedAt: new Date() },
    });
    await this.writeAudit(id, patient.organizationId, user, 'DEACTIVATE', 'patient', id);
    return updated;
  }

  async getTimeline(patientId: string, organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, organizationId },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado nesta organização');

    // Aggregate timeline events from different sources
    const [appointments, consents, auditLogs] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { patientId, organizationId },
        orderBy: { startsAt: 'desc' },
        take: 50,
        select: { id: true, startsAt: true, type: true, status: true },
      }),
      this.prisma.patientConsent.findMany({
        where: { patientId, organizationId },
        orderBy: { signedAt: 'desc' },
        take: 20,
        select: { id: true, type: true, status: true, signedAt: true, revokedAt: true, channel: true },
      }),
      this.prisma.patientAuditLog.findMany({
        where: { patientId, organizationId, action: { in: ['EXPORT', 'DOC_UPLOAD', 'DOC_VIEW'] } },
        orderBy: { occurredAt: 'desc' },
        take: 20,
        select: { id: true, action: true, occurredAt: true, actorName: true, resourceType: true },
      }),
    ]);

    const events: any[] = [
      ...appointments.map((a) => ({ id: a.id, type: 'AGENDAMENTO', date: a.startsAt, detail: `${a.type as string} — ${a.status}`, source: 'scheduling' })),
      ...consents.map((c) => ({ id: c.id, type: 'CONSENTIMENTO', date: c.signedAt, detail: `${c.type} ${c.status}`, source: 'consents' })),
      ...auditLogs.map((l) => ({ id: l.id, type: 'AUDITORIA', date: l.occurredAt, detail: `${l.action} por ${l.actorName}`, source: 'audit' })),
    ];

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    await this.writeAudit(patientId, organizationId, user, 'VIEW', 'timeline', patientId);
    return events;
  }

  async exportData(patientId: string, organizationId: string, purpose: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, organizationId },
      include: {
        contacts: true,
        insurances: { where: { active: true } },
        alerts: true,
        consents: true,
        documents: { select: { id: true, type: true, fileName: true, description: true, createdAt: true } },
      },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado nesta organização');

    await this.writeAudit(patientId, organizationId, user, 'EXPORT', 'patient', patientId, { purpose });
    return { patient, exportedAt: new Date(), exportedBy: user.sub, purpose };
  }

  async writeAudit(
    patientId: string,
    organizationId: string,
    user: AuthenticatedUser,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.prisma.patientAuditLog.create({
      data: {
        patientId,
        organizationId,
        actorSub: user.sub,
        actorName: user.name ?? user.email,
        action,
        resourceType,
        resourceId,
        metadata: metadata as any,
      },
    });
  }
}
