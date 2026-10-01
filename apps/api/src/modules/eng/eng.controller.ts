import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { EngService } from './services/eng.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { EngReferralStatus, EngReferralPriority, EngReviewStatus, EngCampaignType, EngSurveyStage } from '@prisma/client';

@Controller({ path: 'eng', version: '1' })
@UseGuards(JwtAuthGuard)
export class EngController {
  constructor(private readonly engService: EngService) {}

  @Post(':orgId/profile')
  upsertProfile(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser, @Body() body: { slug: string; displayName: string; description?: string; config?: Record<string, unknown> }) {
    return this.engService.upsertPublicProfile(orgId, user, body);
  }

  @Get(':orgId/profile')
  getProfile(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.engService.getPublicProfile(orgId, user);
  }

  @Post(':orgId/referrals')
  createReferral(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser, @Body() body: { patientId: string; reason: string; priority?: EngReferralPriority; destOrgId?: string; destProfId?: string; destPartnerId?: string; notes?: string }) {
    return this.engService.createReferral(orgId, user, body);
  }

  @Get(':orgId/referrals')
  listReferrals(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser, @Query() q: { patientId?: string; status?: EngReferralStatus }) {
    return this.engService.listReferrals(orgId, user, q);
  }

  @Patch(':orgId/referrals/:id/status')
  updateReferralStatus(@Param('orgId') orgId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Body() body: { status: EngReferralStatus; notes?: string }) {
    return this.engService.updateReferralStatus(orgId, user, id, body);
  }

  @Post(':orgId/reviews')
  submitReview(@Param('orgId') orgId: string, @Body() body: { patientId: string; rating: number; comment?: string; appointmentId?: string }) {
    return this.engService.submitReview(orgId, body.patientId, body);
  }

  @Get(':orgId/reviews')
  listReviews(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser, @Query() q: { status?: EngReviewStatus }) {
    return this.engService.listReviews(orgId, user, q);
  }

  @Post(':orgId/reviews/:id/approve')
  approveReview(@Param('orgId') orgId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Body() body: { responseText: string }) {
    return this.engService.approveReviewResponse(orgId, user, id, body);
  }

  @Post(':orgId/partners')
  createPartner(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser, @Body() body: { partnerName: string; partnerType: string; specialty?: string; contact?: Record<string, unknown> }) {
    return this.engService.createPartner(orgId, user, body);
  }

  @Get(':orgId/partners')
  listPartners(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.engService.listPartners(orgId, user);
  }

  @Post(':orgId/partners/:id/verify')
  verifyPartner(@Param('orgId') orgId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.engService.verifyPartner(orgId, user, id);
  }

  @Post(':orgId/campaigns')
  createCampaign(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser, @Body() body: { title: string; campaignType: EngCampaignType; content: string; scheduledAt?: Date }) {
    return this.engService.createCampaign(orgId, user, body);
  }

  @Get(':orgId/campaigns')
  listCampaigns(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser, @Query() q: { campaignType?: EngCampaignType }) {
    return this.engService.listCampaigns(orgId, user, q);
  }

  @Post(':orgId/surveys')
  createSurvey(@Param('orgId') orgId: string, @Body() body: { patientId: string; stage: EngSurveyStage; questions: unknown[]; appointmentId?: string }) {
    return this.engService.createSurvey(orgId, body.patientId, body);
  }

  @Patch(':orgId/surveys/:id/answer')
  answerSurvey(@Param('orgId') orgId: string, @Param('id') id: string, @Body() body: { answers: unknown[]; npsScore?: number }) {
    return this.engService.submitSurveyAnswers(orgId, id, body);
  }

  @Get(':orgId/dashboard')
  getDashboard(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.engService.getDashboard(orgId, user);
  }
}
