import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { IntService } from './services/int.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WebhookStatus } from '@prisma/client';

@Controller({ path: 'int', version: '1' })
@UseGuards(JwtAuthGuard)
export class IntController {
  constructor(private readonly intService: IntService) {}

  @Get(':organizationId/webhooks')
  listWebhooks(@Param('organizationId') org: string, @Request() req: any) {
    return this.intService.listWebhooks(org, req.user);
  }

  @Post(':organizationId/webhooks')
  createWebhook(
    @Param('organizationId') org: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.intService.createWebhook(org, dto, req.user);
  }

  @Post(':organizationId/webhooks/:webhookId/rotacionar-segredo')
  rotateSecret(
    @Param('organizationId') org: string,
    @Param('webhookId') webhookId: string,
    @Request() req: any,
  ) {
    return this.intService.rotateWebhookSecret(org, webhookId, req.user);
  }

  @Patch(':organizationId/webhooks/:webhookId/status')
  updateWebhookStatus(
    @Param('organizationId') org: string,
    @Param('webhookId') webhookId: string,
    @Body() dto: { status: WebhookStatus },
    @Request() req: any,
  ) {
    return this.intService.updateWebhookStatus(org, webhookId, dto.status, req.user);
  }

  @Post(':organizationId/webhooks/:webhookId/entregas')
  recordDelivery(
    @Param('organizationId') org: string,
    @Param('webhookId') webhookId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.intService.recordEventDelivery(webhookId, dto, org, req.user);
  }

  @Get(':organizationId/webhooks/:webhookId/entregas')
  listDeliveries(
    @Param('organizationId') org: string,
    @Param('webhookId') webhookId: string,
    @Request() req: any,
  ) {
    return this.intService.listDeliveries(org, webhookId, req.user);
  }

  @Get(':organizationId/conectores')
  listConnectors(@Param('organizationId') org: string, @Request() req: any) {
    return this.intService.listConnectors(org, req.user);
  }

  @Post(':organizationId/conectores')
  upsertConnector(
    @Param('organizationId') org: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.intService.upsertConnector(org, dto, req.user);
  }

  @Post(':organizationId/portal/sessoes')
  createPortalSession(
    @Param('organizationId') _org: string,
    @Body() dto: { patientId: string; ttlHours?: number },
    @Request() req: any,
  ) {
    return this.intService.createPortalSession(dto.patientId, {
      ttlHours: dto.ttlHours,
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Post(':organizationId/portal/sessoes/validar')
  validatePortalSession(@Body() dto: { token: string }) {
    return this.intService.validatePortalSession(dto.token);
  }

  @Post(':organizationId/portal/sessoes/revogar')
  revokePortalSession(
    @Param('organizationId') org: string,
    @Body() dto: { token: string },
    @Request() req: any,
  ) {
    return this.intService.revokePortalSession(dto.token, org, req.user);
  }

  @Post(':organizationId/fhir')
  saveFhirResource(
    @Param('organizationId') org: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.intService.saveFhirResource(org, dto, req.user);
  }

  @Get(':organizationId/fhir/:resourceType/:resourceId')
  getLatestFhirResource(
    @Param('organizationId') org: string,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Request() req: any,
  ) {
    return this.intService.getLatestFhirResource(org, resourceType, resourceId, req.user);
  }

  @Post(':organizationId/consentimentos')
  grantConsent(
    @Param('organizationId') org: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.intService.grantIntegrationConsent(org, dto, req.user);
  }

  @Patch(':organizationId/consentimentos/:consentId/revogar')
  revokeConsent(
    @Param('organizationId') org: string,
    @Param('consentId') consentId: string,
    @Request() req: any,
  ) {
    return this.intService.revokeIntegrationConsent(org, consentId, req.user);
  }

  @Get(':organizationId/pacientes/:patientId/consentimentos')
  listPatientConsents(
    @Param('organizationId') org: string,
    @Param('patientId') patientId: string,
    @Request() req: any,
  ) {
    return this.intService.listPatientConsents(org, patientId, req.user);
  }
}
