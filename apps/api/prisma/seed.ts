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

  // ---- CID-10 Sample Codes (RF-PEP-006) ----
  const cidCodes = [
    { code: 'A00', description: 'Cólera', category: 'A00-A09' },
    { code: 'A01', description: 'Febres tifóide e paratifóide', category: 'A00-A09' },
    { code: 'B34.9', description: 'Infecção viral de localização não especificada', category: 'B25-B34' },
    { code: 'E11', description: 'Diabetes mellitus não-insulino-dependente', category: 'E10-E14' },
    { code: 'E14', description: 'Diabetes mellitus não especificado', category: 'E10-E14' },
    { code: 'F32', description: 'Episódios depressivos', category: 'F30-F39' },
    { code: 'F41.1', description: 'Ansiedade generalizada', category: 'F40-F48' },
    { code: 'G43', description: 'Enxaqueca', category: 'G40-G47' },
    { code: 'H10', description: 'Conjuntivite', category: 'H10-H13' },
    { code: 'I10', description: 'Hipertensão essencial (primária)', category: 'I10-I15' },
    { code: 'I25.1', description: 'Doença aterosclerótica do coração', category: 'I20-I25' },
    { code: 'J00', description: 'Nasofaringite aguda (resfriado comum)', category: 'J00-J06' },
    { code: 'J06.9', description: 'Infecção aguda das vias aéreas superiores NE', category: 'J00-J06' },
    { code: 'J18.9', description: 'Pneumonia não especificada', category: 'J12-J18' },
    { code: 'J45', description: 'Asma', category: 'J40-J47' },
    { code: 'K21.0', description: 'Doença do refluxo gastroesofágico com esofagite', category: 'K20-K31' },
    { code: 'K29.7', description: 'Gastrite não especificada', category: 'K29-K31' },
    { code: 'K35', description: 'Apendicite aguda', category: 'K35-K38' },
    { code: 'L20', description: 'Dermatite atópica', category: 'L20-L30' },
    { code: 'L50', description: 'Urticária', category: 'L50-L54' },
    { code: 'M54.5', description: 'Dor lombar baixa', category: 'M50-M54' },
    { code: 'M79.3', description: 'Paniculite', category: 'M70-M79' },
    { code: 'N39.0', description: 'Infecção do trato urinário de localização não especificada', category: 'N30-N39' },
    { code: 'O80', description: 'Parto único espontâneo', category: 'O80-O84' },
    { code: 'R05', description: 'Tosse', category: 'R00-R09' },
    { code: 'R10.4', description: 'Outras dores abdominais e as não especificadas', category: 'R10-R19' },
    { code: 'R50', description: 'Febre de outras origens e de origem desconhecida', category: 'R50-R69' },
    { code: 'R51', description: 'Cefaléia', category: 'R50-R69' },
    { code: 'S00-T98', description: 'Lesões, envenenamentos e algumas outras consequências de causas externas', category: 'S00-T98' },
    { code: 'Z00.0', description: 'Exame médico geral', category: 'Z00-Z13' },
    { code: 'Z13', description: 'Exame de rastreamento para outras doenças e transtornos', category: 'Z00-Z13' },
  ];

  for (const cid of cidCodes) {
    await prisma.cidCode.upsert({
      where: { code_version: { code: cid.code, version: '10' } },
      update: {},
      create: { id: randomUUID(), code: cid.code, description: cid.description, category: cid.category, version: '10', active: true },
    });
  }
  console.log(`${cidCodes.length} códigos CID-10 criados`);

  // ---- Prontuário Sintético — Ana Lima (Módulo 4) ----
  const anaPatientId = 'ffffffff-0000-0000-0000-000000000001';
  const existingRecord = await prisma.medicalRecord.findUnique({ where: { patientId: anaPatientId } });
  if (!existingRecord) {
    const record = await prisma.medicalRecord.create({
      data: { id: randomUUID(), organizationId: orgId, patientId: anaPatientId },
    });

    // Alergias
    await prisma.allergyRecord.create({
      data: {
        id: randomUUID(),
        recordId: record.id,
        substance: 'Dipirona',
        reaction: 'Urticária generalizada',
        severity: 'moderada',
        status: 'ATIVO',
        reportedBy: devUserId,
      },
    });

    // Medicamentos
    await prisma.medicationRecord.create({
      data: {
        id: randomUUID(),
        recordId: record.id,
        name: 'Losartana 50mg',
        dosage: '50mg',
        frequency: '1x ao dia',
        route: 'oral',
        status: 'EM_USO',
        indication: 'Hipertensão arterial',
        prescribedBy: devUserId,
        startDate: new Date('2024-01-15'),
      },
    });

    // Diagnósticos
    await prisma.diagnosisRecord.create({
      data: {
        id: randomUUID(),
        recordId: record.id,
        cidCode: 'I10',
        description: 'Hipertensão essencial (primária)',
        type: 'PRINCIPAL',
        diagnosedBy: devUserId,
      },
    });

    // Antecedentes
    await prisma.medicalHistoryRecord.create({
      data: {
        id: randomUUID(),
        recordId: record.id,
        category: 'pessoal',
        description: 'Apendicectomia em 2010',
        reportedBy: devUserId,
      },
    });

    // Entrada clínica SOAP rascunho
    const entry = await prisma.clinicalEntry.create({
      data: {
        id: randomUUID(),
        recordId: record.id,
        organizationId: orgId,
        unitId,
        professionalId: devUserId,
        subjective: 'Paciente refere dor de cabeça persistente há 3 dias, de intensidade moderada, sem febre.',
        objective: 'PA: 140/90 mmHg. FC: 78 bpm. Sem rigidez de nuca. Neurológico preservado.',
        assessment: 'Cefaléia possivelmente relacionada a HAS não controlada.',
        plan: 'Ajuste de anti-hipertensivo. Retorno em 15 dias. Solicitar exames laboratoriais.',
        status: 'RASCUNHO',
      },
    });

    await prisma.vitalSigns.create({
      data: {
        id: randomUUID(),
        entryId: entry.id,
        temperatureC: 36.5,
        systolicBp: 140,
        diastolicBp: 90,
        heartRate: 78,
        oxygenSatPct: 98,
        weightKg: 65,
        heightCm: 162,
        bmi: 24.8,
        painScale: 4,
      },
    });

    await prisma.pepAuditLog.create({
      data: {
        id: randomUUID(),
        recordId: record.id,
        entryId: entry.id,
        actorSub: devUserId,
        actorName: 'Dev Admin (DEV)',
        action: 'INCLUSAO',
        resourceType: 'entry',
        resourceId: entry.id,
      },
    });

    console.log('Prontuário sintético de Ana Lima criado');
  }

  // ---- Relação Assistencial (RF-PEP-013) ----
  const careExists = await prisma.careRelationship.findFirst({
    where: { patientId: anaPatientId, professionalId: profId1, organizationId: orgId },
  });
  if (!careExists) {
    await prisma.careRelationship.create({
      data: {
        id: randomUUID(),
        organizationId: orgId,
        patientId: anaPatientId,
        professionalId: profId1,
        unitId,
      },
    });
    console.log('Relação assistencial criada para Ana Lima → Dr. João');
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
