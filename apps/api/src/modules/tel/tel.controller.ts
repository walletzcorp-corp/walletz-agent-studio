import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TelService } from './services/tel.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { TelRoomStatus, TelParticipantRole } from '@prisma/client';

@Controller({ path: 'tel', version: '1' })
@UseGuards(JwtAuthGuard)
export class TelController {
  constructor(private readonly telService: TelService) {}

  // RF-TEL-001: criar sala
  @Post(':orgId/rooms')
  createRoom(
    @Param('orgId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: {
      appointmentId: string;
      scheduledAt: string;
      participantUserId?: string;
      participantDisplayName?: string;
      patientId?: string;
      patientDisplayName?: string;
    },
  ) {
    return this.telService.createRoom(orgId, user, {
      ...body,
      scheduledAt: new Date(body.scheduledAt),
    });
  }

  // RF-TEL-002: listar salas
  @Get(':orgId/rooms')
  listRooms(
    @Param('orgId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() q: { status?: TelRoomStatus },
  ) {
    return this.telService.listRooms(orgId, user, q);
  }

  // RF-TEL-002: obter sala
  @Get(':orgId/rooms/:roomId')
  getRoom(
    @Param('orgId') orgId: string,
    @Param('roomId') roomId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.telService.getRoom(orgId, roomId, user);
  }

  // RF-TEL-003: iniciar sala
  @Patch(':orgId/rooms/:roomId/start')
  startRoom(
    @Param('orgId') orgId: string,
    @Param('roomId') roomId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.telService.startRoom(orgId, roomId, user);
  }

  // RF-TEL-004: encerrar sala
  @Patch(':orgId/rooms/:roomId/end')
  endRoom(
    @Param('orgId') orgId: string,
    @Param('roomId') roomId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.telService.endRoom(orgId, roomId, user);
  }

  // RF-TEL-005: cancelar sala
  @Patch(':orgId/rooms/:roomId/cancel')
  cancelRoom(
    @Param('orgId') orgId: string,
    @Param('roomId') roomId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { reason: string },
  ) {
    return this.telService.cancelRoom(orgId, roomId, user, body.reason);
  }

  // RF-TEL-006: admitir participante
  @Patch(':orgId/rooms/:roomId/participants/:participantId/admit')
  admitParticipant(
    @Param('orgId') orgId: string,
    @Param('roomId') roomId: string,
    @Param('participantId') participantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.telService.admitParticipant(orgId, roomId, participantId, user);
  }

  // RF-TEL-007: registrar entrada
  @Patch(':orgId/rooms/:roomId/participants/:participantId/join')
  participantJoined(
    @Param('roomId') roomId: string,
    @Param('participantId') participantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { actorRole: TelParticipantRole },
  ) {
    return this.telService.participantJoined(roomId, participantId, user.sub, body.actorRole);
  }

  // RF-TEL-008: reconexão
  @Patch(':orgId/rooms/:roomId/participants/:participantId/reconnect')
  participantReconnected(
    @Param('roomId') roomId: string,
    @Param('participantId') participantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { actorRole: TelParticipantRole },
  ) {
    return this.telService.participantReconnected(roomId, participantId, user.sub, body.actorRole);
  }

  // RF-TEL-009: revogar link
  @Patch(':orgId/rooms/:roomId/links/:linkId/revoke')
  revokeLink(
    @Param('orgId') orgId: string,
    @Param('roomId') roomId: string,
    @Param('linkId') linkId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.telService.revokeAccessLink(orgId, roomId, linkId, user);
  }

  // RF-TEL-010: compartilhar documento
  @Post(':orgId/rooms/:roomId/documents')
  shareDocument(
    @Param('orgId') orgId: string,
    @Param('roomId') roomId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { filename: string; mimeType: string; sizeBytes: number; storagePath: string },
  ) {
    return this.telService.shareDocument(orgId, roomId, user, body);
  }

  // RF-TEL-011: confirmar documento
  @Patch(':orgId/rooms/:roomId/documents/:docId/confirm')
  confirmDocument(
    @Param('orgId') orgId: string,
    @Param('roomId') roomId: string,
    @Param('docId') docId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.telService.confirmDocument(orgId, roomId, docId, user);
  }

  // RF-TEL-012: vincular evolução clínica
  @Patch(':orgId/rooms/:roomId/clinical-entry')
  linkClinicalEntry(
    @Param('orgId') orgId: string,
    @Param('roomId') roomId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { clinicalEntryId: string },
  ) {
    return this.telService.linkClinicalEntry(orgId, roomId, body.clinicalEntryId, user);
  }

  // RF-TEL-013: habilitar gravação
  @Patch(':orgId/rooms/:roomId/recording/enable')
  enableRecording(
    @Param('orgId') orgId: string,
    @Param('roomId') roomId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { consentConfirmed: boolean },
  ) {
    return this.telService.enableRecording(orgId, roomId, user, body.consentConfirmed);
  }

  // RF-TEL-014: dashboard
  @Get(':orgId/dashboard')
  getDashboard(
    @Param('orgId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.telService.getDashboard(orgId, user);
  }
}
