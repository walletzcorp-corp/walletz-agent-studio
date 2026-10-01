import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { WebhookStatus, ConnectorStatus, Prisma } from '@prisma/client';

// Webhooks devem ser assinados, idempotentes, repetíveis e observáveis; segredo deve poder ser rotacionado.
// Um erro externo não pode perder ou duplicar transação interna.
// Integrações externas (HubSpot, pagamento, FHIR, RNDS) são apenas adaptadores — status NAO_CONFIGURADO por padrão.
// Portal do paciente deve controlar acesso do paciente e de dependentes, vínculo legal, consentimento e expiração de sessão.

@Injectable()
export class IntService {
  constructor(private prisma: PrismaService) {}

  private assertAccess(organizationId: string, user: AuthenticatedUser): void {
    if (user.isWalletzAdmin) return;
    if (!user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Acesso negado a esta organização.');
    }
  }

  private hashSecret(secret: string): string {
    return createHmac('sha256', 'walletz-webhook-key').update(secret).digest('hex');
  }

  // RF-INT-001: Listar webhook endpoints
  async listWebhooks(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    return this.prisma.webhookEndpoint.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        status: true,
        headers: true,
        createdAt: true,
        updatedAt: true,
        // secretHash omitido intencionalmente
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // RF-INT-002: Criar webhook endpoint com segredo HMAC
  async createWebhook(
    organizationId: string,
    dto: { name: string; url: string; events: string[]; headers?: Record<string, string> },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const secret = randomBytes(32).toString('hex');
    const secretHash = this.hashSecret(secret);

    const endpoint = await this.prisma.webhookEndpoint.create({
      data: {
        organizationId,
        name: dto.name,
        url: dto.url,
        secretHash,
        events: dto.events,
        headers: dto.headers ?? {},
        status: WebhookStatus.ATIVO,
        createdBy: user.sub,
      },
    });

    // Retorna o secret UMA VEZ — não é armazenado em claro
    return { ...endpoint, secret, _notice: 'Guarde este segredo: não será exibido novamente.' };
  }

  // RF-INT-003: Rotacionar segredo do webhook
  async rotateWebhookSecret(
    organizationId: string,
    webhookId: string,
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const endpoint = await this.prisma.webhookEndpoint.findFirst({
      where: { id: webhookId, organizationId },
    });
    if (!endpoint) throw new NotFoundException('Webhook não encontrado.');

    const newSecret = randomBytes(32).toString('hex');
    const secretHash = this.hashSecret(newSecret);

    await this.prisma.webhookEndpoint.update({
      where: { id: webhookId },
      data: { secretHash },
    });

    return { webhookId, secret: newSecret, _notice: 'Novo segredo: não será exibido novamente.' };
  }

  // RF-INT-004: Desativar webhook
  async updateWebhookStatus(
    organizationId: string,
    webhookId: string,
    status: WebhookStatus,
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const endpoint = await this.prisma.webhookEndpoint.findFirst({
      where: { id: webhookId, organizationId },
    });
    if (!endpoint) throw new NotFoundException('Webhook não encontrado.');
    return this.prisma.webhookEndpoint.update({
      where: { id: webhookId },
      data: { status },
    });
  }

  // RF-INT-005: Registrar entrega de evento (idempotente por chave)
  async recordEventDelivery(
    webhookId: string,
    dto: {
      eventType: string;
      idempotencyKey: string;
      payload: Record<string, unknown>;
    },
    organizationId: string,
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);

    const existing = await this.prisma.webhookEventDelivery.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) return existing;

