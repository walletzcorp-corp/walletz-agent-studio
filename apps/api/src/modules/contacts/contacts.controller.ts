import {
  Controller,
  BadRequestException,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Roles } from '../../shared/rbac/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ContactsService, type ImportContactDto } from './contacts.service';
import { ImportContactsBodyDto, MAX_IMPORT_ROWS } from './dto/import-contacts.dto';
import { parsePaging } from '../../shared/http/paging';

const MAX_CSV_BYTES = 5 * 1024 * 1024;
import { parse as parseCsvSync } from 'csv-parse/sync';
import { CurrentTenant } from '../../shared/rbac/tenant-context';

@ApiTags('contacts')
@ApiBearerAuth()
@Controller('tenants/:tenantId/contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @Roles('viewer')
  @ApiOperation({ summary: 'List contacts' })
  list(
    @CurrentTenant('tenantId') tenantId: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.contactsService.listContacts(tenantId, {
      search: search?.slice(0, 100),
      ...parsePaging(limit, offset),
    });
  }

  @Get(':contactId')
  @Roles('viewer')
  @ApiOperation({ summary: 'Get contact' })
  get(@CurrentTenant('tenantId') tenantId: string, @Param('contactId') contactId: string) {
    return this.contactsService.getContact(tenantId, contactId);
  }

  @Post('import/json')
  @Roles('manager')
  @ApiOperation({ summary: 'Import contacts from JSON array' })
  importJson(
    @CurrentTenant('tenantId') tenantId: string,
    @Body() body: ImportContactsBodyDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.contactsService.importContacts(body.contacts, tenantId, userId);
  }

  @Post('import/csv')
  @Roles('manager')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiOperation({ summary: 'Import contacts from CSV/XLSX' })
  async importCsv(
    @CurrentTenant('tenantId') tenantId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    if (file.size > MAX_CSV_BYTES)
      throw new BadRequestException('CSV file is too large (max 5 MB)');

    let rows: Array<Record<string, string>>;
    try {
      rows = parseCsvSync(file.buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Array<Record<string, string>>;
    } catch {
      throw new BadRequestException('Invalid CSV file');
    }
    if (rows.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(`Too many rows (max ${MAX_IMPORT_ROWS})`);
    }

    const mapped: ImportContactDto[] = rows.map((r) => ({
      firstName: r['nome'] ?? r['first_name'] ?? r['nome_completo']?.split(' ')[0],
      lastName:
        r['sobrenome'] ?? r['last_name'] ?? r['nome_completo']?.split(' ').slice(1).join(' '),
      company: r['empresa'] ?? r['company'],
      phone: r['telefone'] ?? r['phone'] ?? r['celular'] ?? r['whatsapp'],
      email: r['email'],
      origin: r['origem'] ?? r['origin'] ?? 'csv_import',
      segment: r['segmento'] ?? r['segment'],
      tags: r['tags'] ? (r['tags'] as string).split(',').map((t) => t.trim()) : [],
      observation: r['observacao'] ?? r['observation'],
      hasWhatsappConsent: ['sim', 'yes', 'true', '1'].includes(
        (r['consentimento_whatsapp'] ?? '').toLowerCase(),
      ),
      consentDate: r['data_consentimento'],
      consentOrigin: r['origem_consentimento'] ?? r['consent_origin'],
      customFields: Object.fromEntries(
        Object.entries(r).filter(
          ([k]) =>
            ![
              'nome',
              'sobrenome',
              'empresa',
              'telefone',
              'celular',
              'whatsapp',
              'email',
              'origem',
              'segmento',
              'tags',
              'observacao',
              'consentimento_whatsapp',
              'data_consentimento',
              'origem_consentimento',
              'first_name',
              'last_name',
              'company',
              'phone',
              'origin',
              'segment',
              'observation',
              'nome_completo',
            ].includes(k),
        ),
      ),
    }));

    return this.contactsService.importContacts(mapped, tenantId, userId);
  }

  @Delete(':contactId')
  @Roles('admin')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete contact' })
  delete(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('contactId') contactId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.contactsService.deleteContact(tenantId, contactId, userId);
  }
}
