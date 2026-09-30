import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { MedicalRecordsService } from './medical-records.service';
import { EntryStatus, PepAuditAction } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_BASE = path.join(process.cwd(), 'uploads', 'pep');

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
  'application/dicom',
  'text/plain',
]);

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recordsService: MedicalRecordsService,
  ) {}

  private async assertEntryAccess(entryId: string, user: AuthenticatedUser) {
    const entry = await this.prisma.clinicalEntry.findUnique({
      where: { id: entryId },
      select: { id: true, recordId: true, status: true, record: { select: { organizationId: true } } },
    });
    if (!entry) throw new NotFoundException('Entrada clínica não encontrada');
    if (!user.isWalletzAdmin && !user.organizationIds.includes(entry.record.organizationId)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
    return entry;
  }

  // RF-PEP-007: upload attachment
  async upload(
    entryId: string,
    file: Express.Multer.File,
    description: string | undefined,
    user: AuthenticatedUser,
  ) {
    const entry = await this.assertEntryAccess(entryId, user);

    if (entry.status === EntryStatus.ASSINADO) {
      throw new ForbiddenException('Não é possível adicionar anexos a uma entrada assinada');
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`Tipo de arquivo não permitido: ${file.mimetype}`);
    }

    const storageDir = path.join(UPLOAD_BASE, entry.record.organizationId, entryId);
    fs.mkdirSync(storageDir, { recursive: true });

    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const storageKey = path.join(entry.record.organizationId, entryId, uniqueName);
    const fullPath = path.join(UPLOAD_BASE, storageKey);

    fs.writeFileSync(fullPath, file.buffer);

    const attachment = await this.prisma.clinicalAttachment.create({
      data: {
        entryId,
        organizationId: entry.record.organizationId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey,
        description,
        uploadedBy: user.sub,
      },
    });

    await this.recordsService.writeAudit(entry.recordId, entryId, user, PepAuditAction.INCLUSAO, 'attachment', attachment.id);
    return attachment;
  }

  // RF-PEP-007: download attachment
  async download(attachmentId: string, user: AuthenticatedUser) {
    const attachment = await this.prisma.clinicalAttachment.findUnique({
      where: { id: attachmentId },
      include: { entry: { select: { recordId: true, record: { select: { organizationId: true } } } } },
    });
    if (!attachment) throw new NotFoundException('Anexo não encontrado');
    if (!user.isWalletzAdmin && !user.organizationIds.includes(attachment.entry.record.organizationId)) {
      throw new ForbiddenException('Sem acesso a este anexo');
    }

    const fullPath = path.join(UPLOAD_BASE, attachment.storageKey);
    if (!fs.existsSync(fullPath)) throw new NotFoundException('Arquivo não encontrado no armazenamento');

    await this.recordsService.writeAudit(
      attachment.entry.recordId,
      attachment.entryId,
      user,
      PepAuditAction.LEITURA,
      'attachment',
      attachmentId,
    );

    return { fullPath, attachment };
  }

  async listByEntry(entryId: string, user: AuthenticatedUser) {
    await this.assertEntryAccess(entryId, user);
    return this.prisma.clinicalAttachment.findMany({
      where: { entryId },
      select: { id: true, fileName: true, mimeType: true, sizeBytes: true, description: true, createdAt: true, uploadedBy: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}
