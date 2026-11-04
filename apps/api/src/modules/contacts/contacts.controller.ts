import {
  Controller, Get, Post, Delete, Param, Body, Query,
  UseGuards, HttpCode, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../shared/rbac/rbac.guard';
import { Roles } from '../../shared/rbac/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ContactsService, type ImportContactDto } from './contacts.service';
import { parse as parseCsvSync } from 'csv-parse/sync';

@ApiTags('contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('tenants/:tenantId/contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @Roles('viewer')
  @ApiOperation({ summary: 'List contacts' })
  list(
    @Param('tenantId') tenantId: string,
    @Query('search') search?: string,
    @Query('limit') limit = '50',
    @Query('offset') offset = '0',
  ) {
    return this.contactsService.listContacts(tenantId, {
      search,
      limit: +limit,
      offset: +offset,
    });
  }

  @Get(':contactId')
  @Roles('viewer')
  @ApiOperation({ summary: 'Get contact' })
  get(
    @Param('tenantId') tenantId: string,
    @Param('contactId') contactId: string,
  ) {
    return this.contactsService.getContact(tenantId, contactId);
  }

  @Post('import/json')
  @Roles('manager')
  @ApiOperation({ summary: 'Import contacts from JSON array' })
  importJson(
    @Param('tenantId') tenantId: string,
    @Body() body: { contacts: ImportContactDto[] },
    @CurrentUser('userId') userId: string,
  ) {
    return this.contactsService.importContacts(body.contacts, tenantId, userId);
  }

  @Post('import/csv')
  @Roles('manager')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Import contacts from CSV/XLSX' })
  async importCsv(
    @Param('tenantId') tenantId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    if (!file) throw new Error('File is required');

    const rows = parseCsvSync(file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Array<Record<string, string>>;

    const mapped: ImportContactDto[] = rows.map((r) => ({
      firstName: r['nome'] ?? r['first_name'] ?? r['nome_completo']?.split(' ')[0],
      lastName: r['sobrenome'] ?? r['last_name'] ?? r['nome_completo']?.split(' ').slice(1).join(' '),
      company: r['empresa'] ?? r['company'],
      phone: r['telefone'] ?? r['phone'] ?? r['celular'] ?? r['whatsapp'],
      email: r['email'],
      origin: r['origem'] ?? r['origin'] ?? 'csv_import',
      segment: r['segmento'] ?? r['segment'],
      tags: r['tags'] ? (r['tags'] as string).split(',').map((t) => t.trim()) : [],
      observation: r['observacao'] ?? r['observation'],
      hasWhatsappConsent: ['sim', 'yes', 'true', '1'].includes((r['consentimento_whatsapp'] ?? '').toLowerCase()),
      consentDate: r['data_consentimento'],
      consentOrigin: r['origem_consentimento'] ?? r['consent_origin'],
      customFields: Object.fromEntries(
        Object.entries(r).filter(([k]) =>
          !['nome', 'sobrenome', 'empresa', 'telefone', 'celular', 'whatsapp', 'email',
            'origem', 'segmento', 'tags', 'observacao', 'consentimento_whatsapp',
            'data_consentimento', 'origem_consentimento', 'first_name', 'last_name',
            'company', 'phone', 'origin', 'segment', 'observation',
            'nome_completo'].includes(k)
        )
      ),
    }));

    return this.contactsService.importContacts(mapped, tenantId, userId);
  }

  @Delete(':contactId')
  @Roles('admin')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete contact' })
  delete(
    @Param('tenantId') tenantId: string,
    @Param('contactId') contactId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.contactsService.deleteContact(tenantId, contactId, userId);
  }
}
