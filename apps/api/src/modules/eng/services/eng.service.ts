import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  EngReferralStatus,
  EngReferralPriority,
  EngReviewStatus,
  EngCampaignType,
  EngSurveyStage,
  Prisma,
} from '@prisma/client';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class EngService {
  constructor(private readonly prisma: PrismaService) {}

  private assertAccess(organizationId: string, user: AuthenticatedUser) {
    if (user.isWalletzAdmin) return;
    if (!user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Acesso negado à organização');
    }
  }

  // ── RF-ENG-001: Perfil público ──────────────────────────────────────────────

  async upsertPublicProfile(
    organizationId: string,
    user: AuthenticatedUser,
    data: { slug: string; displayName: string; description?: string; config?: Record<string, unknown> },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.engPublicProfile.upsert({
      where: { organizationId_slug: { organizationId, slug: data.slug } },
      create: {
        organizationId,
        slug: data.slug,
        displayName: data.displayName,
        description: data.description,
        config: (data.config ?? {}) as Prisma.InputJsonValue,
        createdBy: user.sub,
      },
      update: {
        displayName: data.displayName,
        description: data.description,
        config: (data.config ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async getPublicProfile(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    return this.prisma.engPublicProfile.findFirst({ where: { organizationId, active: true } });
  }

  // ── RF-ENG-006/007: Encaminhamentos ────────────────────────────────────────

  async createReferral(
    organizationId: string,
    user: AuthenticatedUser,
    data: {
      patientId: string;
      reason: string;
      priority?: EngReferralPriority;
      destOrgId?: string;
      destProfId?: string;
      destPartnerId?: string;
      notes?: string;
    },
  ) {
    this.assertAccess(organizationId, user);
    if (!data.destOrgId && !data.destProfId && !data.destPartnerId) {
      throw new BadRequestException('Informe destino: destOrgId, destProfId ou destPartnerId');
    }
    return this.prisma.engReferral.create({
      data: {
        organizationId,
        patientId: data.patientId,
        originProfId: user.sub,
        reason: data.reason,
        priority: data.priority ?? EngReferralPriority.ELETIVA,
        destOrgId: data.destOrgId,
        destProfId: data.destProfId,
        destPartnerId: data.destPartnerId,
        notes: data.notes,
        createdBy: user.sub,
      },
    });
  }

  async listReferrals(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: { patientId?: string; status?: EngReferralStatus },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.engReferral.findMany({
      where: { organizationId, ...filters },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateReferralStatus(
    organizationId: string,
    user: AuthenticatedUser,
    referralId: string,
    data: { status: EngReferralStatus; notes?: string },
  ) {
    this.assertAccess(organizationId, user);
    const referral = await this.prisma.engReferral.findFirst({ where: { id: referralId, organizationId } });
    if (!referral) throw new NotFoundException('Encaminhamento não encontrado');

    const finalStatuses: string[] = [EngReferralStatus.CONCLUIDO, EngReferralStatus.CANCELADO, EngReferralStatus.REJEITADO];
    if (finalStatuses.includes(referral.status)) {
      throw new BadRequestException('Encaminhamento já finalizado');
    }

    const timestamps: Record<string, unknown> = {};
    if (data.status === EngReferralStatus.ACEITO) timestamps.acceptedAt = new Date();
    if (data.status === EngReferralStatus.EM_ATENDIMENTO) timestamps.attendedAt = new Date();
    if (finalStatuses.includes(data.status)) timestamps.closedAt = new Date();

    return this.prisma.engReferral.update({
      where: { id: referralId },
      data: { status: data.status, notes: data.notes, ...timestamps },
    });
  }

  // ── RF-ENG-003: Avaliações ──────────────────────────────────────────────────

  async submitReview(
    organizationId: string,
    patientId: string,
    data: { rating: number; comment?: string; appointmentId?: string },
  ) {
    if (data.rating < 1 || data.rating > 5) {
      throw new BadRequestException('Avaliação deve ser entre 1 e 5');
    }
    return this.prisma.engReview.create({
      data: {
        organizationId,
        patientId,
        appointmentId: data.appointmentId,
        rating: data.rating,
        comment: data.comment,
      },
    });
  }

  async listReviews(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: { status?: EngReviewStatus },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.engReview.findMany({
      where: { organizationId, ...filters },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveReviewResponse(
    organizationId: string,
    user: AuthenticatedUser,
    reviewId: string,
    data: { responseText: string },
  ) {
    this.assertAccess(organizationId, user);
    const review = await this.prisma.engReview.findFirst({ where: { id: reviewId, organizationId } });
    if (!review) throw new NotFoundException('Avaliação não encontrada');
    if (review.status === EngReviewStatus.PUBLICADO) {
      throw new BadRequestException('Avaliação já está publicada');
    }
    return this.prisma.engReview.update({
      where: { id: reviewId },
      data: {
        responseText: data.responseText,
        respondedBy: user.sub,
        respondedAt: new Date(),
        approvedBy: user.sub,
        approvedAt: new Date(),
        status: EngReviewStatus.PUBLICADO,
      },
    });
  }

  // ── RF-ENG-008: Diretório de parceiros ─────────────────────────────────────

  async createPartner(
    organizationId: string,
    user: AuthenticatedUser,
    data: { partnerName: string; partnerType: string; specialty?: string; contact?: Record<string, unknown> },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.engPartner.create({
      data: {
        organizationId,
        partnerName: data.partnerName,
        partnerType: data.partnerType,
        specialty: data.specialty,
        contact: (data.contact ?? {}) as Prisma.InputJsonValue,
        createdBy: user.sub,
      },
    });
  }

  async listPartners(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    return this.prisma.engPartner.findMany({
      where: { organizationId, active: true },
      orderBy: { partnerName: 'asc' },
    });
  }

  async verifyPartner(organizationId: string, user: AuthenticatedUser, partnerId: string) {
    this.assertAccess(organizationId, user);
    const partner = await this.prisma.engPartner.findFirst({ where: { id: partnerId, organizationId } });
    if (!partner) throw new NotFoundException('Parceiro não encontrado');
    return this.prisma.engPartner.update({
      where: { id: partnerId },
      data: { verified: true, verifiedBy: user.sub, verifiedAt: new Date() },
    });
  }

  // ── RF-ENG-009: Campanhas ───────────────────────────────────────────────────

  async createCampaign(
    organizationId: string,
    user: AuthenticatedUser,
    data: { title: string; campaignType: EngCampaignType; content: string; scheduledAt?: Date },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.engCampaign.create({
      data: {
        organizationId,
        title: data.title,
        campaignType: data.campaignType,
        content: data.content,
        scheduledAt: data.scheduledAt,
        createdBy: user.sub,
      },
    });
  }

  async listCampaigns(organizationId: string, user: AuthenticatedUser, filters?: { campaignType?: EngCampaignType }) {
    this.assertAccess(organizationId, user);
    return this.prisma.engCampaign.findMany({
      where: { organizationId, ...filters },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── RF-ENG-010: Pesquisa de experiência ────────────────────────────────────

  async createSurvey(
    organizationId: string,
    patientId: string,
    data: { stage: EngSurveyStage; questions: unknown[]; appointmentId?: string },
  ) {
    return this.prisma.engSurvey.create({
      data: {
        organizationId,
        patientId,
        appointmentId: data.appointmentId,
        stage: data.stage,
        questions: data.questions as Prisma.InputJsonValue,
      },
    });
  }

  async submitSurveyAnswers(
    organizationId: string,
    surveyId: string,
    data: { answers: unknown[]; npsScore?: number },
  ) {
    const survey = await this.prisma.engSurvey.findFirst({ where: { id: surveyId, organizationId } });
    if (!survey) throw new NotFoundException('Pesquisa não encontrada');
    if (survey.completedAt) throw new BadRequestException('Pesquisa já respondida');
    return this.prisma.engSurvey.update({
      where: { id: surveyId },
      data: { answers: data.answers as Prisma.InputJsonValue, npsScore: data.npsScore, completedAt: new Date() },
    });
  }

  // ── RF-ENG-004: Dashboard de reputação ─────────────────────────────────────

  async getDashboard(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const [totalReviews, publishedReviews, pendingReviews, openReferrals, totalPartners, totalCampaigns] =
      await Promise.all([
        this.prisma.engReview.count({ where: { organizationId } }),
        this.prisma.engReview.count({ where: { organizationId, status: EngReviewStatus.PUBLICADO } }),
        this.prisma.engReview.count({ where: { organizationId, status: EngReviewStatus.PENDENTE } }),
        this.prisma.engReferral.count({ where: { organizationId, status: { notIn: [EngReferralStatus.CONCLUIDO, EngReferralStatus.CANCELADO] } } }),
        this.prisma.engPartner.count({ where: { organizationId, active: true } }),
        this.prisma.engCampaign.count({ where: { organizationId, active: true } }),
      ]);
    return { totalReviews, publishedReviews, pendingReviews, openReferrals, totalPartners, totalCampaigns };
  }
}
