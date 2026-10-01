import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { randomUUID } from 'crypto';
import { PatientsService } from './patients.service';

const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/dicom',
];

@Injectable()
export class PatientsDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientsService: PatientsService,
  ) {}

  private assertOrgAccess(organizationId: string, user: AuthenticatedUser) {
    if (!user.isWalletzAdmin && !user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
  }

  async upload(patientId: string, organizationId: string, dto: any, user: AuthenticatedUser) {
    this.assertOrgAccess(organizationId, user);
    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, organizationId } });
    if (!patient) throw new NotFoundException('Paciente não encontrado');

    if (!ALLOWED_MIME.includes(dto.mimeType)) {
      throw new BadRequestException(`Tipo de arquivo não permitido: ${dto.mimeType}`);
    }

    const storageKey = `org/${organizationId}/patients/${patientId}/docs/${randomUUID()}`;

    const doc = await this.prisma.patientDocument.create({
      data: {
        id: randomUUID(),
        patientId,
        organizationId,
        type: dto.type,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        storageKey,
        description: dto.description,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        uploadedBy: user.sub,
      },
    });

    await this.patientsService.writeAudit(patientId, organizationId, user, 'DOC_UPLOAD', 'document', doc.id);
    return doc;
  }

  async findAll(patientId: string, organizationId: string, user: AuthenticatedUser) {
    this.assertOrgAccess(organizationId, user);
    return this.prisma.patientDocument.findMany({
      where: { patientId, organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDownloadInfo(docId: string, organizationId: string, user: AuthenticatedUser) {
    const doc = await this.prisma.patientDocument.findFirst({ where: { id: docId, organizationId } });
    if (!doc) throw new NotFoundException('Documento não encontrado');
    this.assertOrgAccess(organizationId, user);

    await this.patientsService.writeAudit(doc.patientId, organizationId, user, 'DOC_VIEW', 'document', docId);
    // In production, generate a signed URL from storage provider
    return { ...doc, downloadUrl: `/api/v1/files/${doc.storageKey}` };
  }
}
