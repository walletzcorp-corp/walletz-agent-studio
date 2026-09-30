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
  ],
})
export class AppModule {}
