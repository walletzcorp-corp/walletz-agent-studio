import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  DiaOrderStatus,
  DiaSampleStatus,
  DiaResultStatus,
  Prisma,
} from '@prisma/client';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class DiaService {
  constructor(private readonly prisma: PrismaService) {}

  private assertAccess(organizationId: string, user: AuthenticatedUser) {
    if (user.isWalletzAdmin) return;
    if (!user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Acesso negado à organização');
    }
  }

  // ── RF-DIA-001: Pedidos de exame ────────────────────────────────────────────

  async createOrder(
    organizationId: string,
    user: AuthenticatedUser,
    data: {
      patientId: string;
      examCode: string;
      examName: string;
      examType: string;
      prepInstructions?: string;
      appointmentId?: string;
      scheduledAt?: Date;
      notes?: string;
    },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.diaOrder.create({
      data: {
        organizationId,
        patientId: data.patientId,
        appointmentId: data.appointmentId,
        requestedBy: user.sub,
        examCode: data.examCode,
        examName: data.examName,
        examType: data.examType,
        prepInstructions: data.prepInstructions,
        scheduledAt: data.scheduledAt,
        notes: data.notes,
        createdBy: user.sub,
      },
    });
  }

  async listOrders(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: { patientId?: string; status?: DiaOrderStatus; examType?: string },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.diaOrder.findMany({
      where: { organizationId, ...filters },
      include: { samples: true, results: { where: { status: DiaResultStatus.LIBERADO }, orderBy: { version: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateOrderStatus(
    organizationId: string,
    user: AuthenticatedUser,
    orderId: string,
    data: { status: DiaOrderStatus; authorizationId?: string; scheduledAt?: Date },
  ) {
    this.assertAccess(organizationId, user);
    const order = await this.prisma.diaOrder.findFirst({ where: { id: orderId, organizationId } });
    if (!order) throw new NotFoundException('Pedido não encontrado');

    const cancelledStatuses: string[] = [DiaOrderStatus.CANCELADO, DiaOrderStatus.ENTREGUE];
    if (cancelledStatuses.includes(order.status)) {
      throw new BadRequestException('Pedido já finalizado');
    }
    return this.prisma.diaOrder.update({
      where: { id: orderId },
      data: { status: data.status, authorizationId: data.authorizationId, scheduledAt: data.scheduledAt },
    });
  }

  // ── RF-DIA-002/003: Coleta e amostra ───────────────────────────────────────

  async registerSample(
    organizationId: string,
    user: AuthenticatedUser,
    data: { orderId: string; barcode: string; sampleType: string; collectedAt?: Date },
  ) {
    this.assertAccess(organizationId, user);
    const order = await this.prisma.diaOrder.findFirst({ where: { id: data.orderId, organizationId } });
    if (!order) throw new NotFoundException('Pedido não encontrado');

    const existing = await this.prisma.diaSample.findFirst({ where: { organizationId, barcode: data.barcode } });
    if (existing) throw new BadRequestException(`Código de barras ${data.barcode} já cadastrado`);

    return this.prisma.diaSample.create({
      data: {
        organizationId,
        orderId: data.orderId,
        barcode: data.barcode,
        sampleType: data.sampleType,
        collectedAt: data.collectedAt ?? new Date(),
        collectedBy: user.sub,
      },
    });
  }

  async rejectSample(
    organizationId: string,
    user: AuthenticatedUser,
    sampleId: string,
    data: { rejectionReason: string },
  ) {
    this.assertAccess(organizationId, user);
    const sample = await this.prisma.diaSample.findFirst({ where: { id: sampleId, organizationId } });
    if (!sample) throw new NotFoundException('Amostra não encontrada');
    if (sample.status === DiaSampleStatus.REJEITADA) {
      throw new BadRequestException('Amostra já rejeitada');
    }
    return this.prisma.diaSample.update({
      where: { id: sampleId },
      data: {
        status: DiaSampleStatus.REJEITADA,
        rejectionReason: data.rejectionReason,
        rejectedBy: user.sub,
        rejectedAt: new Date(),
      },
    });
  }

  async recolectSample(
    organizationId: string,
    user: AuthenticatedUser,
    parentSampleId: string,
    data: { barcode: string; sampleType: string },
  ) {
    this.assertAccess(organizationId, user);
    const parent = await this.prisma.diaSample.findFirst({ where: { id: parentSampleId, organizationId } });
    if (!parent) throw new NotFoundException('Amostra original não encontrada');
    if (parent.status !== DiaSampleStatus.REJEITADA) {
      throw new BadRequestException('Recoleta só permitida para amostras rejeitadas');
    }

    const existing = await this.prisma.diaSample.findFirst({ where: { organizationId, barcode: data.barcode } });
    if (existing) throw new BadRequestException(`Código de barras ${data.barcode} já cadastrado`);

    return this.prisma.diaSample.create({
      data: {
        organizationId,
        orderId: parent.orderId,
        barcode: data.barcode,
        sampleType: data.sampleType,
        status: DiaSampleStatus.RECEBIDA,
        collectedAt: new Date(),
        collectedBy: user.sub,
        parentSampleId,
      },
    });
  }

  // ── RF-DIA-004/005/006: Resultados ─────────────────────────────────────────

  async createResult(
    organizationId: string,
    user: AuthenticatedUser,
    data: { orderId: string; resultData: Record<string, unknown>; isCritical?: boolean },
  ) {
    this.assertAccess(organizationId, user);
    const order = await this.prisma.diaOrder.findFirst({ where: { id: data.orderId, organizationId } });
    if (!order) throw new NotFoundException('Pedido não encontrado');

    const lastResult = await this.prisma.diaResult.findFirst({
      where: { orderId: data.orderId },
      orderBy: { version: 'desc' },
    });
    const version = (lastResult?.version ?? 0) + 1;

    return this.prisma.diaResult.create({
      data: {
        organizationId,
        orderId: data.orderId,
        version,
        resultData: data.resultData as Prisma.InputJsonValue,
        isCritical: data.isCritical ?? false,
        createdBy: user.sub,
      },
    });
  }

  async releaseResult(
    organizationId: string,
    user: AuthenticatedUser,
    resultId: string,
  ) {
    this.assertAccess(organizationId, user);
    const result = await this.prisma.diaResult.findFirst({ where: { id: resultId, organizationId } });
    if (!result) throw new NotFoundException('Resultado não encontrado');
    const releasableStatuses: string[] = [DiaResultStatus.RASCUNHO, DiaResultStatus.REVISAO];
    if (!releasableStatuses.includes(result.status)) {
      throw new BadRequestException('Resultado não pode ser liberado neste estado');
    }
    return this.prisma.diaResult.update({
      where: { id: resultId },
      data: { status: DiaResultStatus.LIBERADO, releasedBy: user.sub, releasedAt: new Date() },
    });
  }

  async acknowledgeCritical(
    organizationId: string,
    user: AuthenticatedUser,
    resultId: string,
  ) {
    this.assertAccess(organizationId, user);
    const result = await this.prisma.diaResult.findFirst({ where: { id: resultId, organizationId } });
    if (!result) throw new NotFoundException('Resultado não encontrado');
    if (!result.isCritical) throw new BadRequestException('Resultado não é crítico');
    if (result.criticalAckedBy) throw new BadRequestException('Valor crítico já confirmado');
    return this.prisma.diaResult.update({
      where: { id: resultId },
      data: { criticalAckedBy: user.sub, criticalAckedAt: new Date() },
    });
  }

  async rectifyResult(
    organizationId: string,
    user: AuthenticatedUser,
    resultId: string,
    data: { resultData: Record<string, unknown>; rectificationNote: string },
  ) {
    this.assertAccess(organizationId, user);
    const original = await this.prisma.diaResult.findFirst({ where: { id: resultId, organizationId } });
    if (!original) throw new NotFoundException('Resultado não encontrado');
    if (original.status !== DiaResultStatus.LIBERADO) {
      throw new BadRequestException('Retificação só permitida em resultados liberados');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.diaResult.update({
        where: { id: resultId },
        data: { status: DiaResultStatus.RETIFICADO, rectifiedBy: user.sub, rectifiedAt: new Date(), rectificationNote: data.rectificationNote },
      });
      return tx.diaResult.create({
        data: {
          organizationId,
          orderId: original.orderId,
          version: original.version + 1,
          status: DiaResultStatus.LIBERADO,
          resultData: data.resultData as Prisma.InputJsonValue,
          isCritical: original.isCritical,
          releasedBy: user.sub,
          releasedAt: new Date(),
          createdBy: user.sub,
        },
      });
    });
  }

  // ── RF-DIA-009: Lista de trabalho ───────────────────────────────────────────

  async createWorkItem(
    organizationId: string,
    user: AuthenticatedUser,
    data: { orderId: string; assignedTo?: string; equipmentId?: string; priority?: string; scheduledAt?: Date },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.diaWorkItem.create({
      data: {
        organizationId,
        orderId: data.orderId,
        assignedTo: data.assignedTo,
        equipmentId: data.equipmentId,
        priority: data.priority ?? 'NORMAL',
        scheduledAt: data.scheduledAt,
      },
    });
  }

  async listWorkItems(organizationId: string, user: AuthenticatedUser, filters?: { assignedTo?: string }) {
    this.assertAccess(organizationId, user);
    return this.prisma.diaWorkItem.findMany({
      where: { organizationId, ...filters },
      orderBy: [{ priority: 'desc' }, { scheduledAt: 'asc' }],
    });
  }

  // ── RF-DIA-012: Dashboard ───────────────────────────────────────────────────

  async getDashboard(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const [totalOrders, pendingOrders, criticalUnacked, totalSamples, rejectedSamples] = await Promise.all([
      this.prisma.diaOrder.count({ where: { organizationId } }),
      this.prisma.diaOrder.count({ where: { organizationId, status: { notIn: [DiaOrderStatus.ENTREGUE, DiaOrderStatus.CANCELADO] } } }),
      this.prisma.diaResult.count({ where: { organizationId, isCritical: true, criticalAckedBy: null } }),
      this.prisma.diaSample.count({ where: { organizationId } }),
      this.prisma.diaSample.count({ where: { organizationId, status: DiaSampleStatus.REJEITADA } }),
    ]);
    return { totalOrders, pendingOrders, criticalUnacked, totalSamples, rejectedSamples };
  }
}
