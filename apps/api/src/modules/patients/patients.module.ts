import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { PatientsConsentsService } from './patients-consents.service';
import { PatientsAlertsService } from './patients-alerts.service';
import { PatientsContactsService } from './patients-contacts.service';
import { PatientsInsuranceService } from './patients-insurance.service';
import { PatientsDocumentsService } from './patients-documents.service';
import { PatientsLinksService } from './patients-links.service';
import { PatientsFormsService } from './patients-forms.service';

@Module({
  providers: [
    PatientsService,
    PatientsConsentsService,
    PatientsAlertsService,
    PatientsContactsService,
    PatientsInsuranceService,
    PatientsDocumentsService,
    PatientsLinksService,
    PatientsFormsService,
  ],
  controllers: [PatientsController],
  exports: [PatientsService],
})
export class PatientsModule {}
