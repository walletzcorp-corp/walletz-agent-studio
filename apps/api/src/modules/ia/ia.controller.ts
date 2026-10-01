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
import { IaService } from './services/ia.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller({ path: 'ia', version: '1' })
@UseGuards(JwtAuthGuard)
export class IaController {
  constructor(private readonly iaService: IaService) {}

  @Get(':organizationId/configs')
  listConfigs(@Param('organizationId') org: string, @Request() req: any) {
    return this.iaService.listConfigs(org, req.user);
  }

  @Post(':organizationId/configs')
  upsertConfig(
    @Param('organizationId') org: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.iaService.upsertConfig(org, dto, req.user);
  }

  @Patch(':organizationId/configs/:useCase/aprovar')
  approveConfig(
    @Param('organizationId') org: string,
    @Param('useCase') useCase: string,
    @Request() req: any,
  ) {
    return this.iaService.approveConfig(org, useCase, req.user);
  }

  @Patch(':organizationId/configs/:useCase/desativar')
  disableConfig(
    @Param('organizationId') org: string,
    @Param('useCase') useCase: string,
    @Request() req: any,
  ) {
    return this.iaService.disableConfig(org, useCase, req.user);
  }

  @Post(':organizationId/rascunhos')
  generateDraft(
    @Param('organizationId') org: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.iaService.generateDraft(org, dto, req.user);
  }

  @Get(':organizationId/rascunhos/pendentes')
  listPendingDrafts(
    @Param('organizationId') org: string,
    @Query() q: any,
    @Request() req: any,
  ) {
    return this.iaService.listPendingDrafts(org, req.user, q);
  }

  @Patch(':organizationId/rascunhos/:draftId/aceitar')
  acceptDraft(
    @Param('organizationId') org: string,
    @Param('draftId') draftId: string,
    @Body() dto: { reviewNotes?: string },
    @Request() req: any,
  ) {
    return this.iaService.acceptDraft(org, draftId, dto.reviewNotes, req.user);
  }

  @Patch(':organizationId/rascunhos/:draftId/rejeitar')
  rejectDraft(
    @Param('organizationId') org: string,
    @Param('draftId') draftId: string,
    @Body() dto: { reviewNotes: string },
    @Request() req: any,
  ) {
    return this.iaService.rejectDraft(org, draftId, dto.reviewNotes, req.user);
  }

  @Post(':organizationId/rascunhos/expirar')
  expireOldDrafts(
    @Param('organizationId') org: string,
    @Request() req: any,
  ) {
    return this.iaService.expireOldDrafts(org, req.user);
  }

  @Post(':organizationId/metricas-qualidade')
  recordQualityMetric(
    @Param('organizationId') org: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.iaService.recordQualityMetric(org, dto, req.user);
  }

  @Get(':organizationId/metricas-qualidade')
  listQualityMetrics(
    @Param('organizationId') org: string,
    @Query() q: any,
    @Request() req: any,
  ) {
    return this.iaService.listQualityMetrics(org, req.user, q);
  }

  @Get(':organizationId/logs')
  listUsageLogs(
    @Param('organizationId') org: string,
    @Query() q: any,
    @Request() req: any,
  ) {
    return this.iaService.listUsageLogs(org, req.user, q);
  }
}
