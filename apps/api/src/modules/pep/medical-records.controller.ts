import { Controller, Get, Post, Param, Query, ParseUUIDPipe, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MedicalRecordsService } from './services/medical-records.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Controller({ path: 'records', version: '1' })
@UseGuards(JwtAuthGuard)
export class MedicalRecordsController {
  constructor(private readonly service: MedicalRecordsService) {}

  // RF-PEP-001: get or create longitudinal record for a patient
  @Get('patient/:patientId')
  getByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getOrCreate(patientId, organizationId, user);
  }

  @Get(':id')
  getRecord(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getRecord(id, user);
  }

  // RF-PEP-012/014: log export action
  @Post(':id/export')
  @HttpCode(HttpStatus.OK)
  logExport(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.logExport(id, user);
  }
}
