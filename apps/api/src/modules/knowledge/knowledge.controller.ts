import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ParseFilePipe,
  MaxFileSizeValidator,
  Res,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiHeader } from '@nestjs/swagger';
import { KnowledgeService } from './knowledge.service';
import { StorageService } from '../../shared/storage/storage.service';
import { UploadSourceDto, CreateUrlSourceDto, CreateTypedSourceDto } from './dto/upload-source.dto';
import { Roles } from '../../shared/rbac/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';
import { CurrentTenant } from '../../shared/rbac/tenant-context';

@ApiTags('knowledge')
@Controller('tenants/:tenantId/knowledge')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-slug', required: true })
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  @Roles('viewer')
  @ApiOperation({ summary: 'Listar fontes de conhecimento do tenant' })
  findAll(@CurrentTenant('tenantId') tenantId: string, @Query('agentId') agentId?: string) {
    return this.knowledgeService.listSources(tenantId, agentId);
  }

  @Get(':sourceId')
  @Roles('viewer')
  @ApiOperation({ summary: 'Detalhes da fonte de conhecimento' })
  findOne(@CurrentTenant('tenantId') tenantId: string, @Param('sourceId') sourceId: string) {
    return this.knowledgeService.getSource(sourceId, tenantId);
  }

  @Post('upload')
  @Roles('manager')
  @ApiOperation({ summary: 'Upload de arquivo (PDF, DOCX, TXT, CSV)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @CurrentTenant('tenantId') tenantId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 })],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadSourceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.knowledgeService.uploadFile(file, dto, tenantId, user.sub);
  }

  @Post('url')
  @Roles('manager')
  @ApiOperation({ summary: 'Indexar URL' })
  createFromUrl(
    @CurrentTenant('tenantId') tenantId: string,
    @Body() dto: CreateUrlSourceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.knowledgeService.createFromUrl(dto, tenantId, user.sub);
  }

  @Post('typed')
  @Roles('manager')
  @ApiOperation({ summary: 'Criar fonte de texto digitado' })
  createTyped(
    @CurrentTenant('tenantId') tenantId: string,
    @Body() dto: CreateTypedSourceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.knowledgeService.createTyped(dto, tenantId, user.sub);
  }

  @Post(':sourceId/retry')
  @Roles('manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reprocessar fonte com falha' })
  retry(@CurrentTenant('tenantId') tenantId: string, @Param('sourceId') sourceId: string) {
    return this.knowledgeService.retryProcessing(sourceId, tenantId);
  }

  @Delete(':sourceId')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover fonte de conhecimento' })
  async remove(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('sourceId') sourceId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.knowledgeService.deleteSource(sourceId, tenantId, user.sub);
  }

  @Get(':sourceId/download')
  @Roles('viewer')
  @ApiOperation({ summary: 'Download do arquivo original da fonte de conhecimento' })
  async download(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('sourceId') sourceId: string,
    @Res() res: Response,
  ) {
    const source = await this.knowledgeService.getSource(sourceId, tenantId);
    if (!source.storageKey) throw new NotFoundException('No file associated with this source');

    const buffer = await this.storageService.readBuffer(source.storageKey);
    if (!buffer) throw new NotFoundException('File not found in storage');

    const filename = encodeURIComponent(source.name);
    res.setHeader('Content-Type', source.mimeType ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    res.setHeader('Content-Length', String(buffer.length));
    res.send(buffer);
  }
}
