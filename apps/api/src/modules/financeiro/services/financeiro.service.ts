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
export class FinanceiroService {
  constructor(private readonly prisma: PrismaService) {}

  private assertAccess(organizationId: string, user: AuthenticatedUser) {
    if (!user.isWalletzAdmin && !user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
  }

  private async assertPeriodOpen(organizationId: string, date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const period = await this.prisma.financialPeriod.findUnique({
      where: { organizationId_year_month: { organizationId, year, month } },
    });
    if (period?.status === 'FECHADO') {
      throw new ForbiddenException(
        `Período ${month}/${year} está fechado. Reabra o período para realizar alterações.`,
      );
    }
  }

  // ── Contas ────────────────────────────────────────────────────────────────

  async listAccounts(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    return this.prisma.financialAccount.findMany({
      where: { organizationId, active: true },
      orderBy: { name: 'asc' },
    });
  }

  async createAccount(
    organizationId: string,
    dto: { name: string; type: string; bankName?: string; accountNumber?: string; initialBalance?: number },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.financialAccount.create({
      data: {
        id: randomUUID(),
        organizationId,
        name: dto.name,
        type: dto.type,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        initialBalance: dto.initialBalance != null ? new Decimal(dto.initialBalance) : new Decimal(0),
      },
    });
  }

  // ── Categorias ────────────────────────────────────────────────────────────

  async listCategories(organizationId: string, user: AuthenticatedUser, type?: string) {
    this.assertAccess(organizationId, user);
    return this.prisma.financialCategory.findMany({
      where: { organizationId, active: true, ...(type ? { type: type as any } : {}) },
      include: { children: true },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(
    organizationId: string,
    dto: { name: string; type: string; parentId?: string },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.financialCategory.create({
      data: {
        id: randomUUID(),
        organizationId,
        name: dto.name,
        type: dto.type as any,
        parentId: dto.parentId,
      },
    });
  }

  // ── Lançamentos ───────────────────────────────────────────────────────────

  async listTransactions(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: { status?: string; type?: string; from?: string; to?: string; patientId?: string },
  ) {
    this.assertAccess(organizationId, user);
    const where: Record<string, unknown> = { organizationId };
    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;
    if (filters?.patientId) where.patientId = filters.patientId;
    if (filters?.from || filters?.to) {
      where.dueDate = {
        ...(filters.from ? { gte: new Date(filters.from) } : {}),
        ...(filters.to ? { lte: new Date(filters.to) } : {}),
      };
    }
    return this.prisma.financialTransaction.findMany({
      where,
      include: { category: true, payments: true },
      orderBy: { dueDate: 'desc' },
      take: 200,
    });
  }

  async createTransaction(
    organizationId: string,
    dto: {
      type: string;
      description: string;
      amount: number;
      dueDate: string;
      categoryId?: string;
      unitId?: string;
      patientId?: string;
      professionalId?: string;
      notes?: string;
      referenceType?: string;
      referenceId?: string;
      idempotencyKey?: string;
    },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);

    if (dto.idempotencyKey) {
      const existing = await this.prisma.financialTransaction.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: { payments: true },
      });
      if (existing) return existing;
    }

    const dueDate = new Date(dto.dueDate);
    await this.assertPeriodOpen(organizationId, dueDate);

    const amount = new Decimal(dto.amount);
    if (amount.lte(0)) throw new BadRequestException('Valor deve ser positivo');

    return this.prisma.financialTransaction.create({
      data: {
        id: randomUUID(),
        organizationId,
        type: dto.type as any,
        description: dto.description,
        amount,
        dueDate,
        categoryId: dto.categoryId,
        unitId: dto.unitId,
        patientId: dto.patientId,
        professionalId: dto.professionalId,
        notes: dto.notes,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        idempotencyKey: dto.idempotencyKey,
        createdBy: user.sub,
      },
      include: { category: true, payments: true },
    });
  }

  async getTransaction(id: string, organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const tx = await this.prisma.financialTransaction.findFirst({
      where: { id, organizationId },
      include: { category: true, payments: true },
    });
    if (!tx) throw new NotFoundException('Lançamento não encontrado');
    return tx;
  }

  async cancelTransaction(
    id: string,
    organizationId: string,
    dto: { reason: string },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const tx = await this.prisma.financialTransaction.findFirst({
      where: { id, organizationId },
    });
    if (!tx) throw new NotFoundException('Lançamento não encontrado');
    if (tx.status === 'CANCELADO') throw new BadRequestException('Lançamento já cancelado');
    if (tx.paidAmount.gt(0)) {
      throw new BadRequestException('Não é possível cancelar lançamento parcialmente pago. Use estorno.');
    }
    await this.assertPeriodOpen(organizationId, tx.dueDate);
    return this.prisma.financialTransaction.update({
      where: { id },
      data: { status: 'CANCELADO', cancelledAt: new Date(), cancelReason: dto.reason },
    });
  }

  // ── Pagamentos ────────────────────────────────────────────────────────────

  async recordPayment(
    transactionId: string,
    organizationId: string,
    dto: {
      amount: number;
      method: string;
      accountId?: string;
      paidAt?: string;
      notes?: string;
      idempotencyKey?: string;
    },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);

    if (dto.idempotencyKey) {
      const existing = await this.prisma.financialPayment.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return existing;
    }

    const tx = await this.prisma.financialTransaction.findFirst({
      where: { id: transactionId, organizationId },
    });
    if (!tx) throw new NotFoundException('Lançamento não encontrado');
    if (tx.status === 'CANCELADO') throw new BadRequestException('Lançamento cancelado');

    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    await this.assertPeriodOpen(organizationId, paidAt);

    const payAmount = new Decimal(dto.amount);
    if (payAmount.lte(0)) throw new BadRequestException('Valor deve ser positivo');

    const remaining = tx.amount.minus(tx.paidAmount);
    if (payAmount.gt(remaining)) {
      throw new BadRequestException(
        `Valor excede saldo pendente: restante ${remaining.toFixed(2)}, informado ${payAmount.toFixed(2)}`,
      );
    }

    return this.prisma.$transaction(async (ptx) => {
      const payment = await ptx.financialPayment.create({
        data: {
          id: randomUUID(),
          transactionId,
          accountId: dto.accountId,
          amount: payAmount,
          method: dto.method as any,
          paidAt,
          notes: dto.notes,
          idempotencyKey: dto.idempotencyKey,
          recordedBy: user.sub,
        },
      });

      const newPaid = tx.paidAmount.plus(payAmount);
      const newStatus = newPaid.gte(tx.amount) ? 'PAGO' : 'PARCIALMENTE_PAGO';
      await ptx.financialTransaction.update({
        where: { id: transactionId },
        data: { paidAmount: newPaid, status: newStatus },
      });

      return payment;
    });
  }

