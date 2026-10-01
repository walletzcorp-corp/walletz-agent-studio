# Guia de Implantação — Walletz Med

> **AVISO**: Este guia descreve o processo de implantação controlada para
> ambiente de homologação ou produção. Não execute em produção sem revisar
> cada seção com a equipe técnica responsável.

---

## Pré-requisitos

- Node.js 18+
- PostgreSQL 14+ (produção recomendada: PostgreSQL 16/18)
- Variáveis de ambiente configuradas (ver `.env.example`)

## Variáveis de ambiente obrigatórias

```
DATABASE_URL=postgresql://user:pass@host:5432/walletz_med
JWT_SECRET=<segredo-forte-256-bits>
NODE_ENV=production
```

Variáveis opcionais (integrações):
```
WHATSAPP_API_KEY=     # se ausente, modo demo
SMS_API_KEY=          # se ausente, modo demo
SMTP_HOST=            # se ausente, notificações em modo demo
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

## Banco de dados

```bash
# 1. Criar banco
createdb walletz_med

# 2. Aplicar migrações
cd apps/api
npx prisma migrate deploy

# 3. (Opcional) Aplicar seed de dados sintéticos
npx prisma db seed
```

> RLS PostgreSQL: o script `apps/api/prisma/rls_policies.sql` está disponível
> mas **não é aplicado automaticamente**. Aplique manualmente após validar em
> homologação.

## Build e start

```bash
# Na raiz do monorepo
npm install

# Build da API
cd apps/api
npm run build

# Build do web
cd apps/web
npm run build

# Start da API
cd apps/api
NODE_ENV=production node dist/main

# Start do web (Next.js)
cd apps/web
node .next/standalone/server.js
```

## Verificação pós-implantação

1. `GET /api/v1/health` deve retornar `200 OK`
2. `POST /api/v1/auth/dev-login` deve retornar `401` em `NODE_ENV=production`
3. Verificar logs de erro nos primeiros 5 minutos de operação
4. Executar smoke test nos endpoints principais (organizations, patients, scheduling)

## Rollback

Em caso de falha na migração:
```bash
# Marcar migração como rolled back
npx prisma migrate resolve --rolled-back <nome-da-migration>
# Corrigir SQL e reimplantar
npx prisma migrate deploy
```

## Checklist pré-go-live

- [ ] JWT_SECRET gerado com entropia adequada (não usar o valor de dev)
- [ ] DATABASE_URL aponta para banco de produção com backup ativo
- [ ] NODE_ENV=production (desativa dev-login e logs verbosos)
- [ ] HTTPS configurado no reverse proxy (Nginx/Caddy)
- [ ] RLS policies revisadas e aplicadas (opcional mas recomendado)
- [ ] Integrações de notificação (SMTP/WhatsApp/SMS) testadas ou modo demo documentado
- [ ] Backup automático do banco configurado
- [ ] Monitoramento de erros (Sentry ou equivalente) configurado
