import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { randomUUID, randomBytes } from 'crypto';

export type NotificationChannel = 'WHATSAPP' | 'SMS' | 'EMAIL';
export type NotificationEvent = 'CONFIRMACAO' | 'CANCELAMENTO' | 'REAGENDAMENTO' | 'LEMBRETE';

interface SendNotificationDto {
  appointmentId: string;
  organizationId: string;
  event: NotificationEvent;
  channel: NotificationChannel;
  recipient: string; // phone or email
  patientName: string;
  scheduledAt: Date;
}

interface TokenResult {
  token: string;
  expiresAt: Date;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  // Detect whether a real provider is configured for each channel.
  // In production these would come from ConfigService; here we use env vars.
  private get whatsappConfigured(): boolean {
    return !!process.env.WHATSAPP_API_KEY;
  }
  private get smsConfigured(): boolean {
    return !!process.env.SMS_API_KEY;
  }
  private get emailConfigured(): boolean {
    return !!process.env.SMTP_HOST;
  }

  constructor(private readonly prisma: PrismaService) {}

  // RF-AGE-006: Idempotent send — same event+channel for an appointment is a no-op if already sent.
  async send(dto: SendNotificationDto): Promise<{ status: string; isDemo: boolean }> {
    const idempotencyKey = `${dto.appointmentId}:${dto.event}:${dto.channel}`;

    const existing = await this.prisma.appointmentNotification.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return { status: existing.status, isDemo: existing.isDemo };
    }

    const isDemo = !this.isProviderConfigured(dto.channel);
    const content = this.renderTemplate(dto);

    const record = await this.prisma.appointmentNotification.create({
      data: {
        id: randomUUID(),
        appointmentId: dto.appointmentId,
        organizationId: dto.organizationId,
        channel: dto.channel,
        event: dto.event,
        idempotencyKey,
        status: isDemo ? 'DEMO' : 'PENDENTE',
        recipient: dto.recipient,
        content,
        isDemo,
      },
    });

    if (isDemo) {
      // Demo mode: log clearly that no real message was sent (no PII in log).
      this.logger.log(
        `[DEMO] Notificação ${dto.event} via ${dto.channel} — nenhuma mensagem real enviada (provedor não configurado)`,
      );
      return { status: 'DEMO', isDemo: true };
    }

    try {
      await this.dispatchToProvider(dto);
      await this.prisma.appointmentNotification.update({
        where: { id: record.id },
        data: { status: 'ENVIADO', sentAt: new Date() },
      });
      return { status: 'ENVIADO', isDemo: false };
    } catch (err: any) {
      await this.prisma.appointmentNotification.update({
        where: { id: record.id },
        data: { status: 'FALHOU', failReason: err?.message ?? 'Erro desconhecido' },
      });
      return { status: 'FALHOU', isDemo: false };
    }
  }

  // RF-AGE-007: Generate a secure one-time token for patient self-service link.
  // Token is NOT logged.
  async createToken(
    appointmentId: string,
    organizationId: string,
    action: 'CONFIRMAR' | 'CANCELAR' | 'REAGENDAR',
    ttlHours = 48,
  ): Promise<TokenResult> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    await this.prisma.appointmentToken.create({
      data: {
        id: randomUUID(),
        appointmentId,
        organizationId,
        token,
        action,
        expiresAt,
      },
    });

    return { token, expiresAt };
  }

  async validateToken(token: string): Promise<{
    appointmentId: string;
    organizationId: string;
    action: string;
  } | null> {
    const record = await this.prisma.appointmentToken.findUnique({
      where: { token },
    });

    if (!record) return null;
    if (record.usedAt) return null;
    if (record.expiresAt < new Date()) return null;

    return {
      appointmentId: record.appointmentId,
      organizationId: record.organizationId,
      action: record.action,
    };
  }

  async consumeToken(token: string): Promise<void> {
    await this.prisma.appointmentToken.update({
      where: { token },
      data: { usedAt: new Date() },
    });
  }

  private isProviderConfigured(channel: NotificationChannel): boolean {
    if (channel === 'WHATSAPP') return this.whatsappConfigured;
    if (channel === 'SMS') return this.smsConfigured;
    if (channel === 'EMAIL') return this.emailConfigured;
    return false;
  }

  private renderTemplate(dto: SendNotificationDto): string {
    const date = dto.scheduledAt.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    const templates: Record<NotificationEvent, string> = {
      CONFIRMACAO: `Olá ${dto.patientName}! Seu agendamento para ${date} foi confirmado.`,
      CANCELAMENTO: `Olá ${dto.patientName}! Seu agendamento para ${date} foi cancelado.`,
      REAGENDAMENTO: `Olá ${dto.patientName}! Seu agendamento foi reagendado para ${date}.`,
      LEMBRETE: `Olá ${dto.patientName}! Lembrete: você tem um agendamento amanhã às ${date}.`,
    };
    return templates[dto.event];
  }

  // Stub dispatcher — replace with real provider clients in production.
  private async dispatchToProvider(dto: SendNotificationDto): Promise<void> {
    if (dto.channel === 'WHATSAPP') {
      throw new Error('WhatsApp provider not implemented');
    }
    if (dto.channel === 'SMS') {
      throw new Error('SMS provider not implemented');
    }
    if (dto.channel === 'EMAIL') {
      throw new Error('Email provider not implemented');
    }
  }
}
