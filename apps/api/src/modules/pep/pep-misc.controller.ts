import { Controller, Get, Post, Patch, Param, Body, Query, ParseUUIDPipe, UseGuards, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'fs';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CidService } from './services/cid.service';
import { PepTemplatesService } from './services/pep-templates.service';
import { AttachmentsService } from './services/attachments.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Controller({ path: 'cid', version: '1' })
@UseGuards(JwtAuthGuard)
export class CidController {
  constructor(private readonly cidService: CidService) {}

  @Get()
  search(@Query('q') q: string, @Query('version') version?: string, @Query('limit') limit?: string) {
    return this.cidService.search(q, version ?? '10', limit ? +limit : 20);
  }

  @Get(':code')
  getByCode(@Param('code') code: string, @Query('version') version?: string) {
    return this.cidService.getByCode(code, version ?? '10');
  }
}

@Controller({ path: 'pep-templates', version: '1' })
@UseGuards(JwtAuthGuard)
export class PepTemplatesController {
  constructor(private readonly service: PepTemplatesService) {}

  @Post()
  create(@Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(body, user);
  }

  @Get()
  findAll(@Query('organizationId') orgId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(orgId, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.update(id, body, user);
  }
}

@Controller({ path: 'attachments', version: '1' })
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  // RF-PEP-007: download attachment — protected by same access rules as the record
  @Get(':id/download')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { fullPath, attachment } = await this.service.download(id, user);
    res.set({
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
    });
    return new StreamableFile(fs.createReadStream(fullPath));
  }
}