    return this.prisma.webhookEventDelivery.create({
      data: {
        endpointId: webhookId,
        eventType: dto.eventType,
        idempotencyKey: dto.idempotencyKey,
        payload: dto.payload as Prisma.InputJsonValue,
      },
    });
  }

  // RF-INT-006: Listar entregas de eventos
  async listDeliveries(
    organizationId: string,
    webhookId: string,
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const endpoint = await this.prisma.webhookEndpoint.findFirst({
      where: { id: webhookId, organizationId },
    });
    if (!endpoint) throw new NotFoundException('Webhook não encontrado.');

    return this.prisma.webhookEventDelivery.findMany({
      where: { endpointId: webhookId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // RF-INT-007: Listar conectores de integração
  async listConnectors(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    return this.prisma.integrationConnector.findMany({
      where: { organizationId },
      select: {
        id: true,
        connectorType: true,
        name: true,
        status: true,
        scopes: true,
        mappingVersion: true,
        lastSyncAt: true,
        lastSyncStatus: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        // configJson omitido — pode conter tokens
      },
      orderBy: { connectorType: 'asc' },
    });
  }

  // RF-INT-008: Criar/atualizar conector (status padrão NAO_CONFIGURADO)
  async upsertConnector(
    organizationId: string,
    dto: {
      connectorType: string;
      name: string;
      status?: ConnectorStatus;
      scopes?: string[];
      mappingVersion?: string;
      notes?: string;
    },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.integrationConnector.upsert({
      where: { organizationId_connectorType: { organizationId, connectorType: dto.connectorType } },
      create: {
        organizationId,
        connectorType: dto.connectorType,
        name: dto.name,
        status: dto.status ?? ConnectorStatus.NAO_CONFIGURADO,
        scopes: dto.scopes,
        mappingVersion: dto.mappingVersion,
        notes: dto.notes,
        createdBy: user.sub,
      },
      update: {
        name: dto.name,
        status: dto.status,
        scopes: dto.scopes,
        mappingVersion: dto.mappingVersion,
        notes: dto.notes,
      },
    });
  }

  // RF-INT-009: Criar sessão do portal do paciente
  async createPortalSession(
    patientId: string,
    dto: { ttlHours?: number; ipAddress?: string; userAgent?: string },
  ) {
    const token = randomBytes(48).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (dto.ttlHours ?? 4));

    return this.prisma.patientPortalSession.create({
      data: {
        patientId,
        token,
        expiresAt,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
      },
    });
  }

  // RF-INT-010: Validar sessão do portal do paciente
  async validatePortalSession(token: string) {
    const session = await this.prisma.patientPortalSession.findUnique({
      where: { token },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada.');
    if (session.revokedAt) throw new BadRequestException('Sessão revogada.');
    if (session.expiresAt < new Date()) throw new BadRequestException('Sessão expirada.');
    return session;
  }

  // RF-INT-011: Revogar sessão do portal do paciente
  async revokePortalSession(token: string, organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const session = await this.prisma.patientPortalSession.findUnique({
      where: { token },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada.');
    return this.prisma.patientPortalSession.update({
      where: { token },
      data: { revokedAt: new Date() },
    });
  }

  // RF-INT-012: Salvar recurso FHIR (R4)
  async saveFhirResource(
    organizationId: string,
    dto: {
      resourceType: string;
      resourceId: string;
      version?: string;
      payload: Record<string, unknown>;
    },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.fhirResource.create({
      data: {
        organizationId,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        version: dto.version ?? 'R4',
        payload: dto.payload as Prisma.InputJsonValue,
        generatedBy: user.sub,
      },
    });
  }

  // RF-INT-013: Buscar recurso FHIR mais recente
  async getLatestFhirResource(
    organizationId: string,
    resourceType: string,
    resourceId: string,
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const resource = await this.prisma.fhirResource.findFirst({
      where: { organizationId, resourceType, resourceId },
      orderBy: { generatedAt: 'desc' },
    });
    if (!resource) throw new NotFoundException('Recurso FHIR não encontrado.');
    return resource;
  }

  // RF-INT-014: Registrar consentimento de integração
  async grantIntegrationConsent(
    organizationId: string,
    dto: {
      patientId: string;
      connectorType: string;
      scopes: string[];
      expiresAt?: Date;
    },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.integrationConsentGrant.create({
      data: {
        organizationId,
        patientId: dto.patientId,
        connectorType: dto.connectorType,
        scopes: dto.scopes,
        expiresAt: dto.expiresAt,
        grantedBy: user.sub,
      },
    });
  }

  // RF-INT-015: Revogar consentimento de integração
  async revokeIntegrationConsent(
    organizationId: string,
    consentId: string,
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const grant = await this.prisma.integrationConsentGrant.findFirst({
      where: { id: consentId, organizationId },
    });
    if (!grant) throw new NotFoundException('Consentimento não encontrado.');
    if (grant.revokedAt) throw new BadRequestException('Consentimento já revogado.');
    return this.prisma.integrationConsentGrant.update({
      where: { id: consentId },
      data: { revokedAt: new Date() },
    });
  }

  // RF-INT-016: Listar consentimentos de integração do paciente
  async listPatientConsents(
    organizationId: string,
    patientId: string,
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.integrationConsentGrant.findMany({
      where: { organizationId, patientId },
      orderBy: { grantedAt: 'desc' },
    });
  }
}
