import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { EstoqueService } from './services/estoque.service';

@Controller({ path: 'estoque', version: '1' })
@UseGuards(JwtAuthGuard)
export class EstoqueController {
  constructor(private readonly estoque: EstoqueService) {}

  // ── Categorias ────────────────────────────────────────────────────────────

  @Get('categorias')
  listCategories(
    @Query('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.estoque.listCategories(orgId, user);
  }

  @Post('categorias')
  createCategory(
    @Query('organizationId') orgId: string,
    @Body() body: { name: string; description?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.estoque.createCategory(orgId, body, user);
  }

  // ── Itens ─────────────────────────────────────────────────────────────────

  @Get('itens')
  listItems(
    @Query('organizationId') orgId: string,
    @Query('categoryId') categoryId: string | undefined,
    @Query('search') search: string | undefined,
    @Query('active') active: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.estoque.listItems(orgId, user, {
      categoryId,
      search,
      active: active === undefined ? true : active === 'true',
    });
  }

  @Post('itens')
  createItem(
    @Query('organizationId') orgId: string,
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.estoque.createItem(orgId, body, user);
  }

  @Get('itens/:id')
  getItem(
    @Param('id') id: string,
    @Query('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.estoque.getItem(id, orgId, user);
  }

  @Patch('itens/:id')
  updateItem(
    @Param('id') id: string,
    @Query('organizationId') orgId: string,
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.estoque.updateItem(id, orgId, body, user);
  }

  // ── Lotes ─────────────────────────────────────────────────────────────────

  @Get('itens/:itemId/lotes')
  listLots(
    @Param('itemId') itemId: string,
    @Query('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.estoque.listLots(itemId, orgId, user);
  }

  @Post('itens/:itemId/lotes')
  createLot(
    @Param('itemId') itemId: string,
    @Query('organizationId') orgId: string,
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.estoque.createLot(itemId, orgId, body, user);
  }

  // ── Saldos ────────────────────────────────────────────────────────────────

  @Get('saldos')
  getBalances(
    @Query('organizationId') orgId: string,
    @Query('unitId') unitId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.estoque.getBalances(orgId, unitId, user);
  }

  // ── Movimentações ─────────────────────────────────────────────────────────

  @Get('movimentacoes')
  listMovements(
    @Query('organizationId') orgId: string,
    @Query('itemId') itemId: string | undefined,
    @Query('unitId') unitId: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.estoque.listMovements(orgId, user, { itemId, unitId, from, to });
  }

  @Post('movimentacoes')
  @HttpCode(HttpStatus.CREATED)
  recordMovement(
    @Query('organizationId') orgId: string,
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.estoque.recordMovement(orgId, body, user);
  }

  // ── Transferências ────────────────────────────────────────────────────────

  @Get('transferencias')
  listTransfers(
    @Query('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.estoque.listTransfers(orgId, user);
  }

  @Post('transferencias')
  createTransfer(
    @Query('organizationId') orgId: string,
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.estoque.createTransfer(orgId, body, user);
  }

  @Post('transferencias/:id/receber')
  @HttpCode(HttpStatus.OK)
  receiveTransfer(
    @Param('id') id: string,
    @Query('organizationId') orgId: string,
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.estoque.receiveTransfer(id, orgId, body, user);
  }

  // ── Alertas ───────────────────────────────────────────────────────────────

  @Get('alertas')
  getAlerts(
    @Query('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.estoque.getAlerts(orgId, user);
  }
}