  async reversePayment(
    paymentId: string,
    organizationId: string,
    dto: { reason: string },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const payment = await this.prisma.financialPayment.findFirst({
      where: { id: paymentId },
      include: { transaction: true },
    });
    if (!payment || payment.transaction.organizationId !== organizationId) {
      throw new NotFoundException('Pagamento não encontrado');
    }
    if (payment.reversedAt) throw new BadRequestException('Pagamento já estornado');
    await this.assertPeriodOpen(organizationId, new Date());

    return this.prisma.$transaction(async (ptx) => {
      await ptx.financialPayment.update({
        where: { id: paymentId },
        data: { reversedAt: new Date(), reversedBy: user.sub, reversalReason: dto.reason },
      });
      const tx = payment.transaction;
      const newPaid = tx.paidAmount.minus(payment.amount);
      const newStatus = newPaid.lte(0) ? 'PENDENTE' : 'PARCIALMENTE_PAGO';
      await ptx.financialTransaction.update({
        where: { id: tx.id },
        data: { paidAmount: newPaid.lt(0) ? new Decimal(0) : newPaid, status: newStatus },
      });
      return ptx.financialPayment.findUnique({ where: { id: paymentId } });
    });
  }

  // ── Períodos ──────────────────────────────────────────────────────────────

  async listPeriods(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    return this.prisma.financialPeriod.findMany({
      where: { organizationId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async closePeriod(
    organizationId: string,
    dto: { year: number; month: number; reason?: string },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const existing = await this.prisma.financialPeriod.findUnique({
      where: { organizationId_year_month: { organizationId, year: dto.year, month: dto.month } },
    });
    if (existing?.status === 'FECHADO') {
      throw new ConflictException('Período já fechado');
    }
    if (existing) {
      return this.prisma.financialPeriod.update({
        where: { id: existing.id },
        data: { status: 'FECHADO', closedBy: user.sub, closedAt: new Date(), closeReason: dto.reason },
      });
    }
    return this.prisma.financialPeriod.create({
      data: {
        id: randomUUID(),
        organizationId,
        year: dto.year,
        month: dto.month,
        status: 'FECHADO',
        closedBy: user.sub,
        closedAt: new Date(),
        closeReason: dto.reason,
      },
    });
  }

  async reopenPeriod(
    organizationId: string,
    dto: { year: number; month: number; reason: string },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const existing = await this.prisma.financialPeriod.findUnique({
      where: { organizationId_year_month: { organizationId, year: dto.year, month: dto.month } },
    });
    if (!existing || existing.status !== 'FECHADO') {
      throw new BadRequestException('Período não está fechado');
    }
    return this.prisma.financialPeriod.update({
      where: { id: existing.id },
      data: { status: 'ABERTO', closedBy: null, closedAt: null, closeReason: dto.reason },
    });
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  async getDashboard(organizationId: string, user: AuthenticatedUser, year: number, month: number) {
    this.assertAccess(organizationId, user);
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0);
    const [transactions, overdue] = await Promise.all([
      this.prisma.financialTransaction.findMany({
        where: {
          organizationId,
          dueDate: { gte: from, lte: to },
          status: { not: 'CANCELADO' },
        },
        include: { payments: true },
      }),
      this.prisma.financialTransaction.findMany({
        where: {
          organizationId,
          status: { in: ['PENDENTE', 'PARCIALMENTE_PAGO'] },
          dueDate: { lt: new Date() },
        },
      }),
    ]);
    const receitas = transactions.filter((t) => t.type === 'RECEITA');
    const despesas = transactions.filter((t) => t.type === 'DESPESA');
    const totalReceitas = receitas.reduce((s, t) => s.plus(t.amount), new Decimal(0));
    const totalDespesas = despesas.reduce((s, t) => s.plus(t.amount), new Decimal(0));
    const totalRecebido = receitas.reduce((s, t) => s.plus(t.paidAmount), new Decimal(0));
    const totalPago = despesas.reduce((s, t) => s.plus(t.paidAmount), new Decimal(0));
    return {
      period: { year, month },
      receitas: { total: totalReceitas, recebido: totalRecebido, pendente: totalReceitas.minus(totalRecebido) },
      despesas: { total: totalDespesas, pago: totalPago, pendente: totalDespesas.minus(totalPago) },
      saldo: totalRecebido.minus(totalPago),
      vencidos: overdue.length,
    };
  }
}
