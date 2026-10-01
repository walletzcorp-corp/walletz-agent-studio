import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PatientsService } from './patients.service';
import { PatientsConsentsService } from './patients-consents.service';
import { PatientsAlertsService } from './patients-alerts.service';
import { PatientsContactsService } from './patients-contacts.service';
import { PatientsInsuranceService } from './patients-insurance.service';
import { PatientsDocumentsService } from './patients-documents.service';
import { PatientsLinksService } from './patients-links.service';
import { PatientsFormsService } from './patients-forms.service';

@Controller({ path: 'patients', version: '1' })
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(
    private readonly patients: PatientsService,
    private readonly consents: PatientsConsentsService,
    private readonly alerts: PatientsAlertsService,
    private readonly contacts: PatientsContactsService,
    private readonly insurance: PatientsInsuranceService,
    private readonly documents: PatientsDocumentsService,
    private readonly links: PatientsLinksService,
    private readonly forms: PatientsFormsService,
  ) {}

  // ─── Patients ────────────────────────────────────────────────────────────

  @Get()
  findAll(
    @Query('organizationId') organizationId: string,
    @Query('search') search: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('includeInactive') includeInactive: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.patients.findAll({
      organizationId,
      search,
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
      includeInactive: includeInactive === 'true',
    }, user);
  }

  @Post()
  create(@Body() dto: any, @CurrentUser() user: AuthenticatedUser) {
    return this.patients.create(dto, user);
  }

  @Get('duplicity-check')
  checkDuplicity(
    @Query('organizationId') organizationId: string,
    @Query('cpf') cpf: string,
    @Query('cns') cns: string,
    @Query('name') name: string,
    @Query('dataNasc') dataNasc: string,
    @Query('telefone') telefone: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.patients.checkDuplicity({ organizationId, cpf, cns, name, dataNasc, telefone }, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.patients.findOne(id, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: AuthenticatedUser) {
    return this.patients.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deactivate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.patients.deactivate(id, user);
  }

  @Get(':id/timeline')
  getTimeline(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.patients.getTimeline(id, organizationId, user);
  }

  @Post(':id/export')
  exportData(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @Body('purpose') purpose: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.patients.exportData(id, organizationId, purpose, user);
  }

  // ─── Consents ────────────────────────────────────────────────────────────

  @Get(':id/consents')
  findConsents(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consents.findAll(id, organizationId, user);
  }

  @Post(':id/consents')
  createConsent(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @Body() dto: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consents.create(id, organizationId, dto, user);
  }

  @Patch(':id/consents/:consentId/revoke')
  revokeConsent(
    @Param('consentId') consentId: string,
    @Query('organizationId') organizationId: string,
    @Body() dto: { reason: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consents.revoke(consentId, organizationId, dto, user);
  }

  @Get(':id/consents/marketing-block')
  checkMarketingBlock(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consents.checkMarketingBlock(id, organizationId, user);
  }

  // ─── Alerts ──────────────────────────────────────────────────────────────

  @Get(':id/alerts')
  findAlerts(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @Query('onlyActive') onlyActive: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.alerts.findAll(id, organizationId, onlyActive !== 'false', user);
  }

  @Post(':id/alerts')
  createAlert(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @Body() dto: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.alerts.create(id, organizationId, dto, user);
  }

  @Patch(':id/alerts/:alertId/resolve')
  resolveAlert(
    @Param('alertId') alertId: string,
    @Query('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.alerts.resolve(alertId, organizationId, user);
  }

  // ─── Contacts ────────────────────────────────────────────────────────────

  @Get(':id/contacts')
  findContacts(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contacts.findAll(id, organizationId, user);
  }

  @Post(':id/contacts')
  createContact(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @Body() dto: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contacts.create(id, organizationId, dto, user);
  }

  @Patch(':id/contacts/:contactId')
  updateContact(
    @Param('contactId') contactId: string,
    @Query('organizationId') organizationId: string,
    @Body() dto: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contacts.update(contactId, organizationId, dto, user);
  }

  @Delete(':id/contacts/:contactId')
  removeContact(
    @Param('contactId') contactId: string,
    @Query('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contacts.remove(contactId, organizationId, user);
  }

  // ─── Insurance ───────────────────────────────────────────────────────────

  @Get(':id/insurance')
  findInsurance(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.insurance.findAll(id, organizationId, user);
  }

  @Post(':id/insurance')
  createInsurance(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @Body() dto: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.insurance.create(id, organizationId, dto, user);
  }

  @Patch(':id/insurance/:insuranceId')
  updateInsurance(
    @Param('insuranceId') insuranceId: string,
    @Query('organizationId') organizationId: string,
    @Body() dto: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.insurance.update(insuranceId, organizationId, dto, user);
  }

  // ─── Documents ───────────────────────────────────────────────────────────

  @Get(':id/documents')
  findDocuments(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.findAll(id, organizationId, user);
  }

  @Post(':id/documents')
  uploadDocument(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @Body() dto: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.upload(id, organizationId, dto, user);
  }

  @Get(':id/documents/:docId/download')
  getDocDownload(
    @Param('docId') docId: string,
    @Query('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.getDownloadInfo(docId, organizationId, user);
  }

  // ─── Links ───────────────────────────────────────────────────────────────

  @Get(':id/links')
  findLinks(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.links.findForPatient(id, organizationId, user);
  }

  @Post('links')
  createLink(
    @Query('organizationId') organizationId: string,
    @Body() dto: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.links.create(organizationId, dto, user);
  }

  @Delete('links/:linkId')
  deactivateLink(
    @Param('linkId') linkId: string,
    @Query('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.links.deactivate(linkId, organizationId, user);
  }

  // ─── Forms ───────────────────────────────────────────────────────────────

  @Get('forms')
  listForms(
    @Query('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.forms.listForms(organizationId, user);
  }

  @Post('forms')
  createForm(
    @Query('organizationId') organizationId: string,
    @Body() dto: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.forms.createForm(organizationId, dto, user);
  }

  @Get(':id/forms')
  listFormResponses(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.forms.listResponses(id, organizationId, user);
  }

  @Post(':id/forms')
  submitForm(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @Body() dto: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.forms.submitResponse(id, organizationId, dto, user);
  }
}
