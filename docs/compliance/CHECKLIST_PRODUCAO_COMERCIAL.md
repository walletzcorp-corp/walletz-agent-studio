# Checklist Produção Comercial — Walletz Agent Studio

> Atualizado: 2026-10-06 | Versão: 1.0

## Legenda
- ✅ Implementado
- 🔶 EXTERNAL APPROVAL REQUIRED
- ⏳ Pendente de configuração
- 📋 Planejado

---

## Bloco 1 — Infraestrutura

| Item | Status | Observações |
|------|--------|-------------|
| PostgreSQL com backups automáticos | ⏳ | Dev: compose local; Prod: RDS/Neon/Supabase |
| Redis com persistence (AOF) | ⏳ | Dev: compose local |
| Banco em região Brasil (LGPD) | ⏳ | Configurar `us-east-1` → `sa-east-1` |
| HTTPS em todas as URLs públicas | ⏳ | Requer domínio + certificado |
| CDN com WAF para API pública | ⏳ | Cloudflare recomendado |
| Secrets em secret manager | ⏳ | Doppler ou AWS Secrets Manager |
| Monitoramento 24/7 | ⏳ | OpenTelemetry já configurado; falta coletor |

## Bloco 2 — Segurança

| Item | Status | Observações |
|------|--------|-------------|
| `ENCRYPTION_KEY` (64 hex) configurada | ⏳ | **Obrigatório para produção** |
| JWT secrets longos (64+ chars) | ⏳ | Configurar em secret manager |
| bcrypt rounds = 12 | ✅ | `BCRYPT_ROUNDS=12` |
| Rate limiting | ✅ | ThrottlerModule |
| Webhook signature validation | ✅ | HMAC-SHA256 com `META_APP_SECRET` |
| Token criptografado em repouso | ✅ | AES-256-GCM |
| CORS restrito ao domínio produção | ⏳ | `CORS_ALLOWED_ORIGINS=https://app.walletz.com.br` |
| Headers de segurança (Helmet) | 📋 | Adicionar `@nestjs/platform-fastify` ou `helmet` |

## Bloco 3 — WhatsApp / Meta

| Item | Status | Observações |
|------|--------|-------------|
| Meta App criado e configurado | 🔶 | EXTERNAL META APPROVAL REQUIRED |
| Embedded Signup Configuration ID | 🔶 | EXTERNAL META APPROVAL REQUIRED |
| Business Verification (Walletz) | 🔶 | EXTERNAL META APPROVAL REQUIRED |
| App Review (Advanced Access) | 🔶 | EXTERNAL META APPROVAL REQUIRED |
| Webhook URL pública HTTPS | ⏳ | `https://api.walletz.com.br/webhook/whatsapp` |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` configurado | ⏳ | Gerar random secret |
| `META_APP_ID`, `META_APP_SECRET` configurados | ⏳ | Após criação do App |
| `NEXT_PUBLIC_META_APP_ID`, `NEXT_PUBLIC_META_CONFIG_ID` | ⏳ | Após criação |

## Bloco 4 — LGPD / Privacidade

| Item | Status | Observações |
|------|--------|-------------|
| Consentimento coletado antes do envio | ✅ | Verificado em `campaigns.service.ts` |
| Opt-out automático via STOP | ✅ | `handleOptOut()` |
| Opt-out via suppression list | ✅ | Tabela `suppressions` |
| Exportação de dados (Art. 18 I) | ✅ | `GET .../privacy/contacts/:id/export` |
| Anonimização (Art. 18 VI) | ✅ | `DELETE .../privacy/contacts/:id` |
| Revogação de consentimento (Art. 15 I) | ✅ | `POST .../privacy/.../revoke-consent` |
| Auditoria de acesso a dados | ✅ | `AuditService` em todos os módulos |
| Política de retenção documentada | ✅ | `COMPLIANCE_LGPD.md` |
| DPA com clientes B2B | 🔶 | Requer revisão jurídica |
| Política de Privacidade pública | ⏳ | Página em `apps/web` |
| Termos de Uso públicos | ⏳ | Página em `apps/web` |
| Cookies banner (LGPD) | ⏳ | Landing page |
| DPO designado | 🔶 | Decisão de governança da Walletz |

## Bloco 5 — Isolamento Multi-tenant

| Item | Status | Observações |
|------|--------|-------------|
| `tenant_id` em todas as tabelas | ✅ | Esquema do banco |
| Queries sempre filtradas por tenant | ✅ | Verificado nos services |
| WhatsApp accounts isoladas por tenant | ✅ | + validação de conflito de phoneNumberId |
| Agentes não acessam dados de outros tenants | ✅ | LabService filtra por tenantId |
| Testes de isolamento | 📋 | `pnpm test:isolation` — suíte a criar |

## Bloco 6 — Operacional

| Item | Status | Observações |
|------|--------|-------------|
| Plano de backup testado | ⏳ | |
| Runbook de incidentes | 📋 | `PLANO_DE_RESPOSTA_A_INCIDENTES.md` |
| SLA definido | ⏳ | Decisão comercial |
| Suporte 24/7 ou business hours? | ⏳ | Decisão comercial |
| Onboarding de novos tenants documentado | 📋 | |
| Offboarding e portabilidade de dados | 📋 | |

---

## Pré-requisitos Críticos para Go-Live

```
OBRIGATÓRIOS antes do primeiro cliente em produção:

1. [EXTERNAL] Meta App criado e com App Review aprovado
2. [EXTERNAL] Business Verification da Walletz Corp na Meta
3. [INFRA] ENCRYPTION_KEY configurado em produção
4. [INFRA] Banco de dados em produção com backups
5. [INFRA] Domínio + HTTPS configurados
6. [INFRA] Webhook URL pública configurada na Meta
7. [JURÍDICO] Política de Privacidade publicada
8. [JURÍDICO] Termos de Uso publicados
9. [JURÍDICO] DPA disponível para clientes B2B
```
