/**
 * Seed de desenvolvimento — dados SINTÉTICOS apenas
 * Nunca usar dados reais de pacientes ou usuários reais
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed com dados sintéticos...');

  // ---- Perfis do sistema ----
  const profiles = [
    { name: 'WALLETZ_ADMIN', displayName: 'Administrador Walletz', isSystem: true },
    { name: 'ORG_ADMIN', displayName: 'Administrador da Organização', isSystem: true },
    { name: 'UNIT_MANAGER', displayName: 'Gestor de Unidade', isSystem: true },
    { name: 'TECHNICAL_DIRECTOR', displayName: 'Responsável Técnico', isSystem: true },
    { name: 'PROFESSIONAL', displayName: 'Profissional', isSystem: true },
    { name: 'RECEPTIONIST', displayName: 'Recepção', isSystem: true },
    { name: 'FINANCIAL', displayName: 'Financeiro', isSystem: true },
    { name: 'STOCK', displayName: 'Estoque', isSystem: true },
    { name: 'AUDITOR', displayName: 'Auditor/Qualidade', isSystem: true },
    { name: 'TEMP_SUPPORT', displayName: 'Suporte Temporário', isSystem: true },
  ];

  for (const p of profiles) {
    await prisma.profile.upsert({
      where: { name: p.name },
      update: { displayName: p.displayName },
      create: { id: randomUUID(), ...p },
    });
  }
  console.log(`${profiles.length} perfis criados/atualizados`);

  // ---- Tenant e Organização Sintética ----
  const tenantId = 'aaaaaaaa-0000-0000-0000-000000000001';
  const orgId    = 'bbbbbbbb-0000-0000-0000-000000000001';

  await prisma.tenant.upsert({
    where: { id: tenantId },
    update: {},
    create: { id: tenantId, slug: 'clinica-exemplo-dev' },
  });

  await prisma.organization.upsert({
    where: { cnpj: '00000000000000' },
    update: {},
    create: {
      id: orgId,
      tenantId,
      razaoSocial: 'Clínica Exemplo Desenvolvimento LTDA',
      nomeFantasia: 'Clínica Exemplo DEV',
      cnpj: '00000000000000',
      email: 'dev@clinica-exemplo.local',
      telefone: '(34) 3000-0000',
      status: 'ATIVA',
    },
  });

  // ---- Unidade Sintética ----
  const unitId = 'cccccccc-0000-0000-0000-000000000001';
  await prisma.unit.upsert({
    where: { organizationId_code: { organizationId: orgId, code: 'UN01' } },
    update: {},
    create: {
      id: unitId,
      organizationId: orgId,
      code: 'UN01',
      name: 'Unidade Central DEV',
      email: 'unidade@clinica-exemplo.local',
      telefone: '(34) 3000-0001',
      cidade: 'Uberaba',
      uf: 'MG',
      logradouro: 'Rua Exemplo',
      numero: '100',
      bairro: 'Centro',
      cep: '38000-000',
      status: 'ATIVA',
      checklistCompleted: true,
    },
  });

  // ---- Usuário de Desenvolvimento ----
  const devUserId = 'dddddddd-0000-0000-0000-000000000001';
  await prisma.user.upsert({
    where: { email: 'dev-admin@walletz-med.local' },
    update: {},
    create: {
      id: devUserId,
      keycloakId: 'dev-keycloak-id',
      email: 'dev-admin@walletz-med.local',
      name: 'Dev Admin',
      status: 'ATIVO',
    },
  });

  // Vínculo tenant
  await prisma.userTenant.upsert({
    where: { userId_tenantId: { userId: devUserId, tenantId } },
    update: {},
    create: { id: randomUUID(), userId: devUserId, tenantId },
  });

  const adminProfile = await prisma.profile.findUnique({ where: { name: 'WALLETZ_ADMIN' } });
  if (adminProfile) {
    await prisma.userOrganization.upsert({
      where: { userId_organizationId: { userId: devUserId, organizationId: orgId } },
      update: {},
      create: { id: randomUUID(), userId: devUserId, organizationId: orgId, profileId: adminProfile.id, status: 'ATIVO' },
    });
  }

  // ---- Segunda Org Sintética (para testes de isolamento de tenant) ----
  const tenantBId = 'aaaaaaaa-0000-0000-0000-000000000002';
  const orgBId    = 'bbbbbbbb-0000-0000-0000-000000000002';

  await prisma.tenant.upsert({
    where: { id: tenantBId },
    update: {},
    create: { id: tenantBId, slug: 'clinica-b-dev' },
  });

  await prisma.organization.upsert({
    where: { cnpj: '00000000000002' },
    update: {},
    create: {
      id: orgBId,
      tenantId: tenantBId,
      razaoSocial: 'Clínica B Desenvolvimento LTDA',
      nomeFantasia: 'Clínica B DEV',
      cnpj: '00000000000002',
      email: 'dev@clinica-b.local',
      telefone: '(34) 3000-0002',
      status: 'ATIVA',
    },
  });

  // Usuário restrito somente à Org B (para testes de isolamento)
  const userBId = 'dddddddd-0000-0000-0000-000000000002';
  await prisma.user.upsert({
    where: { email: 'user-orgb@clinica-b.local' },
    update: {},
    create: {
      id: userBId,
      keycloakId: 'dev-user-orgb',
      email: 'user-orgb@clinica-b.local',
      name: 'Usuário Org B (DEV)',
      status: 'ATIVO',
    },
  });

  await prisma.userTenant.upsert({
    where: { userId_tenantId: { userId: userBId, tenantId: tenantBId } },
    update: {},
    create: { id: randomUUID(), userId: userBId, tenantId: tenantBId },
  });

  const orgAdminProfile = await prisma.profile.findUnique({ where: { name: 'ORG_ADMIN' } });
  if (orgAdminProfile) {
    await prisma.userOrganization.upsert({
      where: { userId_organizationId: { userId: userBId, organizationId: orgBId } },
      update: {},
      create: { id: randomUUID(), userId: userBId, organizationId: orgBId, profileId: orgAdminProfile.id, status: 'ATIVO' },
    });
  }

  console.log('Segunda org sintética criada para testes de isolamento (Clínica B DEV)');

  // ---- Especialidades Sintéticas ----
  const specialties = [
    { code: 'CLIN', name: 'Clínica Geral' },
    { code: 'CARD', name: 'Cardiologia' },
    { code: 'DERM', name: 'Dermatologia' },
    { code: 'ORTO', name: 'Ortopedia' },
  ];

  const specialtyIds: Record<string, string> = {};
  for (const s of specialties) {
    const sp = await prisma.specialty.upsert({
      where: { organizationId_code: { organizationId: orgId, code: s.code } },
      update: {},
      create: { id: randomUUID(), organizationId: orgId, code: s.code, name: s.name, active: true },
    });
    specialtyIds[s.code] = sp.id;
  }
  console.log(`${specialties.length} especialidades criadas`);

  // ---- Profissionais Sintéticos ----
  const profId1 = 'eeeeeeee-0000-0000-0000-000000000001';
  const profId2 = 'eeeeeeee-0000-0000-0000-000000000002';

  await prisma.professional.upsert({
    where: { id: profId1 },
    update: {},
    create: {
      id: profId1,
      organizationId: orgId,
      name: 'Dr. João da Silva (DEV)',
      email: 'joao.dev@clinica-exemplo.local',
      councilType: 'CRM',
      councilNumber: '12345',
      councilUf: 'MG',
      specialties: { create: [{ specialtyId: specialtyIds['CLIN'] }, { specialtyId: specialtyIds['CARD'] }] },
    },
  });

  await prisma.professional.upsert({
    where: { id: profId2 },
    update: {},
    create: {
      id: profId2,
      organizationId: orgId,
      name: 'Dra. Maria Souza (DEV)',
      email: 'maria.dev@clinica-exemplo.local',
      councilType: 'CRM',
      councilNumber: '67890',
      councilUf: 'MG',
      specialties: { create: [{ specialtyId: specialtyIds['DERM'] }] },
    },
  });
  console.log('2 profissionais sintéticos criados');

  // ---- Recursos Sintéticos (a unidade já está ATIVA) ----
  const resources = [
    { code: 'CONS-01', name: 'Consultório 01', type: 'consultorio', floor: '1', location: 'Ala A' },
    { code: 'CONS-02', name: 'Consultório 02', type: 'consultorio', floor: '1', location: 'Ala A' },
    { code: 'SALA-PROC', name: 'Sala de Procedimentos', type: 'sala_procedimento', floor: '2' },
  ];

  for (const r of resources) {
    const existing = await prisma.resource.findUnique({ where: { unitId_code: { unitId, code: r.code } } });
    if (!existing) {
      await prisma.resource.create({
        data: { id: randomUUID(), unitId, ...r, status: 'ATIVO', capacity: 1 },
      });
    }
  }
  console.log(`${resources.length} recursos sintéticos criados`);

  // ---- Serviços Sintéticos ----
  const services = [
    { code: 'CONS-CLIN', name: 'Consulta Clínica Geral', type: 'consulta', durationMin: 30, specialtyCode: 'CLIN', price: 150 },
    { code: 'CONS-CARD', name: 'Consulta Cardiológica', type: 'consulta', durationMin: 45, specialtyCode: 'CARD', price: 250 },
    { code: 'CONS-DERM', name: 'Consulta Dermatológica', type: 'consulta', durationMin: 30, specialtyCode: 'DERM', price: 200 },
  ];

  for (const s of services) {
    const existing = await prisma.service.findFirst({ where: { organizationId: orgId, code: s.code, version: 1 } });
    if (!existing) {
      const svc = await prisma.service.create({
        data: {
          id: randomUUID(),
          organizationId: orgId,
          specialtyId: specialtyIds[s.specialtyCode],
          code: s.code,
          name: s.name,
          type: s.type,
          durationMin: s.durationMin,
          status: 'PUBLICADO',
          version: 1,
        },
      });
      await prisma.servicePrice.create({
        data: { id: randomUUID(), serviceId: svc.id, currency: 'BRL', amount: s.price, validFrom: new Date() },
      });
    }
  }
  console.log(`${services.length} serviços sintéticos criados`);

  // ---- Vínculos profissional ↔ unidade ----
  const today = new Date();
  const linkExists1 = await prisma.professionalUnitLink.findUnique({
    where: { professionalId_unitId: { professionalId: profId1, unitId } },
  });
  if (!linkExists1) {
    await prisma.professionalUnitLink.create({
      data: { id: randomUUID(), professionalId: profId1, unitId, role: 'Médico Clínico', startDate: today, status: 'VIGENTE' },
    });
  }
  const linkExists2 = await prisma.professionalUnitLink.findUnique({
    where: { professionalId_unitId: { professionalId: profId2, unitId } },
  });
  if (!linkExists2) {
    await prisma.professionalUnitLink.create({
      data: { id: randomUUID(), professionalId: profId2, unitId, role: 'Médica Dermatologista', startDate: today, status: 'VIGENTE' },
    });
  }

  // ---- Pacientes Sintéticos (Módulo 3) ----
  const patients = [
    { id: 'ffffffff-0000-0000-0000-000000000001', name: 'Ana Lima (DEV)', cpf: '11111111111', telefone: '(34) 99000-0001', dataNasc: '1985-03-15', sexo: 'F' },
    { id: 'ffffffff-0000-0000-0000-000000000002', name: 'Carlos Mendes (DEV)', cpf: '22222222222', telefone: '(34) 99000-0002', dataNasc: '1972-07-22', sexo: 'M' },
    { id: 'ffffffff-0000-0000-0000-000000000003', name: 'Beatriz Rocha (DEV)', cpf: '33333333333', telefone: '(34) 99000-0003', dataNasc: '1990-11-05', sexo: 'F' },
  ];

  for (const p of patients) {
    await prisma.patient.upsert({
      where: { organizationId_cpf: { organizationId: orgId, cpf: p.cpf } },
      update: {},
      create: {
        id: p.id,
        organizationId: orgId,
        name: p.name,
        cpf: p.cpf,
        dataNasc: new Date(p.dataNasc),
        sexo: p.sexo,
        telefone: p.telefone,
      },
    });
  }
  console.log(`${patients.length} pacientes sintéticos criados`);

  // ---- Regras de Disponibilidade Sintéticas (Módulo 3) ----
  const existingRules = await prisma.availabilityRule.count({ where: { unitId } });
  if (existingRules === 0) {
    // Dr. João: segunda a sexta, 08:00–12:00, slots de 30min
    for (const day of [1, 2, 3, 4, 5]) {
      await prisma.availabilityRule.create({
        data: {
          id: randomUUID(),
          unitId,
          professionalId: profId1,
          dayOfWeek: day,
          startTime: '08:00',
          endTime: '12:00',
          slotMin: 30,
          active: true,
        },
      });
    }
    // Dra. Maria: terça e quinta, 13:00–17:00, slots de 30min
    for (const day of [2, 4]) {
      await prisma.availabilityRule.create({
        data: {
          id: randomUUID(),
          unitId,
          professionalId: profId2,
          dayOfWeek: day,
          startTime: '13:00',
          endTime: '17:00',
          slotMin: 30,
          active: true,
        },
      });
    }
    console.log('Regras de disponibilidade sintéticas criadas');
  }

  // ---- Agendamentos Sintéticos (Módulo 3) ----
  const tomorrowBase = new Date();
  tomorrowBase.setDate(tomorrowBase.getDate() + 1);
  const apptDate = tomorrowBase.toISOString().split('T')[0];

  const apptExists = await prisma.appointment.count({ where: { organizationId: orgId } });
  if (apptExists === 0) {
    const svcClin = await prisma.service.findFirst({ where: { organizationId: orgId, code: 'CONS-CLIN' } });
    const resourceCons01 = await prisma.resource.findUnique({ where: { unitId_code: { unitId, code: 'CONS-01' } } });

    if (svcClin && resourceCons01) {
      const appt1 = await prisma.appointment.create({
        data: {
          id: randomUUID(),
          organizationId: orgId,
          unitId,
          professionalId: profId1,
          serviceId: svcClin.id,
          resourceId: resourceCons01.id,
          patientId: patients[0].id,
          type: 'CONSULTA',
          status: 'AGENDADO',
          startsAt: new Date(`${apptDate}T08:00:00`),
          endsAt: new Date(`${apptDate}T08:30:00`),
        },
      });
      await prisma.appointmentHistory.create({
        data: { id: randomUUID(), appointmentId: appt1.id, toStatus: 'AGENDADO', changedBy: devUserId },
      });

      const appt2 = await prisma.appointment.create({
        data: {
          id: randomUUID(),
          organizationId: orgId,
          unitId,
          professionalId: profId1,
          serviceId: svcClin.id,
          resourceId: resourceCons01.id,
          patientId: patients[1].id,
          type: 'CONSULTA',
          status: 'CONFIRMADO',
          startsAt: new Date(`${apptDate}T08:30:00`),
          endsAt: new Date(`${apptDate}T09:00:00`),
        },
      });
      await prisma.appointmentHistory.create({
        data: { id: randomUUID(), appointmentId: appt2.id, toStatus: 'CONFIRMADO', changedBy: devUserId },
      });

      console.log('2 agendamentos sintéticos criados');
    }
  }

  console.log('Seed concluído com sucesso!');
  console.log('');
  console.log('Usuário de desenvolvimento:');
  console.log('  E-mail: dev-admin@walletz-med.local');
  console.log('  Keycloak: http://localhost:8090 → realm walletz-med → usuário dev-admin / admin123');
  console.log('  Mailpit UI: http://localhost:8025');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
