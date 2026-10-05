# ADR-001 — Drizzle ORM para acesso a dados

**Status**: Accepted  
**Data**: 2026-10-05  
**Autor**: Arquitetura

## Contexto

Precisamos de um ORM para PostgreSQL com TypeScript strict, suporte a migrations SQL-first, pgvector, e performance adequada para queries multi-tenant com filtros de tenant_id obrigatórios.

## Decisão

Usar **Drizzle ORM** como camada de acesso a dados.

## Alternativas Consideradas

| ORM | Prós | Contras |
|-----|------|---------|
| Prisma | Ampla adoção, boa DX | Type generation pesada, N+1 facilita, migrations limitadas para pgvector |
| TypeORM | Maduro, decorators | Performance ruim em queries complexas, strict mode difícil |
| Drizzle ORM | Type-safe nativo, SQL-first, pgvector suporte, performance | Menor ecossistema que Prisma |
| Kysely | Type-safe, raw SQL | Sem migrations nativo |

## Justificativa

- TypeScript types gerados do schema, não o contrário — alinha com TypeScript strict
- Migrations SQL-first: controle total, compatível com pgvector e RLS
- Performance: queries explícitas evitam N+1 implícito
- `drizzle-kit` para migrations com dry-run
- Suporte nativo a `pgvector` operators

## Consequências

- Migrations manuais (mais controle, mas mais verbosas)
- Schema em TypeScript serve como fonte da verdade
- Queries explícitas — menos "magic", mais previsível
