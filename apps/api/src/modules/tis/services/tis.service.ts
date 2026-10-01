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
export class TisService {
  constructor(private readonly prisma: PrismaService) {}

  private assertAccess(organizationId: string, user: AuthenticatedUser) {
    if (!user.isWalletzAdmin && !user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
  }

  // ── Operadoras ────────────────────────────────────────────────────────────

  async listCarriers(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    return this.prisma.insuranceCarrier.findMany({
      where: { organizationId, active: true },
      include: { plans: true },
      orderBy: { name: 'asc' },
    });
  }

  async createCarrier(
    organizationId: string,
    dto: { ansCode: string; name: string; tradeName?: string; cnpj?: string; phone?: string; email?: string },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const existing = await this.prisma.insuranceCarrier.findUnique({
      where: { organizationId_ansCode: { organizationId, ansCode: dto.ansCode } },
    });
    if (existing) throw new ConflictException('Operadora com este código ANS já existe');
    return this.prisma.insuranceCarrier.create({
      data: { id: randomUUID(), organizationId, ...dto },
    });
  }

  async updateCarrier(id: string, organizationId: string, dto: Partial<{ name: string; active: boolean }>, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const carrier = await this.prisma.insuranceCarrier.findFirst({ where: { id, organizationId } });
    if (!carrier) throw new NotFoundException('Operadora não encontrada');
    return this.prisma.insuranceCarrier.update({ where: { id }, data: dto });
  }

  // ── Planos ────────────────────────────────────────────────────────────────

  async createPlan(carrierId: string, organizationId: string, dto: { name: string; planCode: string; planType: string }, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const carrier = await this.prisma.insuranceCarrier.findFirst({ where: { id: carrierId, organizationId } });
    if (!carrier) throw new NotFoundException('Operadora não encontrada');
    return this.prisma.insurancePlan.create({
      data: { id: randomUUID(), carrierId, name: dto.name, planCode: dto.planCode, planType: dto.planType },
    });
  }

  // ── Contratos ─────────────────────────────────────────────────────────────

  async listContracts(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    return this.prisma.insuranceContract.findMany({
      where: { organizationId },
      include: { carrier: true, plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createContract(
    organizationId: string,
    dto: {
      carrierId: string; planId?: string; contractNumber: string; tissVersion: string;
      operatorCode: string; providerCode: string; validFrom: string; validUntil?: string;
    },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const existing = await this.prisma.insuranceContract.findUnique({
      where: { organizationId_contractNumber: { organizationId, contractNumber: dto.contractNumber } },
    });
    if (existing) throw new ConflictException('Número de contrato já existe');
    return this.prisma.insuranceContract.create({
      data: {
        id: randomUUID(), organizationId,
        carrierId: dto.carrierId, planId: dto.planId,
        contractNumber: dto.contractNumber, tissVersion: dto.tissVersion,
        operatorCode: dto.operatorCode, providerCode: dto.providerCode,
        validFrom: new Date(dto.validFrom),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
      include: { carrier: true, plan: true },
    });
  }

  // ── Tabela TUSS ───────────────────────────────────────────────────────────

  async listTussCodes(organizationId: string, user: AuthenticatedUser, search?: string) {
    this.assertAccess(organizationId, user);
    const where: Record<string, unknown> = { organizationId, active: true };
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.tussCode.findMany({
      where,
      orderBy: { code: 'asc' },
      take: 100,
    });
  }

  async upsertTussCode(
    organizationId: string,
    dto: { code: string; description: string; tableCode: string; version: string; validFrom: string; validUntil?: string; unitValue?: number },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const existing = await this.prisma.tussCode.findUnique({
      where: { organizationId_code_version: { organizationId, code: dto.code, version: dto.version } },
    });
    const data = {
      description: dto.description, tableCode: dto.tableCode,
      validFrom: new Date(dto.validFrom),
      validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      unitValue: dto.unitValue != null ? new Decimal(dto.unitValue) : undefined,
    };
    if (existing) {
      return this.prisma.tussCode.update({ where: { id: existing.id }, data });
    }
    return this.prisma.tussCode.create({
      data: { id: randomUUID(), organizationId, code: dto.code, version: dto.version, ...data },
    });
  }

  // ── Guias ─────────────────────────────────────────────────────────────────

  async listGuides(organizationId: string, user: AuthenticatedUser, filters?: { contractId?: string; status?: string; from?: string; to?: string }) {
    this.assertAccess(organizationId, user);
    const where: Record<string, unknown> = { organizationId };
    if (filters?.contractId) where.contractId = filters.contractId;
    if (filters?.status) where.status = filters.status;
    if (filters?.from || filters?.to) {
      where.serviceDate = {
        ...(filters.from ? { gte: new Date(filters.from) } : {}),
        ...(filters.to ? { lte: new Date(filters.to) } : {}),
      };
    }
    return this.prisma.insuranceGuide.findMany({
      where,
      include: { contract: { include: { carrier: true } }, items: true },
      orderBy: { serviceDate: 'desc' },
      take: 200,
    });
  }

  async createGuide(
    organizationId: string,
    dto: {
      contractId: string; guideType: string; serviceDate: string; unitId: string;
      patientId?: string; appointmentId?: string; professionalId?: string;
      guideNumber?: string; idempotencyKey?: string;
      items: Array<{ tussCodeId?: string; description: string; quantity: number; unitValue: number; tableCode?: string; itemCode?: string }>;
    },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    if (dto.idempotencyKey) {
      const existing = await this.prisma.insuranceGuide.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: { items: true },
      });
      if (existing) return existing;
    }
    const contract = await this.prisma.insuranceContract.findFirst({
      where: { id: dto.contractId, organizationId, active: true },
    });
    if (!contract) throw new NotFoundException('Contrato não encontrado ou inativo');

    return this.prisma.$transaction(async (tx) => {
      const guide = await tx.insuranceGuide.create({
        data: {
          id: randomUUID(), organizationId, contractId: dto.contractId,
          guideType: dto.guideType as any, unitId: dto.unitId,
          serviceDate: new Date(dto.serviceDate),
          patientId: dto.patientId, appointmentId: dto.appointmentId, professionalId: dto.professionalId,
          guideNumber: dto.guideNumber, idempotencyKey: dto.idempotencyKey,
          createdBy: user.sub,
        },
      });
      for (const item of dto.items) {
        const qty = new Decimal(item.quantity);
        const uv = new Decimal(item.unitValue);
        await tx.insuranceGuideItem.create({
          data: {
            id: randomUUID(), guideId: guide.id, tussCodeId: item.tussCodeId,
            description: item.description, quantity: qty, unitValue: uv,
            totalValue: qty.times(uv), tableCode: item.tableCode, itemCode: item.itemCode,
          },
        });
      }
      return tx.insuranceGuide.findUnique({
        where: { id: guide.id },
        include: { items: true, contract: { include: { carrier: true } } },
      });
    });
  }

  async validateGuide(id: string, organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const guide = await this.prisma.insuranceGuide.findFirst({
      where: { id, organizationId },
      include: { items: true, contract: true },
    });
    if (!guide) throw new NotFoundException('Guia não encontrada');
    const errors: string[] = [];
    if (!guide.contract.active) errors.push('Contrato inativo');
    if (guide.items.length === 0) errors.push('Guia sem itens');
    if (!guide.patientId) errors.push('Paciente não informado');
    if (guide.items.some((i) => i.unitValue.lte(0))) errors.push('Item com valor zero ou negativo');
    const validationErrors = errors.length > 0 ? errors : null;
    return this.prisma.insuranceGuide.update({
      where: { id },
      data: { validationErrors: validationErrors as any },
      include: { items: true },
    });
  }

  async updateGuideStatus(
    id: string, organizationId: string,
    dto: { status: string; authorizationNumber?: string },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const guide = await this.prisma.insuranceGuide.findFirst({ where: { id, organizationId } });
    if (!guide) throw new NotFoundException('Guia não encontrada');
    if (guide.status === 'CANCELADO') throw new BadRequestException('Guia cancelada não pode ser alterada');
    return this.prisma.insuranceGuide.update({
      where: { id },
      data: { status: dto.status as any, authorizationNumber: dto.authorizationNumber },
    });
  }

  // ── Lotes ─────────────────────────────────────────────────────────────────

  async listLots(organizationId: string, user: AuthenticatedUser, filters?: { contractId?: string; status?: string }) {
    this.assertAccess(organizationId, user);
    const where: Record<string, unknown> = { organizationId };
    if (filters?.contractId) where.contractId = filters.contractId;
    if (filters?.status) where.status = filters.status;
    return this.prisma.insuranceLot.findMany({
      where,
      include: { contract: { include: { carrier: true } }, items: { include: { guide: true } } },
      orderBy: [{ competenceYear: 'desc' }, { competenceMonth: 'desc' }],
    });
  }

  async createLot(
    organizationId: string,
    dto: { contractId: string; competenceMonth: number; competenceYear: number; guideIds: string[] },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const contract = await this.prisma.insuranceContract.findFirst({
      where: { id: dto.contractId, organizationId },
    });
    if (!contract) throw new NotFoundException('Contrato não encontrado');
    if (dto.guideIds.length === 0) throw new BadRequestException('Lote deve ter ao menos uma guia');

    return this.prisma.$transaction(async (tx) => {
      const lotNumber = `LOT-${dto.competenceYear}${String(dto.competenceMonth).padStart(2, '0')}-${randomUUID().substring(0, 8).toUpperCase()}`;
      let totalValue = new Decimal(0);
      const guides = await tx.insuranceGuide.findMany({
        where: { id: { in: dto.guideIds }, organizationId },
        include: { items: true },
      });
      if (guides.length !== dto.guideIds.length) throw new NotFoundException('Uma ou mais guias não encontradas');
      for (const g of guides) {
        for (const item of g.items) totalValue = totalValue.plus(item.totalValue);
      }
      const lot = await tx.insuranceLot.create({
        data: {
          id: randomUUID(), organizationId, contractId: dto.contractId, lotNumber,
          competenceMonth: dto.competenceMonth, competenceYear: dto.competenceYear,
          totalValue, createdBy: user.sub,
        },
      });
      for (const guide of guides) {
        const guideTotal = guide.items.reduce((s, i) => s.plus(i.totalValue), new Decimal(0));
        await tx.insuranceLotItem.create({
          data: { id: randomUUID(), lotId: lot.id, guideId: guide.id, value: guideTotal },
        });
        await tx.insuranceGuide.update({ where: { id: guide.id }, data: { status: 'ENVIADO' } });
      }
      return tx.insuranceLot.findUnique({
        where: { id: lot.id },
        include: { items: { include: { guide: true } } },
      });
    });
  }

  async closeLot(id: string, organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const lot = await this.prisma.insuranceLot.findFirst({ where: { id, organizationId } });
    if (!lot) throw new NotFoundException('Lote não encontrado');
    if (lot.status !== 'ABERTO') throw new BadRequestException('Apenas lotes ABERTOS podem ser fechados');
    return this.prisma.insuranceLot.update({ where: { id }, data: { status: 'FECHADO' } });
  }

  async exportLotXml(id: string, organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const lot = await this.prisma.insuranceLot.findFirst({
      where: { id, organizationId },
      include: { contract: { include: { carrier: true } }, items: { include: { guide: { include: { items: true } } } } },
    });
    if (!lot) throw new NotFoundException('Lote não encontrado');
    if (lot.status !== 'FECHADO') throw new BadRequestException('Exporte somente lotes com status FECHADO');

    // NOTE: XML gerado em modo SIMULAÇÃO — sem transmissão real para operadora.
    // Versão TISS aplicável: conforme contrato.tissVersion registrado.
    // Integração real requer credencial, endpoint e homologação ANS.
    const xml = this._buildTissXml(lot);
    await this.prisma.insuranceLot.update({ where: { id }, data: { xmlPayload: xml, status: 'ENVIADO', sentAt: new Date() } });
    return { xml, note: 'XML gerado em modo simulação. Transmissão real requer configuração de credencial e endpoint de operadora.' };
  }

  private _buildTissXml(lot: any): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!-- TISS v${lot.contract.tissVersion} | SIMULAÇÃO — NÃO TRANSMITIR SEM CONFIGURAÇÃO DE OPERADORA -->
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
      <ans:sequencialTransacao>${lot.lotNumber}</ans:sequencialTransacao>
      <ans:dataRegistroTransacao>${new Date().toISOString().substring(0, 10)}</ans:dataRegistroTransacao>
    </ans:identificacaoTransacao>
    <ans:origem>
      <ans:identificacaoOperadora><ans:registro ANS="${lot.contract.carrier.ansCode}"/></ans:identificacaoOperadora>
      <ans:identificacaoPrestador><ans:codigoPrestadorNaOperadora>${lot.contract.providerCode}</ans:codigoPrestadorNaOperadora></ans:identificacaoPrestador>
    </ans:origem>
    <ans:destino>
      <ans:identificacaoOperadora><ans:registro ANS="${lot.contract.carrier.ansCode}"/></ans:identificacaoOperadora>
    </ans:destino>
    <ans:versaoPadrao>${lot.contract.tissVersion}</ans:versaoPadrao>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:loteGuias>
      <ans:numeroLote>${lot.lotNumber}</ans:numeroLote>
${lot.items.map((li: any) => `      <ans:guiaServico>
        <ans:guiaSP-SADT>
          <ans:numeroGuiaPrestador>${li.guide.guideNumber ?? li.guide.id}</ans:numeroGuiaPrestador>
          <ans:dataAutorizacao>${li.guide.serviceDate?.toISOString().substring(0, 10) ?? ''}</ans:dataAutorizacao>
${li.guide.items.map((gi: any) => `          <ans:procedimentosExecutados>
            <ans:procedimentoExecutado>
              <ans:sequencialItem>1</ans:sequencialItem>
              <ans:codigoProcedimento>${gi.itemCode ?? gi.description}</ans:codigoProcedimento>
              <ans:descricaoProcedimento>${gi.description}</ans:descricaoProcedimento>
              <ans:quantidadeExecutada>${Number(gi.quantity)}</ans:quantidadeExecutada>
              <ans:valorUnitario>${Number(gi.unitValue).toFixed(2)}</ans:valorUnitario>
            </ans:procedimentoExecutado>
          </ans:procedimentosExecutados>`).join('\n')}
        </ans:guiaSP-SADT>
      </ans:guiaServico>`).join('\n')}
    </ans:loteGuias>
  </ans:prestadorParaOperadora>
</ans:mensagemTISS>`;
  }

  // ── Glosas ────────────────────────────────────────────────────────────────

  async listClaims(organizationId: string, user: AuthenticatedUser, filters?: { guideId?: string; status?: string }) {
    this.assertAccess(organizationId, user);
    const where: Record<string, unknown> = { organizationId };
    if (filters?.guideId) where.guideId = filters.guideId;
    if (filters?.status) where.status = filters.status;
    return this.prisma.insuranceClaim.findMany({
      where,
      include: { guide: { include: { contract: { include: { carrier: true } } } }, appeals: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createClaim(
    organizationId: string,
    dto: { guideId: string; itemDescription: string; claimReason: string; claimCode?: string; glosedValue: number; responsibleParty: string; dueDate?: string; notes?: string },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const guide = await this.prisma.insuranceGuide.findFirst({ where: { id: dto.guideId, organizationId } });
    if (!guide) throw new NotFoundException('Guia não encontrada');
    if (guide.status === 'CANCELADO') throw new BadRequestException('Não é possível glosar guia cancelada');
    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.insuranceClaim.create({
        data: {
          id: randomUUID(), organizationId, guideId: dto.guideId,
          itemDescription: dto.itemDescription, claimReason: dto.claimReason,
          claimCode: dto.claimCode, glosedValue: new Decimal(dto.glosedValue),
          responsibleParty: dto.responsibleParty,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          notes: dto.notes,
        },
      });
      await tx.insuranceGuide.update({ where: { id: dto.guideId }, data: { status: 'GLOSADO' } });
      return claim;
    });
  }

  async createAppeal(
    claimId: string, organizationId: string,
    dto: { appealText: string; documentRef?: string },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const claim = await this.prisma.insuranceClaim.findFirst({
      where: { id: claimId, organizationId },
    });
    if (!claim) throw new NotFoundException('Glosa não encontrada');
    if (['ACEITA', 'NEGADA'].includes(claim.status)) {
      throw new BadRequestException('Glosa já resolvida');
    }
    return this.prisma.$transaction(async (tx) => {
      const appeal = await tx.insuranceClaimAppeal.create({
        data: {
          id: randomUUID(), claimId, appealText: dto.appealText,
          documentRef: dto.documentRef, submittedBy: user.sub,
        },
      });
      await tx.insuranceClaim.update({ where: { id: claimId }, data: { status: 'RECURSO' } });
      return appeal;
    });
  }

  // ── Indicadores ───────────────────────────────────────────────────────────

  async getIndicators(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const [guides, claims, lots] = await Promise.all([
      this.prisma.insuranceGuide.findMany({
        where: { organizationId, status: { not: 'CANCELADO' } },
        include: { items: true, contract: { include: { carrier: true } } },
      }),
      this.prisma.insuranceClaim.findMany({
        where: { organizationId },
        include: { guide: { include: { contract: { include: { carrier: true } } } } },
      }),
      this.prisma.insuranceLot.findMany({ where: { organizationId } }),
    ]);
    const totalBilled = guides.reduce((s, g) => s.plus(g.items.reduce((si, i) => si.plus(i.totalValue), new Decimal(0))), new Decimal(0));
    const totalGlosed = claims.reduce((s, c) => s.plus(c.glosedValue), new Decimal(0));
    const glosaRate = totalBilled.gt(0) ? totalGlosed.div(totalBilled).times(100) : new Decimal(0);
    const byCarrier = new Map<string, { name: string; billed: Decimal; glosas: Decimal }>();
    for (const g of guides) {
      const key = g.contract.carrier.id;
      const prev = byCarrier.get(key) ?? { name: g.contract.carrier.name, billed: new Decimal(0), glosas: new Decimal(0) };
      prev.billed = prev.billed.plus(g.items.reduce((s, i) => s.plus(i.totalValue), new Decimal(0)));
      byCarrier.set(key, prev);
    }
    for (const c of claims) {
      const key = c.guide.contract.carrier.id;
      const prev = byCarrier.get(key) ?? { name: c.guide.contract.carrier.name, billed: new Decimal(0), glosas: new Decimal(0) };
      prev.glosas = prev.glosas.plus(c.glosedValue);
      byCarrier.set(key, prev);
    }
    return {
      totalGuides: guides.length, totalBilled, totalGlosed, glosaRate,
      openClaims: claims.filter((c) => !['ACEITA', 'NEGADA'].includes(c.status)).length,
      byCarrier: Array.from(byCarrier.entries()).map(([id, v]) => ({ carrierId: id, ...v })),
    };
  }
}
