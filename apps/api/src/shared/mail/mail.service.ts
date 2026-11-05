import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class MailService {
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    const isProd = configService.get<string>('NODE_ENV') === 'production';

    if (!isProd) {
      // Outside production nothing leaves the process (jsonTransport).
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
    } else {
      // Production must never silently drop mail: SMTP is mandatory.
      this.transporter = nodemailer.createTransport({
        host: configService.getOrThrow<string>('SMTP_HOST'),
        port: configService.get<number>('SMTP_PORT', 587),
        secure: configService.get<boolean>('SMTP_SECURE', false),
        auth: {
          user: configService.getOrThrow('SMTP_USER'),
          pass: configService.getOrThrow('SMTP_PASS'),
        },
      });
    }
  }

  async sendEmailVerification(to: string, token: string, baseUrl: string): Promise<void> {
    const url = `${baseUrl}/auth/verify-email?token=${token}`;
    await this.send(
      to,
      'Verifique seu email — Walletz Agent Studio',
      this.verificationTemplate(url),
    );
  }

  async sendPasswordReset(to: string, token: string, baseUrl: string): Promise<void> {
    const url = `${baseUrl}/auth/reset-password?token=${token}`;
    await this.send(
      to,
      'Redefinição de senha — Walletz Agent Studio',
      this.passwordResetTemplate(url),
    );
  }

  async sendInvite(to: string, tenantName: string, token: string, baseUrl: string): Promise<void> {
    const url = `${baseUrl}/auth/accept-invite?token=${token}`;
    await this.send(
      to,
      `Convite para ${tenantName} — Walletz Agent Studio`,
      this.inviteTemplate(tenantName, url),
    );
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    const from = this.configService.get<string>('SMTP_FROM', 'noreply@walletz.com.br');
    const info = await this.transporter.sendMail({ from, to, subject, html });
    // Links carry one-time tokens, so the body is only printed on explicit local opt-in.
    if (process.env.NODE_ENV === 'development' && process.env.MAIL_DEV_PREVIEW === 'true') {
      const message = (info as { message?: string }).message;
      process.stdout.write(`[MailService] ${subject} → ${to}\n`);
      if (message) process.stdout.write(`[MailService] Preview: ${message}\n`);
    }
  }

  private verificationTemplate(url: string): string {
    return `
      <h2>Verifique seu email</h2>
      <p>Clique no link abaixo para verificar seu endereço de email:</p>
      <a href="${url}">${url}</a>
      <p>O link expira em 24 horas.</p>
    `;
  }

  private passwordResetTemplate(url: string): string {
    return `
      <h2>Redefinição de senha</h2>
      <p>Clique no link abaixo para redefinir sua senha:</p>
      <a href="${url}">${url}</a>
      <p>O link expira em 1 hora. Se você não solicitou isso, ignore este email.</p>
    `;
  }

  private inviteTemplate(tenantName: string, url: string): string {
    return `
      <h2>Você foi convidado para ${escapeHtml(tenantName)}</h2>
      <p>Clique no link abaixo para aceitar o convite:</p>
      <a href="${url}">${url}</a>
      <p>O link expira em 7 dias.</p>
    `;
  }
}
