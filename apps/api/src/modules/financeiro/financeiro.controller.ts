import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { FinanceiroService } from './services/financeiro.service';

@Controller({ path: 'financeiro', version: '1' })
@UseGuards(JwtAuthGuard)
export class FinanceiroController {
  constructor(private readonly fin: FinanceiroService) {}

  // ── Dashboard ─────────────────────────────────────────────────────────────

  @Get('dashboard')
  getDashboard(
    @Query('organizationId') orgId: string,
    @Query('year') year: string,
    @Query('month') month: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const now = new Date();
    return this.fin.getDashboard(
      orgId,
      user,
      year ? +year : now.getFullYear(),
      month ? +month : now.getMonth() + 1,
    );
  }

  // ── Contas ────────────────────────────────────────────────────────────────

  @Get('contas')
  listAccounts(
    @Query('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fin.listAccounts(orgId, user);
  }

  @Post('contas')
  createAccount(
    @Query('organizationId') orgId: string,
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fin.createAccount(orgId, body, user);
  }

  // ── Categorias ────────────────────────────────────────────────────────────

  @Get('categorias')
  listCategories(
    @Query('organizationId') orgId: string,
    @Query('type') type: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fin.listCategories(orgId, user, type);
  }

  @Post('categorias')
  createCategory(
    @Query('organizationId') orgId: string,
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fin.createCategory(orgId, body, user);
  }

  // ── Lançamentos ───────────────────────────────────────────────────────────

  @Get('lancamentos')
  listTransactions(
    @Query('organizationId') orgId: string,
    @Query('status') status: string | undefined,
    @Query('type') type: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('patientId') patientId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fin.listTransactions(orgId, user, { status, type, from, to, patientId });
  }

  @Post('lancamentos')
  createTransaction(
    @Query('organizationId') orgId: string,
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fin.createTransaction(orgId, body, user);
  }

  @Get('lancamentos/:id')
  getTransaction(
    @Param('id') id: string,
    @Query('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fin.getTransaction(id, orgId, user);
  }

  @Post('lancamentos/:id/cancelar')
  @HttpCode(HttpStatus.OK)
  cancelTransaction(
    @Param('id') id: string,
    @Query('organizationId') orgId: string,
    @Body() body: { reason: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fin.cancelTransaction(id, orgId, body, user);
  }

  // ── Pagamentos ────────────────────────────────────────────────────────────

  @Post('lancamentos/:id/pagamentos')
  @HttpCode(HttpStatus.CREATED)
  recordPayment(
    @Param('id') transactionId: string,
    @Query('organizationId') orgId: string,
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fin.recordPayment(transactionId, orgId, body, user);
  }

  @Post('pagamentos/:id/estornar')
  @HttpCode(HttpStatus.OK)
  reversePayment(
    @Param('id') paymentId: string,
    @Query('organizationId') orgId: string,
    @Body() body: { reason: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fin.reversePayment(paymentId, orgId, body, user);
  }

  // ── Períodos ──────────────────────────────────────────────────────────────

  @Get('periodos')
  listPeriods(
    @Query('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fin.listPeriods(orgId, user);
  }

  @Post('periodos/fechar')
  @HttpCode(HttpStatus.OK)
  closePeriod(
    @Query('organizationId') orgId: string,
    @Body() body: { year: number; month: number; reason?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fin.closePeriod(orgId, body, user);
  }

  @Post('periodos/reabrir')
  @HttpCode(HttpStatus.OK)
  reopenPeriod(
    @Query('organizationId') orgId: string,
    @Body() body: { year: number; month: number; reason: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fin.reopenPeriod(orgId, body, user);
  }
}
