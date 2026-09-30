import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { MedicalRecordsService } from './services/medical-records.service';
import { ClinicalEntriesService } from './services/clinical-entries.service';
import { ClinicalDataService } from './services/clinical-data.service';
import { AttachmentsService } from './services/attachments.service';
import { SignatureService } from './services/signature.service';
import { PepTemplatesService } from './services/pep-templates.service';
import { CidService } from './services/cid.service';
import { MedicalRecordsController } from './medical-records.controller';
import { ClinicalEntriesController } from './clinical-entries.controller';
import { ClinicalDataController } from './clinical-data.controller';
import { CidController, PepTemplatesController, AttachmentsController } from './pep-misc.controller';

@Module({
  imports: [PrismaModule],
  providers: [
    MedicalRecordsService,
    ClinicalEntriesService,
    ClinicalDataService,
    AttachmentsService,
    SignatureService,
    PepTemplatesService,
    CidService,
  ],
  controllers: [
    MedicalRecordsController,
    ClinicalEntriesController,
    ClinicalDataController,
    CidController,
    PepTemplatesController,
    AttachmentsController,
  ],
  exports: [MedicalRecordsService],
})
export class PepModule {}
