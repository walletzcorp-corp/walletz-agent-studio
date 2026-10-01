import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  NcdTemplateType,
  NcdVersionStatus,
  NcdAutomationStatus,
  Prisma,
} from '@prisma/client';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class NcdService {
  constructor(private readonly prisma: PrismaService) {}

  private assertAccess(organizationId: string, user: AuthenticatedUser) {
    if (user.isWalletzAdmin) return;
    if (!user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Acesso negado à organização');
    }
  }

  // ── RF-NCD-001/002: Templates ───────────────────────────────────────────────

  async createTemplate(
    organizationId: string,
    user: AuthenticatedUser,
    data: { name: string; templateType: NcdTemplateType; specialty?: string; description?: string; isLibraryModel?: boolean },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.ncdTemplate.create({
      data: {
        organizationId,
        name: data.name,
        templateType: data.templateType,
        specialty: data.specialty,
        description: data.description,
        isLibraryModel: data.isLibraryModel ?? false,
        createdBy: user.sub,
      },
    });
  }

  async listTemplates(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: { templateType?: NcdTemplateType; specialty?: string },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.ncdTemplate.findMany({
      where: { organizationId, ...filters },
      include: { _count: { select: { versions: true } } },
      orderBy: { name: 'asc' },
    });
  }

  // ── RF-NCD-003: Versionamento ───────────────────────────────────────────────

  async createVersion(
    organizationId: string,
    user: AuthenticatedUser,
    data: {
      templateId: string;
      schema: Record<string, unknown>;
      rules?: unknown[];
      allowedRoles?: string[];
      changeNotes?: string;
    },
  ) {
    this.assertAccess(organizationId, user);
    const template = await this.prisma.ncdTemplate.findFirst({ where: { id: data.templateId, organizationId } });
    if (!template) throw new NotFoundException('Template não encontrado');

    const lastVersion = await this.prisma.ncdVersion.findFirst({
      where: { templateId: data.templateId },
      orderBy: { versionNumber: 'desc' },
    });
    const versionNumber = (lastVersion?.versionNumber ?? 0) + 1;

    return this.prisma.ncdVersion.create({
      data: {
        organizationId,
        templateId: data.templateId,
        versionNumber,
        schema: data.schema as Prisma.InputJsonValue,
        rules: (data.rules ?? []) as Prisma.InputJsonValue,
        allowedRoles: (data.allowedRoles ?? []) as Prisma.InputJsonValue,
        changeNotes: data.changeNotes,
        createdBy: user.sub,
      },
    });
  }

  async approveVersion(
    organizationId: string,
    user: AuthenticatedUser,
    versionId: string,
  ) {
    this.assertAccess(organizationId, user);
    const version = await this.prisma.ncdVersion.findFirst({ where: { id: versionId, organizationId } });
    if (!version) throw new NotFoundException('Versão não encontrada');
    if (version.status !== NcdVersionStatus.AGUARDANDO_APROVACAO) {
      throw new BadRequestException('Versão não está aguardando aprovação');
    }
    return this.prisma.ncdVersion.update({
      where: { id: versionId },
      data: { status: NcdVersionStatus.AGUARDANDO_APROVACAO, approvedBy: user.sub, approvedAt: new Date() },
    });
  }

  async publishVersion(
    organizationId: string,
    user: AuthenticatedUser,
    versionId: string,
  ) {
    this.assertAccess(organizationId, user);
    const version = await this.prisma.ncdVersion.findFirst({ where: { id: versionId, organizationId } });
    if (!version) throw new NotFoundException('Versão não encontrada');

    const publishableStatuses: string[] = [NcdVersionStatus.RASCUNHO, NcdVersionStatus.AGUARDANDO_APROVACAO];
    if (!publishableStatuses.includes(version.status)) {
      throw new BadRequestException('Versão não pode ser publicada neste estado');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.ncdVersion.updateMany({
        where: { templateId: version.templateId, status: NcdVersionStatus.PUBLICADO },
        data: { status: NcdVersionStatus.RETIRADO, retiredAt: new Date(), retiredBy: user.sub },
      });
      const published = await tx.ncdVersion.update({
        where: { id: versionId },
        data: { status: NcdVersionStatus.PUBLICADO, publishedAt: new Date(), approvedBy: version.approvedBy ?? user.sub, approvedAt: version.approvedAt ?? new Date() },
      });
      await tx.ncdTemplate.update({ where: { id: version.templateId }, data: { currentVersionId: versionId } });
      return published;
    });
  }

  async retireVersion(
    organizationId: string,
    user: AuthenticatedUser,
    versionId: string,
  ) {
    this.assertAccess(organizationId, user);
    const version = await this.prisma.ncdVersion.findFirst({ where: { id: versionId, organizationId } });
    if (!version) throw new NotFoundException('Versão não encontrada');
    if (version.status !== NcdVersionStatus.PUBLICADO) {
      throw new BadRequestException('Apenas versões publicadas podem ser retiradas');
    }
    return this.prisma.ncdVersion.update({
      where: { id: versionId },
      data: { status: NcdVersionStatus.RETIRADO, retiredAt: new Date(), retiredBy: user.sub },
    });
  }

  // ── RF-NCD-004: Simulação ───────────────────────────────────────────────────

  async runSimulation(
    organizationId: string,
    user: AuthenticatedUser,
    data: { versionId: string; inputData: Record<string, unknown> },
  ) {
    this.assertAccess(organizationId, user);
    const version = await this.prisma.ncdVersion.findFirst({ where: { id: data.versionId, organizationId } });
    if (!version) throw new NotFoundException('Versão não encontrada');

    // Simulate: validate required fields from schema
    const schema = version.schema as Record<string, unknown>;
    const fields = (schema.fields as Array<{ name: string; required?: boolean }>) ?? [];
    const missingFields = fields.filter((f) => f.required && !(f.name in data.inputData));
    const passed = missingFields.length === 0;
    const outputData = passed ? { validated: true, fieldsChecked: fields.length } : { validated: false, missingFields: missingFields.map((f) => f.name) };

    return this.prisma.ncdSimulation.create({
      data: {
        organizationId,
        versionId: data.versionId,
        inputData: data.inputData as Prisma.InputJsonValue,
        outputData: outputData as Prisma.InputJsonValue,
        passed,
        runBy: user.sub,
      },
    });
  }

  // ── RF-NCD-006: Automações ──────────────────────────────────────────────────

  async createAutomation(
    organizationId: string,
    user: AuthenticatedUser,
    data: {
      name: string;
      triggerEvent: string;
      conditions?: unknown[];
      actions?: unknown[];
      maxExecutions?: number;
      templateId?: string;
    },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.ncdAutomation.create({
      data: {
        organizationId,
        name: data.name,
        triggerEvent: data.triggerEvent,
        conditions: (data.conditions ?? []) as Prisma.InputJsonValue,
        actions: (data.actions ?? []) as Prisma.InputJsonValue,
        maxExecutions: data.maxExecutions,
        templateId: data.templateId,
        createdBy: user.sub,
      },
    });
  }

  async updateAutomationStatus(
    organizationId: string,
    user: AuthenticatedUser,
    automationId: string,
    data: { status: NcdAutomationStatus },
  ) {
    this.assertAccess(organizationId, user);
    const automation = await this.prisma.ncdAutomation.findFirst({ where: { id: automationId, organizationId } });
    if (!automation) throw new NotFoundException('Automação não encontrada');
    return this.prisma.ncdAutomation.update({
      where: { id: automationId },
      data: { status: data.status },
    });
  }

  async listAutomations(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    return this.prisma.ncdAutomation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── RF-NCD-009: Dashboard ───────────────────────────────────────────────────

  async getDashboard(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const [totalTemplates, publishedVersions, activeAutomations, totalSimulations] = await Promise.all([
      this.prisma.ncdTemplate.count({ where: { organizationId } }),
      this.prisma.ncdVersion.count({ where: { organizationId, status: NcdVersionStatus.PUBLICADO } }),
      this.prisma.ncdAutomation.count({ where: { organizationId, status: NcdAutomationStatus.ATIVO } }),
      this.prisma.ncdSimulation.count({ where: { organizationId } }),
    ]);
    return { totalTemplates, publishedVersions, activeAutomations, totalSimulations };
  }
}
