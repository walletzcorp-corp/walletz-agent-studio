import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { UnitsModule } from './modules/units/units.module';
import { UsersModule } from './modules/users/users.module';
import { ProfessionalsModule } from './modules/professionals/professionals.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { ServicesCatalogModule } from './modules/services-catalog/services-catalog.module';
import { SpecialtiesModule } from './modules/specialties/specialties.module';
import { AuditModule } from './modules/audit/audit.module';
import { PatientsModule } from './modules/patients/patients.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { PepModule } from './modules/pep/pep.module';
import { EstoqueModule } from './modules/estoque/estoque.module';
import { FinanceiroModule } from './modules/financeiro/financeiro.module';
import { TisModule } from './modules/tis/tis.module';
import { CrmModule } from './modules/crm/crm.module';
import { IaModule } from './modules/ia/ia.module';
import { IntModule } from './modules/int/int.module';
import { SalModule } from './modules/sal/sal.module';
import { MedModule } from './modules/med/med.module';
import { QuaModule } from './modules/qua/qua.module';
import { AtiModule } from './modules/ati/ati.module';
import { EqpModule } from './modules/eqp/eqp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    UnitsModule,
    UsersModule,
    ProfessionalsModule,
    ResourcesModule,
    ServicesCatalogModule,
    SpecialtiesModule,
    AuditModule,
    PatientsModule,
    SchedulingModule,
    PepModule,
    EstoqueModule,
    FinanceiroModule,
    TisModule,
    CrmModule,
    IaModule,
    IntModule,
    SalModule,
    MedModule,
    QuaModule,
    AtiModule,
    EqpModule,
  ],
})
export class AppModule {}
