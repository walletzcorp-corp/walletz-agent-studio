import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ClinicalEntriesService } from './services/clinical-entries.service';
import { SignatureService } from './services/signature.service';
import { AttachmentsService } from './services/attachments.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Controller({ path: 'clinical-entries', version: '1' })
@UseGuards(JwtAuthGuard)
export class ClinicalEntriesController {
  constructor(
    private readonly entriesService: ClinicalEntriesService,
    private readonly signatureService: SignatureService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  // RF-PEP-003: create SOAP entry
  @Post()
  create(@Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.entriesService.create(body, user);
  }

  @Get()
  findByRecord(@Query('recordId') recordId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.entriesService.findByRecord(recordId, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.entriesService.findOne(id, user);
  }

  // RF-PEP-003: update SOAP fields (only on RASCUNHO)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.entriesService.update(id, body, user);
  }

  // RF-PEP-004: upsert vital signs
  @Post(':id/vitals')
  @HttpCode(HttpStatus.OK)
  upsertVitals(@Param('id', ParseUUIDPipe) id: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.entriesService.upsertVitalSigns(id, body, user);
  }

  // RF-PEP-010/011: addendum (immutable correction)
  @Post(':id/addenda')
  createAddendum(@Param('id', ParseUUIDPipe) id: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.entriesService.createAddendum(id, body, user);
  }

  // Request signature — transitions to AGUARDANDO_ASSINATURA
  @Post(':id/request-signature')
  @HttpCode(HttpStatus.OK)
  requestSignature(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.entriesService.requestSignature(id, user);
  }

  // RF-PEP-009: sign entry
  @Post(':id/sign')
  @HttpCode(HttpStatus.OK)
  sign(@Param('id', ParseUUIDPipe) id: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.signatureService.sign(id, body.signerCouncil, user);
  }

  // RF-PEP-012: log print action
  @Post(':id/log-print')
  @HttpCode(HttpStatus.OK)
  logPrint(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.entriesService.logPrint(id, user);
  }

  // RF-PEP-007: upload attachment
  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }))
  uploadAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('description') description: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attachmentsService.upload(id, file, description, user);
  }

  @Get(':id/attachments')
  listAttachments(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attachmentsService.listByEntry(id, user);
  }
}
