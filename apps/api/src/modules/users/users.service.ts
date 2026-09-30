import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { randomUUID } from 'crypto';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

interface InviteUserDto {
  email: string;
  organizationId: string;
  profileId: string;
}

@Injectable()
export class UsersService {
  private mailer: nodemailer.Transporter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.mailer = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST', 'localhost'),
      port: Number(this.config.get('SMTP_PORT', '1025')),
      secure: false,
      auth: this.config.get('SMTP_USER')
        ? { user: this.config.get('SMTP_USER'), pass: this.config.get('SMTP_PASS') }
        : undefined,
    });
  }

  async invite(dto: InviteUserDto, senderId: string, idempotencyKey?: string) {
    // Idempotência
    if (idempotencyKey) {
      const existing = await this.prisma.invite.findUnique({ where: { idempotencyKey } });
      if (existing) return existing;
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: dto.organizationId },
      select: { id: true, tenantId: true, status: true, nomeFantasia: true },
    });
    if (!org) throw new NotFoundException('Organização não encontrada');
    if (org.status === 'ENCERRADA' || org.status === 'SUSPENSA') {
      throw new ForbiddenException('Organização não aceita novos convites');
    }

    const profile = await this.prisma.profile.findUnique({ where: { id: dto.profileId } });
    if (!profile) throw new NotFoundException('Perfil não encontrado');

    const sender = await this.prisma.user.findUnique({ where: { id: senderId } });
    if (!sender) throw new NotFoundException('Remetente não encontrado');

    // Token não exposto em logs — nunca logue este token
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    const invite = await this.prisma.$transaction(async (tx) => {
      const inv = await tx.invite.create({
        data: {
          id: randomUUID(),
          email: dto.email,
          organizationId: dto.organizationId,
          profileId: dto.profileId,
          senderId,
          token,
          status: 'PENDENTE',
          expiresAt,
          idempotencyKey,
        },
      });

      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          tenantId: org.tenantId,
          organizationId: org.id,
          actorId: senderId,
          action: 'invite.created',
          resource: 'Invite',
          resourceId: inv.id,
          result: 'SUCCESS',
          newValues: { email: dto.email, profileId: dto.profileId },
        },
      });

      return inv;
    });

    // Envia e-mail (Mailpit em dev)
    const inviteUrl = `${this.config.get('WEB_URL', 'http://localhost:3000')}/convite?token=${token}`;
    await this.mailer.sendMail({
      from: this.config.get('MAIL_FROM', 'noreply@walletz-med.local'),
      to: dto.email,
      subject: `Convite para ${org.nomeFantasia} — Walletz Med`,
      html: `
        <p>Você foi convidado para <strong>${org.nomeFantasia}</strong> no Walletz Med.</p>
        <p><a href="${inviteUrl}">Clique aqui para aceitar o convite</a></p>
        <p>O convite expira em 7 dias.</p>
      `,
    }).catch(() => {
      // Falha no e-mail não reverte o convite — trate via reenvio
    });

    return { id: invite.id, email: invite.email, status: invite.status, expiresAt: invite.expiresAt };
  }

  async resendInvite(inviteId: string, actorId: string) {
    const invite = await this.prisma.invite.findUnique({ where: { id: inviteId } });
    if (!invite) throw new NotFoundException('Convite não encontrado');
    if (invite.status !== 'PENDENTE') {
      throw new BadRequestException('Apenas convites pendentes podem ser reenviados');
    }

    const newToken = randomUUID();
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.invite.update({
      where: { id: inviteId },
      data: { token: newToken, expiresAt: newExpiry },
    });

    return { message: 'Convite reenviado' };
  }

  async acceptInvite(token: string, keycloakId: string) {
    const invite = await this.prisma.invite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('Token inválido');
    if (invite.status !== 'PENDENTE') throw new BadRequestException('Convite não está mais ativo');
    if (invite.expiresAt < new Date()) {
      await this.prisma.invite.update({ where: { id: invite.id }, data: { status: 'EXPIRADO' } });
      throw new BadRequestException('Convite expirado');
    }

    const user = await this.prisma.user.findUnique({ where: { keycloakId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const org = await this.prisma.organization.findUnique({ where: { id: invite.organizationId }, select: { tenantId: true } });

    await this.prisma.$transaction(async (tx) => {
      await tx.invite.update({
        where: { id: invite.id },
        data: { status: 'ACEITO', acceptedAt: new Date(), receiverId: user.id },
      });

      // Cria vínculo usuário ↔ organização
      await tx.userOrganization.upsert({
        where: { userId_organizationId: { userId: user.id, organizationId: invite.organizationId } },
        create: {
          id: randomUUID(),
          userId: user.id,
          organizationId: invite.organizationId,
          profileId: invite.profileId,
          status: 'ATIVO',
        },
        update: { status: 'ATIVO', profileId: invite.profileId },
      });

      // Vínculo com tenant
      await tx.userTenant.upsert({
        where: { userId_tenantId: { userId: user.id, tenantId: org!.tenantId } },
        create: { id: randomUUID(), userId: user.id, tenantId: org!.tenantId },
        update: {},
      });

      await tx.auditEvent.create({
        data: {
          id: randomUUID(),
          tenantId: org!.tenantId,
          organizationId: invite.organizationId,
          actorId: user.id,
          action: 'invite.accepted',
          resource: 'Invite',
          resourceId: invite.id,
          result: 'SUCCESS',
        },
      });
    });

    return { message: 'Convite aceito com sucesso' };
  }

  async findAll(params: { organizationId?: string; status?: string; page?: number; limit?: number }) {
    const { organizationId, status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (organizationId) {
      where.organizations = { some: { organizationId } };
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: { id: true, email: true, name: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async blockUser(id: string, actorId: string, reason: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    await this.prisma.user.update({
      where: { id },
      data: { status: 'BLOQUEADO' },
    });

    await this.prisma.auditEvent.create({
      data: {
        id: randomUUID(),
        actorId,
        action: 'user.blocked',
        resource: 'User',
        resourceId: id,
        result: 'SUCCESS',
        reason,
      },
    });

    return { message: 'Usuário bloqueado' };
  }
}
