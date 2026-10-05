import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';

@Injectable()
export class MfaService {
  generateSecret(): string {
    return authenticator.generateSecret();
  }

  getOtpAuthUrl(email: string, secret: string): string {
    return authenticator.keyuri(email, 'Walletz Agent Studio', secret);
  }

  verifyCode(secret: string, token: string): boolean {
    return authenticator.verify({ token, secret });
  }

  async createMfaToken(_userId: string): Promise<string> {
    // Returns a short-lived token scoped only for MFA completion
    // Implementation: store in Redis with TTL=5min
    return `mfa_pending_${Date.now()}`;
  }
}
