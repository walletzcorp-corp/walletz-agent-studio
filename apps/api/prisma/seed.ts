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
