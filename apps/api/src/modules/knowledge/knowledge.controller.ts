import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiHeader } from '@nestjs/swagger';
import type { Response } from 'express';
import { KnowledgeService, knowledgeMaxFileBytes } from './knowledge.service';
import { UploadSourceDto, CreateUrlSourceDto, CreateTypedSourceDto, SetSourceAgentDto } from './dto/upload-source.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../shared/rbac/rbac.guard';
import { Roles } from '../../shared/rbac/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';
import { KNOWLEDGE_FORMATS } from './parsers/file-type';

@ApiTags('knowledge')
@Controller('tenants/:tenantId/knowledge')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-slug', required: true })
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get('formats')
  @Roles('viewer')
  @ApiOperation({ summary: 'Formatos aceitos e limite técnico por arquivo' })
  formats() {
    return {
      formats: Object.entries(KNOWLEDGE_FORMATS).map(([extension, f]) => ({ extension, label: f.label })),
      maxFileBytes: knowledgeMaxFileBytes(),
    };
  }

  @Get()
  @Roles('viewer')
  @ApiOperation({ summary: 'Listar documentos da base de conhecimento' })
  findAll(@Param('tenantId') tenantId: string, @Query('agentId') agentId?: string) {
    return this.knowledgeService.listSources(tenantId, agentId);
  }

  @Get(':sourceId')
  @Roles('viewer')
  @ApiOperation({ summary: 'Detalhes do documento: metadados, trechos, indexação e prévia do texto' })
  findOne(@Param('tenantId') tenantId: string, @Param('sourceId') sourceId: string) {
    return this.knowledgeService.getDetails(sourceId, tenantId);
  }

  @Get(':sourceId/download')
  @Roles('viewer')
  @ApiOperation({ summary: 'Baixar o arquivo original' })
  async download(@Param('tenantId') tenantId: string, @Param('sourceId') sourceId: string, @Res() res: Response) {
    const file = await this.knowledgeService.download(sourceId, tenantId);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`);
    res.setHeader('Content-Length', String(file.buffer.length));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(file.buffer);
  }

  @Post('upload')
  @Roles('manager')
  @ApiOperation({ summary: 'Enviar arquivo (PDF, DOCX, TXT, MD, CSV, HTML)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      // Limite técnico (KNOWLEDGE_MAX_FILE_SIZE_MB): o multer interrompe antes de ler tudo.
      limits: { fileSize: knowledgeMaxFileBytes(), files: 1, fields: 20 },
    }),
  )
  async uploadFile(
    @Param('tenantId') tenantId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadSourceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    return this.knowledgeService.uploadFile(file, dto, tenantId, user.sub);
  }

  @Post('url')
  @Roles('manager')
  @ApiOperation({ summary: 'Indexar URL (ainda não disponível)' })
  createFromUrl(@Param('tenantId') tenantId: string, @Body() dto: CreateUrlSourceDto, @CurrentUser() user: JwtPayload) {
    return this.knowledgeService.createFromUrl(dto, tenantId, user.sub);
  }

  @Post('typed')
  @Roles('manager')
  @ApiOperation({ summary: 'Criar conteúdo digitado (título, conteúdo, agente, contexto)' })
  createTyped(@Param('tenantId') tenantId: string, @Body() dto: CreateTypedSourceDto, @CurrentUser() user: JwtPayload) {
    return this.knowledgeService.createTyped(dto, tenantId, user.sub);
  }

  @Patch(':sourceId/agent')
  @Roles('manager')
  @ApiOperation({ summary: 'Alterar a associação: agente específico ou compartilhado (null)' })
  setAgent(
    @Param('tenantId') tenantId: string,
    @Param('sourceId') sourceId: string,
    @Body() dto: SetSourceAgentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.knowledgeService.setAgent(sourceId, tenantId, dto.agentId, user.sub);
  }

  @Post(':sourceId/retry')
  @Roles('manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reprocessar (também indexa documentos que aguardavam IA)' })
  retry(@Param('tenantId') tenantId: string, @Param('sourceId') sourceId: string) {
    return this.knowledgeService.retryProcessing(sourceId, tenantId);
  }

  @Delete(':sourceId')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir documento (arquivo, texto, trechos e embeddings)' })
  async remove(@Param('tenantId') tenantId: string, @Param('sourceId') sourceId: string, @CurrentUser() user: JwtPayload) {
    await this.knowledgeService.deleteSource(sourceId, tenantId, user.sub);
  }
}
