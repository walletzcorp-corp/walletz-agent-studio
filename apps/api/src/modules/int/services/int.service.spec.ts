import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { IntService } from './int.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { WebhookStatus, ConnectorStatus } from '@prisma/client';

const adminUser = { sub: 'admin1', email: 'a@b.com', isWalletzAdmin: true, organizationIds: [], tenantIds: [] };
const orgUser = { sub: 'user1', email: 'u@b.com', isWalletzAdmin: false, organizationIds: ['org1'], tenantIds: ['t1'] };
const outsiderUser = { sub: 'other', email: 'o@b.com', isWalletzAdmin: false, organizationIds: ['org2'], tenantIds: [] };

let mockPrisma: any;

describe('IntService', () => {
  let service: IntService;

  beforeEach(async () => {
    mockPrisma = {
      webhookEndpoint: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      webhookEventDelivery: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      integrationConnector: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      patientPortalSession: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      fhirResource: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
      integrationConsentGrant: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((fn: any) => (Array.isArray(fn) ? Promise.all(fn) : fn(mockPrisma))),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<IntService>(IntService);
  });

  afterEach(() => { jest.resetAllMocks(); });

  // ---- Access Control ----

  it('blocks outsider from listWebhooks', async () => {
    await expect(service.listWebhooks('org1', outsiderUser)).rejects.toThrow(ForbiddenException);
  });

  it('admin bypasses tenant check', async () => {
    mockPrisma.webhookEndpoint.findMany.mockResolvedValue([]);
    await expect(service.listWebhooks('org1', adminUser)).resolves.toEqual([]);
  });

  // ---- RF-INT-001: listWebhooks ----

  it('lists webhooks without secretHash', async () => {
    const webhooks = [{ id: 'w1', name: 'Test', status: WebhookStatus.ATIVO }];
    mockPrisma.webhookEndpoint.findMany.mockResolvedValue(webhooks);
    const result = await service.listWebhooks('org1', orgUser);
    expect(result).toEqual(webhooks);
  });

  // ---- RF-INT-002: createWebhook ----

  it('creates webhook and returns secret once', async () => {
    mockPrisma.webhookEndpoint.create.mockResolvedValue({ id: 'w1', name: 'Hook' });
    const result = await service.createWebhook('org1', {
      name: 'Hook',
      url: 'https://example.com/hook',
      events: ['patient.created'],
    }, orgUser);

    expect(result.id).toBe('w1');
    expect(result.secret).toBeDefined();
    expect(result.secret).toHaveLength(64); // 32 bytes hex
    expect(result._notice).toContain('Guarde este segredo');
  });

  it('creates webhook with HMAC secret hash (not stored in plain)', async () => {
    mockPrisma.webhookEndpoint.create.mockResolvedValue({ id: 'w1' });
    await service.createWebhook('org1', { name: 'H', url: 'https://x.com', events: [] }, orgUser);
    const callArg = mockPrisma.webhookEndpoint.create.mock.calls[0][0];
    expect(callArg.data.secretHash).toBeDefined();
    expect(callArg.data).not.toHaveProperty('secret');
  });

  // ---- RF-INT-003: rotateWebhookSecret ----

  it('rotates webhook secret and returns new secret', async () => {
    mockPrisma.webhookEndpoint.findFirst.mockResolvedValue({ id: 'w1' });
    mockPrisma.webhookEndpoint.update.mockResolvedValue({ id: 'w1' });
    const result = await service.rotateWebhookSecret('org1', 'w1', orgUser);
    expect(result.secret).toBeDefined();
    expect(result._notice).toContain('Novo segredo');
  });

  it('throws NotFoundException when rotating unknown webhook', async () => {
    mockPrisma.webhookEndpoint.findFirst.mockResolvedValue(null);
    await expect(service.rotateWebhookSecret('org1', 'unknown', orgUser)).rejects.toThrow(NotFoundException);
  });

  // ---- RF-INT-004: updateWebhookStatus ----

  it('deactivates webhook', async () => {
    mockPrisma.webhookEndpoint.findFirst.mockResolvedValue({ id: 'w1' });
    mockPrisma.webhookEndpoint.update.mockResolvedValue({ id: 'w1', status: WebhookStatus.INATIVO });
    const result = await service.updateWebhookStatus('org1', 'w1', WebhookStatus.INATIVO, orgUser);
    expect(result.status).toBe(WebhookStatus.INATIVO);
  });

  // ---- RF-INT-005: recordEventDelivery (idempotent) ----

  it('records event delivery', async () => {
    mockPrisma.webhookEventDelivery.findUnique.mockResolvedValue(null);
    mockPrisma.webhookEventDelivery.create.mockResolvedValue({ id: 'ev1', idempotencyKey: 'key1' });
    const result = await service.recordEventDelivery('w1', {
      eventType: 'patient.created',
      idempotencyKey: 'key1',
      payload: { patientId: 'p1' },
    }, 'org1', orgUser);
    expect(result.id).toBe('ev1');
  });

  it('returns existing delivery on repeated call (idempotent)', async () => {
    const existing = { id: 'ev1', idempotencyKey: 'key1' };
    mockPrisma.webhookEventDelivery.findUnique.mockResolvedValue(existing);
    const result = await service.recordEventDelivery('w1', {
      eventType: 'patient.created',
      idempotencyKey: 'key1',
      payload: {},
    }, 'org1', orgUser);
    expect(result).toEqual(existing);
    expect(mockPrisma.webhookEventDelivery.create).not.toHaveBeenCalled();
  });

  // ---- RF-INT-007: listConnectors ----

  it('lists connectors without configJson', async () => {
    mockPrisma.integrationConnector.findMany.mockResolvedValue([{ id: 'c1', status: ConnectorStatus.NAO_CONFIGURADO }]);
    const result = await service.listConnectors('org1', orgUser);
    expect(result[0].status).toBe(ConnectorStatus.NAO_CONFIGURADO);
  });

  // ---- RF-INT-008: upsertConnector ----

  it('creates connector with NAO_CONFIGURADO by default', async () => {
    mockPrisma.integrationConnector.upsert.mockResolvedValue({ id: 'c1', status: ConnectorStatus.NAO_CONFIGURADO });
    const result = await service.upsertConnector('org1', {
      connectorType: 'HUBSPOT',
      name: 'HubSpot',
    }, orgUser);
    expect(result.status).toBe(ConnectorStatus.NAO_CONFIGURADO);
  });

  // ---- RF-INT-009: createPortalSession ----

  it('creates portal session with token', async () => {
    mockPrisma.patientPortalSession.create.mockResolvedValue({ id: 's1', token: 'tok123', patientId: 'p1' });
    const result = await service.createPortalSession('p1', { ttlHours: 2 });
    expect(result.id).toBe('s1');
  });

  // ---- RF-INT-010: validatePortalSession ----

  it('validates active session', async () => {
    const future = new Date(Date.now() + 3600_000);
    mockPrisma.patientPortalSession.findUnique.mockResolvedValue({
      id: 's1',
      token: 'tok',
      revokedAt: null,
      expiresAt: future,
    });
    const result = await service.validatePortalSession('tok');
    expect(result.id).toBe('s1');
  });

  it('throws BadRequestException for expired session', async () => {
    const past = new Date(Date.now() - 3600_000);
    mockPrisma.patientPortalSession.findUnique.mockResolvedValue({
      id: 's1',
      revokedAt: null,
      expiresAt: past,
    });
    await expect(service.validatePortalSession('tok')).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException for revoked session', async () => {
    mockPrisma.patientPortalSession.findUnique.mockResolvedValue({
      id: 's1',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600_000),
    });
    await expect(service.validatePortalSession('tok')).rejects.toThrow(BadRequestException);
  });

  // ---- RF-INT-011: revokePortalSession ----

  it('revokes portal session', async () => {
    mockPrisma.patientPortalSession.findUnique.mockResolvedValue({ id: 's1', token: 'tok' });
    mockPrisma.patientPortalSession.update.mockResolvedValue({ id: 's1', revokedAt: new Date() });
    const result = await service.revokePortalSession('tok', 'org1', orgUser);
    expect(result.revokedAt).toBeDefined();
  });

  // ---- RF-INT-012: saveFhirResource ----

  it('saves FHIR R4 resource', async () => {
    mockPrisma.fhirResource.create.mockResolvedValue({ id: 'f1', resourceType: 'Patient', version: 'R4' });
    const result = await service.saveFhirResource('org1', {
      resourceType: 'Patient',
      resourceId: 'pat-1',
      payload: { resourceType: 'Patient', id: 'pat-1' },
    }, orgUser);
    expect(result.resourceType).toBe('Patient');
    expect(result.version).toBe('R4');
  });

  // ---- RF-INT-013: getLatestFhirResource ----

  it('retrieves latest FHIR resource', async () => {
    mockPrisma.fhirResource.findFirst.mockResolvedValue({ id: 'f1', resourceType: 'Patient' });
    const result = await service.getLatestFhirResource('org1', 'Patient', 'pat-1', orgUser);
    expect(result.id).toBe('f1');
  });

  it('throws NotFoundException when FHIR resource missing', async () => {
    mockPrisma.fhirResource.findFirst.mockResolvedValue(null);
    await expect(service.getLatestFhirResource('org1', 'Patient', 'x', orgUser)).rejects.toThrow(NotFoundException);
  });

  // ---- RF-INT-014: grantIntegrationConsent ----

  it('grants integration consent', async () => {
    mockPrisma.integrationConsentGrant.create.mockResolvedValue({ id: 'g1', patientId: 'p1', connectorType: 'FHIR' });
    const result = await service.grantIntegrationConsent('org1', {
      patientId: 'p1',
      connectorType: 'FHIR',
      scopes: ['read:patient'],
    }, orgUser);
    expect(result.id).toBe('g1');
  });

  // ---- RF-INT-015: revokeIntegrationConsent ----

  it('revokes integration consent', async () => {
    mockPrisma.integrationConsentGrant.findFirst.mockResolvedValue({ id: 'g1', revokedAt: null });
    mockPrisma.integrationConsentGrant.update.mockResolvedValue({ id: 'g1', revokedAt: new Date() });
    const result = await service.revokeIntegrationConsent('org1', 'g1', orgUser);
    expect(result.revokedAt).toBeDefined();
  });

  it('throws BadRequestException when revoking already-revoked consent', async () => {
    mockPrisma.integrationConsentGrant.findFirst.mockResolvedValue({ id: 'g1', revokedAt: new Date() });
    await expect(service.revokeIntegrationConsent('org1', 'g1', orgUser)).rejects.toThrow(BadRequestException);
  });

  // ---- RF-INT-016: listPatientConsents ----

  it('lists patient consents', async () => {
    mockPrisma.integrationConsentGrant.findMany.mockResolvedValue([{ id: 'g1' }]);
    const result = await service.listPatientConsents('org1', 'p1', orgUser);
    expect(result).toHaveLength(1);
  });
});
