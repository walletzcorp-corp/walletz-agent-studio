import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { randomUUID } from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class EstoqueService {
  constructor(private readonly prisma: PrismaService) {}

  private assertAccess(organizationId: string, user: AuthenticatedUser) {
    if (!user.isWalletzAdmin && !user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
  }

  // ── Categorias ────────────────────────────────────────────────────────────

  async listCategories(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    return this.prisma.stockCategory.findMany({
      where: { organizationId, active: true },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(
    organizationId: string,
    dto: { name: string; description?: string },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.stockCategory.create({
      data: { id: randomUUID(), organizationId, ...dto },
    });
  }

  // ── Itens ─────────────────────────────────────────────────────────────────

  async listItems(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: { active?: boolean; categoryId?: string; search?: string },
  ) {
    this.assertAccess(organizationId, user);
    const where: Record<string, unknown> = { organizationId };
    if (filters?.active !== undefined) where.active = filters.active;
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.stockItem.findMany({
      where,
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  }

  async createItem(
    organizationId: string,
    dto: {
      name: string;
      unitOfMeasure: string;
      categoryId?: string;
      code?: string;
      description?: string;
      presentation?: string;
      type?: string;
      requiresLot?: boolean;
      requiresColdChain?: boolean;
      minStock?: number;
      maxStock?: number;
    },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    if (dto.code) {
      const existing = await this.prisma.stockItem.findUnique({
        where: { organizationId_code: { organizationId, code: dto.code } },
      });
      if (existing) throw new ConflictException('Código já existe para esta organização');
    }
    return this.prisma.stockItem.create({
      data: {
        id: randomUUID(),
        organizationId,
        name: dto.name,
        unitOfMeasure: dto.unitOfMeasure,
        categoryId: dto.categoryId,
        code: dto.code,
        description: dto.description,
        presentation: dto.presentation,
        type: (dto.type as any) ?? 'CONSUMIVEL',
        requiresLot: dto.requiresLot ?? false,
        requiresColdChain: dto.requiresColdChain ?? false,
        minStock: dto.minStock != null ? new Decimal(dto.minStock) : undefined,
        maxStock: dto.maxStock != null ? new Decimal(dto.maxStock) : undefined,
      },
      include: { category: true },
    });
  }

  async getItem(id: string, organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const item = await this.prisma.stockItem.findFirst({
      where: { id, organizationId },
      include: { category: true, balances: true },
    });
    if (!item) throw new NotFoundException('Item não encontrado');
    return item;
  }

  async updateItem(
    id: string,
    organizationId: string,
    dto: Partial<{
      name: string;
      description: string;
      presentation: string;
      minStock: number;
      maxStock: number;
      active: boolean;
    }>,
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const item = await this.prisma.stockItem.findFirst({ where: { id, organizationId } });
    if (!item) throw new NotFoundException('Item não encontrado');
    return this.prisma.stockItem.update({
      where: { id },
      data: {
        ...dto,
        minStock: dto.minStock != null ? new Decimal(dto.minStock) : undefined,
        maxStock: dto.maxStock != null ? new Decimal(dto.maxStock) : undefined,
      },
    });
  }

  // ── Lotes ─────────────────────────────────────────────────────────────────

  async listLots(itemId: string, organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    return this.prisma.stockLot.findMany({
      where: { itemId, organizationId, active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createLot(
    itemId: string,
    organizationId: string,
    dto: {
      lotNumber: string;
      supplierName?: string;
      manufacturerDate?: string;
      expiryDate?: string;
      unitCost?: number;
    },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const item = await this.prisma.stockItem.findFirst({ where: { id: itemId, organizationId } });
    if (!item) throw new NotFoundException('Item não encontrado');
    return this.prisma.stockLot.create({
      data: {
        id: randomUUID(),
        itemId,
        organizationId,
        lotNumber: dto.lotNumber,
        supplierName: dto.supplierName,
        manufacturerDate: dto.manufacturerDate ? new Date(dto.manufacturerDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        unitCost: dto.unitCost != null ? new Decimal(dto.unitCost) : undefined,
      },
    });
  }

  // ── Saldos ────────────────────────────────────────────────────────────────

  async getBalances(organizationId: string, unitId: string | undefined, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const where: Record<string, unknown> = { organizationId };
    if (unitId) where.unitId = unitId;
    return this.prisma.stockBalance.findMany({
      where,
      include: { item: { include: { category: true } } },
      orderBy: { item: { name: 'asc' } },
    });
  }

  // ── Movimentações ─────────────────────────────────────────────────────────

  async listMovements(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: { itemId?: string; unitId?: string; from?: string; to?: string },
  ) {
    this.assertAccess(organizationId, user);
    const where: Record<string, unknown> = { organizationId };
    if (filters?.itemId) where.itemId = filters.itemId;
    if (filters?.unitId) where.unitId = filters.unitId;
    if (filters?.from || filters?.to) {
      where.performedAt = {
        ...(filters.from ? { gte: new Date(filters.from) } : {}),
        ...(filters.to ? { lte: new Date(filters.to) } : {}),
      };
    }
    return this.prisma.stockMovement.findMany({
      where,
      include: { item: true, lot: true },
      orderBy: { performedAt: 'desc' },
      take: 200,
    });
  }

  async recordMovement(
    organizationId: string,
    dto: {
      itemId: string;
      unitId: string;
      type: string;
      quantity: number;
      lotId?: string;
      unitCost?: number;
      reason?: string;
      referenceType?: string;
      referenceId?: string;
      idempotencyKey?: string;
    },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);

    if (dto.idempotencyKey) {
      const existing = await this.prisma.stockMovement.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return existing;
    }

    const qty = new Decimal(dto.quantity);
    if (qty.lte(0)) throw new BadRequestException('Quantidade deve ser positiva');

    const isDecrease = [
      'SAIDA', 'AJUSTE_NEGATIVO', 'PERDA', 'DESCARTE', 'TRANSFERENCIA_SAIDA', 'CONSUMO',
    ].includes(dto.type);

    return this.prisma.$transaction(async (tx) => {
      // Upsert balance atomically
      const balanceKey = { itemId_organizationId_unitId: {
        itemId: dto.itemId, organizationId, unitId: dto.unitId,
      }};
      let balance = await tx.stockBalance.findUnique({ where: balanceKey });

      if (isDecrease) {
        const available = balance ? balance.quantity.minus(balance.reservedQty) : new Decimal(0);
        if (available.lt(qty)) {
          throw new BadRequestException(
            `Saldo insuficiente: disponível ${available.toFixed(4)}, solicitado ${qty.toFixed(4)}`,
          );
        }
      }

      if (!balance) {
        balance = await tx.stockBalance.create({
          data: {
            id: randomUUID(),
            itemId: dto.itemId,
            organizationId,
            unitId: dto.unitId,
            quantity: new Decimal(0),
            reservedQty: new Decimal(0),
          },
        });
      }

      const delta = isDecrease ? qty.negated() : qty;
      await tx.stockBalance.update({
        where: { id: balance.id },
        data: { quantity: { increment: delta } },
      });

      const totalCost =
        dto.unitCost != null ? new Decimal(dto.unitCost).times(qty) : undefined;

      return tx.stockMovement.create({
        data: {
          id: randomUUID(),
          itemId: dto.itemId,
          lotId: dto.lotId,
          organizationId,
          unitId: dto.unitId,
          type: dto.type as any,
          quantity: qty,
          unitCost: dto.unitCost != null ? new Decimal(dto.unitCost) : undefined,
          totalCost,
          reason: dto.reason,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          idempotencyKey: dto.idempotencyKey,
          performedBy: user.sub,
        },
      });
    });
  }

  // ── Transferências ────────────────────────────────────────────────────────

  async listTransfers(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    return this.prisma.stockTransfer.findMany({
      where: { organizationId },
      include: { lines: { include: { item: true, lot: true } } },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async createTransfer(
    organizationId: string,
    dto: {
      fromUnitId: string;
      toUnitId: string;
      notes?: string;
      lines: Array<{ itemId: string; lotId?: string; requestedQty: number }>;
    },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    if (dto.fromUnitId === dto.toUnitId) {
      throw new BadRequestException('Unidade de origem e destino devem ser diferentes');
    }
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.create({
        data: {
          id: randomUUID(),
          organizationId,
          fromUnitId: dto.fromUnitId,
          toUnitId: dto.toUnitId,
          notes: dto.notes,
          requestedBy: user.sub,
        },
      });
      await Promise.all(
        dto.lines.map((l) =>
          tx.stockTransferLine.create({
            data: {
              id: randomUUID(),
              transferId: transfer.id,
              itemId: l.itemId,
              lotId: l.lotId,
              requestedQty: new Decimal(l.requestedQty),
            },
          }),
        ),
      );
      return tx.stockTransfer.findUnique({
        where: { id: transfer.id },
        include: { lines: { include: { item: true } } },
      });
    });
  }

  async receiveTransfer(
    id: string,
    organizationId: string,
    dto: { lines: Array<{ lineId: string; receivedQty: number }> },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id, organizationId },
      include: { lines: { include: { item: true } } },
    });
    if (!transfer) throw new NotFoundException('Transferência não encontrada');
    if (transfer.status !== 'PENDENTE' && transfer.status !== 'ENVIADO') {
      throw new BadRequestException('Transferência já foi recebida ou cancelada');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const lineDto of dto.lines) {
        const line = transfer.lines.find((l) => l.id === lineDto.lineId);
        if (!line) continue;
        const recvQty = new Decimal(lineDto.receivedQty);
        await tx.stockTransferLine.update({
          where: { id: lineDto.lineId },
          data: { receivedQty: recvQty, sentQty: recvQty },
        });
        // Debit from origin unit
        await this._adjustBalance(tx, line.itemId, organizationId, transfer.fromUnitId, recvQty.negated());
        // Credit to destination unit
        await this._adjustBalance(tx, line.itemId, organizationId, transfer.toUnitId, recvQty);
        // Movement records
        await tx.stockMovement.create({
          data: {
            id: randomUUID(), itemId: line.itemId, lotId: line.lotId,
            organizationId, unitId: transfer.fromUnitId,
            type: 'TRANSFERENCIA_SAIDA', quantity: recvQty,
            referenceType: 'TRANSFER', referenceId: id, performedBy: user.sub,
          },
        });
        await tx.stockMovement.create({
          data: {
            id: randomUUID(), itemId: line.itemId, lotId: line.lotId,
            organizationId, unitId: transfer.toUnitId,
            type: 'TRANSFERENCIA_ENTRADA', quantity: recvQty,
            referenceType: 'TRANSFER', referenceId: id, performedBy: user.sub,
          },
        });
      }
      return tx.stockTransfer.update({
        where: { id },
        data: { status: 'RECEBIDO', receivedBy: user.sub, receivedAt: new Date() },
        include: { lines: { include: { item: true } } },
      });
    });
  }

  private async _adjustBalance(
    tx: any,
    itemId: string,
    organizationId: string,
    unitId: string,
    delta: Decimal,
  ) {
    const key = { itemId_organizationId_unitId: { itemId, organizationId, unitId } };
    const bal = await tx.stockBalance.findUnique({ where: key });
    if (!bal) {
      await tx.stockBalance.create({
        data: {
          id: randomUUID(), itemId, organizationId, unitId,
          quantity: delta.lt(0) ? new Decimal(0) : delta,
          reservedQty: new Decimal(0),
        },
      });
    } else {
      await tx.stockBalance.update({ where: { id: bal.id }, data: { quantity: { increment: delta } } });
    }
  }

  // ── Alertas de estoque mínimo ─────────────────────────────────────────────

  async getAlerts(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const balances = await this.prisma.stockBalance.findMany({
      where: { organizationId },
      include: { item: true },
    });
    return balances.filter(
      (b) => b.item.minStock != null && b.quantity.lte(b.item.minStock),
    );
  }
}
