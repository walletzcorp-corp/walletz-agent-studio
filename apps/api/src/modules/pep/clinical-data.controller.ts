import { Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ClinicalDataService } from './services/clinical-data.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Controller({ path: 'records', version: '1' })
@UseGuards(JwtAuthGuard)
export class ClinicalDataController {
  constructor(private readonly service: ClinicalDataService) {}

  // ---- Allergies ----
  @Post(':recordId/allergies')
  createAllergy(@Param('recordId', ParseUUIDPipe) recordId: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createAllergy(recordId, body, user);
  }

  @Get(':recordId/allergies')
  listAllergies(@Param('recordId', ParseUUIDPipe) recordId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listAllergies(recordId, user);
  }

  @Patch('allergies/:id')
  updateAllergy(@Param('id', ParseUUIDPipe) id: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.updateAllergy(id, body, user);
  }

  // ---- Medications ----
  @Post(':recordId/medications')
  createMedication(@Param('recordId', ParseUUIDPipe) recordId: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createMedication(recordId, body, user);
  }

  @Get(':recordId/medications')
  listMedications(@Param('recordId', ParseUUIDPipe) recordId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listMedications(recordId, user);
  }

  @Patch('medications/:id')
  updateMedication(@Param('id', ParseUUIDPipe) id: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.updateMedication(id, body, user);
  }

  // ---- Diagnoses ----
  @Post(':recordId/diagnoses')
  createDiagnosis(@Param('recordId', ParseUUIDPipe) recordId: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createDiagnosis(recordId, body, user);
  }

  @Get(':recordId/diagnoses')
  listDiagnoses(@Param('recordId', ParseUUIDPipe) recordId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listDiagnoses(recordId, user);
  }

  // ---- Medical History ----
  @Post(':recordId/history')
  createHistory(@Param('recordId', ParseUUIDPipe) recordId: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createHistory(recordId, body, user);
  }

  @Get(':recordId/history')
  listHistory(@Param('recordId', ParseUUIDPipe) recordId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listHistory(recordId, user);
  }
}
