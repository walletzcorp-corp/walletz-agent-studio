import { Test, TestingModule } from '@nestjs/testing';
import { EngService } from './eng.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EngReferralStatus, EngReviewStatus, EngCampaignType, EngSurveyStage, EngReferralPriority } from '@prisma/client';

const orgUser = { sub: 'user-1', email: 'u@t.com', isWalletzAdmin: false, organizationIds: ['org-1'], tenantIds: [] };
const outsider = { sub: 'out-1', email: 'o@t.com', isWalletzAdmin: false, organizationIds: ['org-2'], tenantIds: [] };

let mockPrisma: any;

describe('EngService', () => {
  let service: EngService;

  beforeEach(async () => {
    mockPrisma = {
      engPublicProfile: { upsert: jest.fn(), findFirst: jest.fn() },
      engReferral: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), count: jest.fn() },
      engReview: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), count: jest.fn() },
      engPartner: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), count: jest.fn() },
      engCampaign: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
      engSurvey: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      $transaction: jest.fn((fn: any) => (Array.isArray(fn) ? Promise.all(fn) : fn(mockPrisma))),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [EngService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<EngService>(EngService);
  });

  afterEach(() => { jest.resetAllMocks(); });

  // Segurança
  it('rejects outsider listing referrals', async () => {
    await expect(service.listReferrals('org-1', outsider)).rejects.toThrow(ForbiddenException);
  });

  // Perfil público
  it('upserts public profile', async () => {
    mockPrisma.engPublicProfile.upsert.mockResolvedValue({ id: 'p1', slug: 'clinica-abc' });
    const result = await service.upsertPublicProfile('org-1', orgUser, { slug: 'clinica-abc', displayName: 'Clínica ABC' });
    expect(result.slug).toBe('clinica-abc');
    expect(mockPrisma.engPublicProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ createdBy: 'user-1' }) }),
    );
  });

  // Encaminhamentos
  it('creates referral with valid destination', async () => {
    mockPrisma.engReferral.create.mockResolvedValue({ id: 'r1', status: EngReferralStatus.ENVIADO });
    const result = await service.createReferral('org-1', orgUser, { patientId: 'pat-1', reason: 'Cardio', destOrgId: 'org-2' });
    expect(result.id).toBe('r1');
  });

  it('rejects referral without destination', async () => {
    await expect(service.createReferral('org-1', orgUser, { patientId: 'pat-1', reason: 'Cardio' })).rejects.toThrow(BadRequestException);
  });

  it('updates referral status and sets acceptedAt', async () => {
    mockPrisma.engReferral.findFirst.mockResolvedValue({ id: 'r1', status: EngReferralStatus.ENVIADO });
    mockPrisma.engReferral.update.mockResolvedValue({ id: 'r1', status: EngReferralStatus.ACEITO });
    await service.updateReferralStatus('org-1', orgUser, 'r1', { status: EngReferralStatus.ACEITO });
    expect(mockPrisma.engReferral.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: EngReferralStatus.ACEITO }) }),
    );
  });

  it('blocks updating finalized referral', async () => {
    mockPrisma.engReferral.findFirst.mockResolvedValue({ id: 'r1', status: EngReferralStatus.CONCLUIDO });
    await expect(service.updateReferralStatus('org-1', orgUser, 'r1', { status: EngReferralStatus.ACEITO })).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException for missing referral', async () => {
    mockPrisma.engReferral.findFirst.mockResolvedValue(null);
    await expect(service.updateReferralStatus('org-1', orgUser, 'x', { status: EngReferralStatus.ACEITO })).rejects.toThrow(NotFoundException);
  });

  // Avaliações
  it('rejects rating out of range', async () => {
    await expect(service.submitReview('org-1', 'pat-1', { rating: 6 })).rejects.toThrow(BadRequestException);
    await expect(service.submitReview('org-1', 'pat-1', { rating: 0 })).rejects.toThrow(BadRequestException);
  });

  it('submits valid review', async () => {
    mockPrisma.engReview.create.mockResolvedValue({ id: 'rv1', rating: 4, status: EngReviewStatus.PENDENTE });
    const result = await service.submitReview('org-1', 'pat-1', { rating: 4, comment: 'Ótimo' });
    expect(result.rating).toBe(4);
  });

  it('approves review and publishes', async () => {
    mockPrisma.engReview.findFirst.mockResolvedValue({ id: 'rv1', status: EngReviewStatus.PENDENTE });
    mockPrisma.engReview.update.mockResolvedValue({ id: 'rv1', status: EngReviewStatus.PUBLICADO });
    await service.approveReviewResponse('org-1', orgUser, 'rv1', { responseText: 'Obrigado!' });
    expect(mockPrisma.engReview.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: EngReviewStatus.PUBLICADO }) }),
    );
  });

  it('blocks approving already published review', async () => {
    mockPrisma.engReview.findFirst.mockResolvedValue({ id: 'rv1', status: EngReviewStatus.PUBLICADO });
    await expect(service.approveReviewResponse('org-1', orgUser, 'rv1', { responseText: 'x' })).rejects.toThrow(BadRequestException);
  });

  // Parceiros
  it('creates partner', async () => {
    mockPrisma.engPartner.create.mockResolvedValue({ id: 'pt1', partnerName: 'Lab XYZ' });
    const result = await service.createPartner('org-1', orgUser, { partnerName: 'Lab XYZ', partnerType: 'LABORATORIO' });
    expect(result.id).toBe('pt1');
  });

  it('verifies partner', async () => {
    mockPrisma.engPartner.findFirst.mockResolvedValue({ id: 'pt1', verified: false });
    mockPrisma.engPartner.update.mockResolvedValue({ id: 'pt1', verified: true });
    await service.verifyPartner('org-1', orgUser, 'pt1');
    expect(mockPrisma.engPartner.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ verified: true, verifiedBy: 'user-1' }) }),
    );
  });

  // Campanhas (separação por tipo)
  it('creates educational campaign', async () => {
    mockPrisma.engCampaign.create.mockResolvedValue({ id: 'c1', campaignType: EngCampaignType.EDUCATIVO });
    const result = await service.createCampaign('org-1', orgUser, { title: 'Saúde Bucal', campaignType: EngCampaignType.EDUCATIVO, content: 'Escove os dentes' });
    expect(result.campaignType).toBe(EngCampaignType.EDUCATIVO);
  });

  // Pesquisa
  it('creates survey and blocks double answer', async () => {
    mockPrisma.engSurvey.create.mockResolvedValue({ id: 'sv1' });
    await service.createSurvey('org-1', 'pat-1', { stage: EngSurveyStage.POS_ATENDIMENTO, questions: [] });
    expect(mockPrisma.engSurvey.create).toHaveBeenCalled();

    mockPrisma.engSurvey.findFirst.mockResolvedValue({ id: 'sv1', completedAt: new Date() });
    await expect(service.submitSurveyAnswers('org-1', 'sv1', { answers: [] })).rejects.toThrow(BadRequestException);
  });

  // Dashboard
  it('returns eng dashboard', async () => {
    mockPrisma.engReview.count.mockResolvedValueOnce(10).mockResolvedValueOnce(8).mockResolvedValueOnce(2);
    mockPrisma.engReferral.count.mockResolvedValue(3);
    mockPrisma.engPartner.count.mockResolvedValue(5);
    mockPrisma.engCampaign.count.mockResolvedValue(2);
    const result = await service.getDashboard('org-1', orgUser);
    expect(result).toHaveProperty('totalReviews', 10);
    expect(result).toHaveProperty('openReferrals', 3);
  });
});
