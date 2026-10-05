import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = configService.get<string>('SMTP_HOST');
    const isDev = configService.get<string>('NODE_ENV') !== 'production';

    if (isDev || !host) {
      // In development, log emails to console (ethereal or null transport)
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
    } else {
      this.transporter = nodemailer.createTransport({
        host,
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
    await this.send(to, 'Verifique seu email — Walletz Agent Studio', this.verificationTemplate(url));
  }

  async sendPasswordReset(to: string, token: string, baseUrl: string): Promise<void> {
    const url = `${baseUrl}/auth/reset-password?token=${token}`;
    await this.send(to, 'Redefinição de senha — Walletz Agent Studio', this.passwordResetTemplate(url));
  }

  async sendInvite(to: string, tenantName: string, token: string, baseUrl: string): Promise<void> {
    const url = `${baseUrl}/auth/accept-invite?token=${token}`;
    await this.send(to, `Convite para ${tenantName} — Walletz Agent Studio`, this.inviteTemplate(tenantName, url));
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    const from = this.configService.get<string>('SMTP_FROM', 'noreply@walletz.com.br');
    const info = await this.transporter.sendMail({ from, to, subject, html });
    // In dev (jsonTransport), log the serialized message
    if (process.env.NODE_ENV !== 'production') {
      process.stdout.write(`[MailService] ${subject} → ${to}\n`);
      if ((info as { message?: string }).message) {
        process.stdout.write(`[MailService] Preview: ${(info as { message: string }).message}\n`);
      }
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
      <h2>Você foi convidado para ${tenantName}</h2>
      <p>Clique no link abaixo para aceitar o convite:</p>
      <a href="${url}">${url}</a>
      <p>O link expira em 7 dias.</p>
    `;
  }
}
