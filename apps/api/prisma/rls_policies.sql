-- Row-Level Security policies for Walletz Med
-- IMPORTANT: Aplicar SOMENTE quando todos os serviços usarem withTenant() do PrismaService.
-- Até lá, o isolamento é garantido na camada de aplicação (JwtStrategy + service-level checks).
--
-- Pré-requisito: o usuário `walletz_app` NÃO deve ser SUPERUSER nem ter BYPASSRLS.
-- Verificar: SELECT usename, usesuper, usecreatedb FROM pg_user WHERE usename = 'walletz_app';
--
-- Para aplicar: psql -U walletz_admin -d walletz_med -f rls_policies.sql

-- Helper: retorna o tenant atual da sessão (vazio se não definido)
-- Definido via SET LOCAL app.tenant_id = '<uuid>' dentro de cada transação

-- organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_organizations ON organizations;
CREATE POLICY tenant_isolation_organizations ON organizations
  AS PERMISSIVE FOR ALL
  TO walletz_app
  USING (tenant_id::text = current_setting('app.tenant_id', true));

-- units (via organização)
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE units FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_units ON units;
CREATE POLICY tenant_isolation_units ON units
  AS PERMISSIVE FOR ALL
  TO walletz_app
  USING (
    organization_id IN (
      SELECT id FROM organizations
      WHERE tenant_id::text = current_setting('app.tenant_id', true)
    )
  );

-- professionals (via organização)
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_professionals ON professionals;
CREATE POLICY tenant_isolation_professionals ON professionals
  AS PERMISSIVE FOR ALL
  TO walletz_app
  USING (
    organization_id IN (
      SELECT id FROM organizations
      WHERE tenant_id::text = current_setting('app.tenant_id', true)
    )
  );

-- services (via organização)
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE services FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_services ON services;
CREATE POLICY tenant_isolation_services ON services
  AS PERMISSIVE FOR ALL
  TO walletz_app
  USING (
    organization_id IN (
      SELECT id FROM organizations
      WHERE tenant_id::text = current_setting('app.tenant_id', true)
    )
  );

-- resources (via unit → organizacao)
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_resources ON resources;
CREATE POLICY tenant_isolation_resources ON resources
  AS PERMISSIVE FOR ALL
  TO walletz_app
  USING (
    unit_id IN (
      SELECT u.id FROM units u
      JOIN organizations o ON o.id = u.organization_id
      WHERE o.tenant_id::text = current_setting('app.tenant_id', true)
    )
  );

-- audit_events (cada evento registra tenant_id)
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_audit_events ON audit_events;
CREATE POLICY tenant_isolation_audit_events ON audit_events
  AS PERMISSIVE FOR ALL
  TO walletz_app
  USING (tenant_id::text = current_setting('app.tenant_id', true));

-- outbox_events
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_outbox_events ON outbox_events;
CREATE POLICY tenant_isolation_outbox_events ON outbox_events
  AS PERMISSIVE FOR ALL
  TO walletz_app
  USING (tenant_id::text = current_setting('app.tenant_id', true));
