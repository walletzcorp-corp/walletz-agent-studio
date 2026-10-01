import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { randomUUID } from 'crypto';

@Injectable()
export class PatientsContactsService {
  constructor(private readonly prisma: PrismaService) {}

  private assertOrgAccess(organizationId: string, user: AuthenticatedUser) {
    if (!user.isWalletzAdmin && !user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
  }

  async create(patientId: string, organizationId: string, dto: any, user: AuthenticatedUser) {
    this.assertOrgAccess(organizationId, user);
    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, organizationId } });
    if (!patient) throw new NotFoundException('Paciente não encontrado');

    if (dto.isPrimary) {
      await this.prisma.patientContact.updateMany({
        where: { patientId, organizationId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return this.prisma.patientContact.create({
      data: {
        id: randomUUID(),
        patientId,
        organizationId,
        name: dto.name,
        relationship: dto.relationship,
        telefone: dto.telefone ? dto.telefone.replace(/\D/g, '') : undefined,
        email: dto.email,
        cpf: dto.cpf ? dto.cpf.replace(/\D/g, '') : undefined,
        isPrimary: dto.isPrimary ?? false,
        isEmergency: dto.isEmergency ?? false,
        notes: dto.notes,
      },
    });
  }

  async findAll(patientId: string, organizationId: string, user: AuthenticatedUser) {
    this.assertOrgAccess(organizationId, user);
    return this.prisma.patientContact.findMany({
      where: { patientId, organizationId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async update(contactId: string, organizationId: string, dto: any, user: AuthenticatedUser) {
    const contact = await this.prisma.patientContact.findFirst({ where: { id: contactId, organizationId } });
    if (!contact) throw new NotFoundException('Contato não encontrado');
    this.assertOrgAccess(organizationId, user);

    if (dto.isPrimary) {
      await this.prisma.patientContact.updateMany({
        where: { patientId: contact.patientId, organizationId, isPrimary: true, NOT: { id: contactId } },
        data: { isPrimary: false },
      });
    }

    return this.prisma.patientContact.update({
      where: { id: contactId },
      data: {
        name: dto.name,
        relationship: dto.relationship,
        telefone: dto.telefone ? dto.telefone.replace(/\D/g, '') : undefined,
        email: dto.email,
        isPrimary: dto.isPrimary,
        isEmergency: dto.isEmergency,
        notes: dto.notes,
      },
    });
  }

  async remove(contactId: string, organizationId: string, user: AuthenticatedUser) {
    const contact = await this.prisma.patientContact.findFirst({ where: { id: contactId, organizationId } });
    if (!contact) throw new NotFoundException('Contato não encontrado');
    this.assertOrgAccess(organizationId, user);
    await this.prisma.patientContact.delete({ where: { id: contactId } });
    return { deleted: true };
  }
}
