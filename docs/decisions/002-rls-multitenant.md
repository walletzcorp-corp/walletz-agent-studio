# ADR-002: Isolamento Multi-tenant com PostgreSQL RLS

**Data:** 2026-09-30  
**Status:** Aceito

## Contexto
Isolamento entre organizações é requisito de segurança bloqueador.

## Decisão
- Toda entidade tem `tenant_id` ou relação direta com tenant
- `walletz_app` é criado sem `SUPERUSER` nem `BYPASSRLS`
- O tenant efetivo é derivado do JWT autenticado, nunca do body do request
- `withTenant()` no `PrismaService` define `SET LOCAL app.tenant_id` dentro de cada transação
- As policies RLS (`CREATE POLICY`) são criadas via migrations SQL customizadas

## Limitação documentada
Prisma não suporta RLS nativamente — a abordagem de `SET LOCAL` dentro de `$transaction` garante que o contexto não vaza entre requisições desde que o connection pool não reutilize a sessão com o contexto anterior. Isso é garantido porque `SET LOCAL` tem escopo de transação.

## Pendência
Migrations SQL para CREATE POLICY por tabela devem ser adicionadas na próxima iteração de hardening.
