import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiHeader } from '@nestjs/swagger';
import { KnowledgeService } from './knowledge.service';
import { UploadSourceDto, CreateUrlSourceDto, CreateTypedSourceDto } from './dto/upload-source.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../shared/rbac/rbac.guard';
import { Roles } from '../../shared/rbac/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';

@ApiTags('knowledge')
@Controller('tenants/:tenantId/knowledge')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-slug', required: true })
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get()
  @Roles('viewer')
  @ApiOperation({ summary: 'Listar fontes de conhecimento do tenant' })
  findAll(
    @Param('tenantId') tenantId: string,
    @Query('agentId') agentId?: string,
  ) {
    return this.knowledgeService.listSources(tenantId, agentId);
  }

  @Get(':sourceId')
  @Roles('viewer')
  @ApiOperation({ summary: 'Detalhes da fonte de conhecimento' })
  findOne(
    @Param('tenantId') tenantId: string,
    @Param('sourceId') sourceId: string,
  ) {
    return this.knowledgeService.getSource(sourceId, tenantId);
  }

  @Post('upload')
  @Roles('manager')
  @ApiOperation({ summary: 'Upload de arquivo (PDF, DOCX, TXT, CSV)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('tenantId') tenantId: string,
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
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateUrlSourceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.knowledgeService.createFromUrl(dto, tenantId, user.sub);
  }

  @Post('typed')
  @Roles('manager')
  @ApiOperation({ summary: 'Criar fonte de texto digitado' })
  createTyped(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateTypedSourceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.knowledgeService.createTyped(dto, tenantId, user.sub);
  }

  @Post(':sourceId/retry')
  @Roles('manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reprocessar fonte com falha' })
  retry(
    @Param('tenantId') tenantId: string,
    @Param('sourceId') sourceId: string,
  ) {
    return this.knowledgeService.retryProcessing(sourceId, tenantId);
  }

  @Delete(':sourceId')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover fonte de conhecimento' })
  async remove(
    @Param('tenantId') tenantId: string,
    @Param('sourceId') sourceId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.knowledgeService.deleteSource(sourceId, tenantId, user.sub);
  }
}
