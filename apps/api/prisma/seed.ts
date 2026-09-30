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

  // ---- Especialidade Sintética ----
  await prisma.specialty.upsert({
    where: { organizationId_code: { organizationId: orgId, code: 'CLIN' } },
    update: {},
    create: { id: randomUUID(), organizationId: orgId, code: 'CLIN', name: 'Clínica Geral', active: true },
  });

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
