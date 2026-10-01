import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { TisService } from './services/tis.service';

@Controller({ path: 'tis', version: '1' })
@UseGuards(JwtAuthGuard)
export class TisController {
  constructor(private readonly tis: TisService) {}

  // ── Operadoras ────────────────────────────────────────────────────────────

  @Get('operadoras')
  listCarriers(@Query('organizationId') o: string, @CurrentUser() u: AuthenticatedUser) {
    return this.tis.listCarriers(o, u);
  }

  @Post('operadoras')
  createCarrier(@Query('organizationId') o: string, @Body() b: any, @CurrentUser() u: AuthenticatedUser) {
    return this.tis.createCarrier(o, b, u);
  }

  @Patch('operadoras/:id')
  updateCarrier(@Param('id') id: string, @Query('organizationId') o: string, @Body() b: any, @CurrentUser() u: AuthenticatedUser) {
    return this.tis.updateCarrier(id, o, b, u);
  }

  @Post('operadoras/:carrierId/planos')
  createPlan(@Param('carrierId') carrierId: string, @Query('organizationId') o: string, @Body() b: any, @CurrentUser() u: AuthenticatedUser) {
    return this.tis.createPlan(carrierId, o, b, u);
  }

  // ── Contratos ─────────────────────────────────────────────────────────────

  @Get('contratos')
  listContracts(@Query('organizationId') o: string, @CurrentUser() u: AuthenticatedUser) {
    return this.tis.listContracts(o, u);
  }

  @Post('contratos')
  createContract(@Query('organizationId') o: string, @Body() b: any, @CurrentUser() u: AuthenticatedUser) {
    return this.tis.createContract(o, b, u);
  }

  // ── Tabela TUSS ───────────────────────────────────────────────────────────

  @Get('tuss')
  listTussCodes(@Query('organizationId') o: string, @Query('search') s: string | undefined, @CurrentUser() u: AuthenticatedUser) {
    return this.tis.listTussCodes(o, u, s);
  }

  @Post('tuss')
  upsertTussCode(@Query('organizationId') o: string, @Body() b: any, @CurrentUser() u: AuthenticatedUser) {
    return this.tis.upsertTussCode(o, b, u);
  }

  // ── Guias ─────────────────────────────────────────────────────────────────

  @Get('guias')
  listGuides(
    @Query('organizationId') o: string,
    @Query('contractId') contractId: string | undefined,
    @Query('status') status: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.tis.listGuides(o, u, { contractId, status, from, to });
  }

  @Post('guias')
  createGuide(@Query('organizationId') o: string, @Body() b: any, @CurrentUser() u: AuthenticatedUser) {
    return this.tis.createGuide(o, b, u);
  }

  @Post('guias/:id/validar')
  @HttpCode(HttpStatus.OK)
  validateGuide(@Param('id') id: string, @Query('organizationId') o: string, @CurrentUser() u: AuthenticatedUser) {
    return this.tis.validateGuide(id, o, u);
  }

  @Patch('guias/:id/status')
  updateGuideStatus(@Param('id') id: string, @Query('organizationId') o: string, @Body() b: any, @CurrentUser() u: AuthenticatedUser) {
    return this.tis.updateGuideStatus(id, o, b, u);
  }

  // ── Lotes ─────────────────────────────────────────────────────────────────

  @Get('lotes')
  listLots(
    @Query('organizationId') o: string,
    @Query('contractId') contractId: string | undefined,
    @Query('status') status: string | undefined,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.tis.listLots(o, u, { contractId, status });
  }

  @Post('lotes')
  createLot(@Query('organizationId') o: string, @Body() b: any, @CurrentUser() u: AuthenticatedUser) {
    return this.tis.createLot(o, b, u);
  }

  @Post('lotes/:id/fechar')
  @HttpCode(HttpStatus.OK)
  closeLot(@Param('id') id: string, @Query('organizationId') o: string, @CurrentUser() u: AuthenticatedUser) {
    return this.tis.closeLot(id, o, u);
  }

  @Post('lotes/:id/exportar-xml')
  @HttpCode(HttpStatus.OK)
  exportLotXml(@Param('id') id: string, @Query('organizationId') o: string, @CurrentUser() u: AuthenticatedUser) {
    return this.tis.exportLotXml(id, o, u);
  }

  // ── Glosas ────────────────────────────────────────────────────────────────

  @Get('glosas')
  listClaims(
    @Query('organizationId') o: string,
    @Query('guideId') guideId: string | undefined,
    @Query('status') status: string | undefined,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.tis.listClaims(o, u, { guideId, status });
  }

  @Post('glosas')
  createClaim(@Query('organizationId') o: string, @Body() b: any, @CurrentUser() u: AuthenticatedUser) {
    return this.tis.createClaim(o, b, u);
  }

  @Post('glosas/:id/recurso')
  createAppeal(@Param('id') claimId: string, @Query('organizationId') o: string, @Body() b: any, @CurrentUser() u: AuthenticatedUser) {
    return this.tis.createAppeal(claimId, o, b, u);
  }

  // ── Indicadores ───────────────────────────────────────────────────────────

  @Get('indicadores')
  getIndicators(@Query('organizationId') o: string, @CurrentUser() u: AuthenticatedUser) {
    return this.tis.getIndicators(o, u);
  }
}
