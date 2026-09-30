import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { MedicalRecordsService } from './medical-records.service';
import { EntryStatus, SignatureStatus, PepAuditAction } from '@prisma/client';

// RF-PEP-009: Adapter interface — swap real provider here when configured
interface SignatureProviderResult {
  status: SignatureStatus;
  providerName: string;
  providerRef: string | null;
  signedAt: Date;
}

// DEMO adapter — clearly labeled, never claims legal validity
function demoSign(signerName: string): SignatureProviderResult {
  return {
    status: SignatureStatus.DEMO,
    providerName: 'DEMO',
    providerRef: null,
    signedAt: new Date(),
  };
}

@Injectable()
export class SignatureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recordsService: MedicalRecordsService,
  ) {}

  // RF-PEP-009: sign entry using the configured adapter (DEMO by default)
  async sign(entryId: string, signerCouncil: string | undefined, user: AuthenticatedUser) {
    const entry = await this.prisma.clinicalEntry.findUnique({
      where: { id: entryId },
      select: { id: true, recordId: true, status: true, record: { select: { organizationId: true } } },
    });
    if (!entry) throw new NotFoundException('Entrada clínica não encontrada');
    if (!user.isWalletzAdmin && !user.organizationIds.includes(entry.record.organizationId)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
    if (entry.status !== EntryStatus.AGUARDANDO_ASSINATURA && entry.status !== EntryStatus.RASCUNHO) {
      throw new BadRequestException(`Entrada no status ${entry.status} não pode ser assinada`);
    }

    const result = demoSign(user.name ?? user.email);

    await this.prisma.$transaction(async (tx) => {
      await tx.clinicalEntrySignature.upsert({
        where: { entryId },
        create: {
          entryId,
          signerSub: user.sub,
          signerName: user.name ?? user.email,
          signerCouncil: signerCouncil ?? undefined,
          status: result.status,
          signedAt: result.signedAt,
          providerName: result.providerName,
          providerRef: result.providerRef ?? undefined,
        },
        update: {
          signerSub: user.sub,
          signerName: user.name ?? user.email,
          signerCouncil: signerCouncil ?? undefined,
          status: result.status,
          signedAt: result.signedAt,
          providerName: result.providerName,
          providerRef: result.providerRef ?? undefined,
        },
      });

      // RF-PEP-010: entry becomes immutable after signing
      await tx.clinicalEntry.update({
        where: { id: entryId },
        data: { status: EntryStatus.ASSINADO, rowVersion: { increment: 1 } },
      });
    });

    await this.recordsService.writeAudit(entry.recordId, entryId, user, PepAuditAction.ASSINATURA, 'signature', entryId);

    return {
      entryId,
      status: EntryStatus.ASSINADO,
      signatureStatus: result.status,
      providerName: result.providerName,
      signedAt: result.signedAt,
      // RF-PEP-009: clearly indicate this is a demo signature without legal validity
      warning: result.status === SignatureStatus.DEMO
        ? '[DEMONSTRAÇÃO] Esta assinatura é simulada e não possui validade jurídica. Configure um provedor ICP-Brasil para assinatura com validade legal.'
        : undefined,
    };
  }

  async getSignature(entryId: string, user: AuthenticatedUser) {
    const sig = await this.prisma.clinicalEntrySignature.findUnique({
      where: { entryId },
      include: { entry: { select: { record: { select: { organizationId: true } } } } },
    });
    if (!sig) throw new NotFoundException('Assinatura não encontrada');
    if (!user.isWalletzAdmin && !user.organizationIds.includes(sig.entry.record.organizationId)) {
      throw new ForbiddenException('Sem acesso');
    }
    return sig;
  }
}
