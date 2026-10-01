# Guia de Implantação — Walletz Med

**Versão**: 2026-10-01 (Módulos 1-17)

> **Este guia é para ambiente de desenvolvimento.** Produção requer revisão de segurança independente, configuração de infraestrutura dedicada, e conformidade LGPD/CFM validada.

## Pré-requisitos

| Dependência | Versão | Porta |
|-------------|--------|-------|
| Node.js | 20+ | — |
| PostgreSQL | 18 | 5433 |
| pnpm | 8+ | — |

## 1. Configuração Inicial

```bash
# Clone e instale dependências
cd walletz-med
pnpm install

# Copie variáveis de ambiente
cp .env.example .env
# Edite .env com suas configurações locais
```

## 2. Banco de Dados

```bash
# Inicie o PostgreSQL (binários locais na porta 5433)
# Ver script: .pgdata/

# Aplique todas as migrações
cd apps/api
npx prisma migrate deploy

# Gere o cliente Prisma
npx prisma generate
```

### Migrações Disponíveis

| Migração | Módulos | Descrição |
|----------|---------|-----------|
| `20261001000000_module9_tis_module10_crm` | M9, M10 | TIS, CRM, ConvêniosOperadoras |
| `20261001100000_module11_ia_module12_int_module13_sal` | M11, M12, M13 | IA, Integrações, Salas |
| `20261001200000_module14_med_module15_qua_module16_ati_module17_eqp` | M14, M15, M16, M17 | Medicamentos, Qualidade, Ativos, Equipe |

## 3. Executar em Desenvolvimento

```bash
# API (porta 3011)
cd apps/api
pnpm run start:dev

# Web (porta 3010)
cd apps/web
pnpm run dev
```

## 4. Testes

```bash
cd apps/api
npx jest

# Resultado esperado: ~367 testes, 18 suítes, 0 falhas
```

## 5. TypeScript Check

```bash
cd apps/api
npx tsc --noEmit

cd apps/web
npx tsc --noEmit

# Resultado esperado: 0 erros em ambos
```

## 6. Módulos Implementados

| # | Código | Status | Observações |
|---|--------|--------|-------------|
| 1 | ORG | ✅ | Organização, unidades, usuários |
| 2 | PAC | ✅ | Pacientes, consentimentos LGPD |
| 3 | AGE | ✅ | Agenda, jornada operacional |
| 4 | PEP | ✅ | Prontuário eletrônico |
| 5 | DOC | ⏳ | Documentos, prescrição — Sprint 2 |
| 6 | TEL | ⏳ | Telemedicina — Sprint 2 |
| 7 | EST | ✅ | Estoque, compras |
| 8 | FIN | ✅ | Financeiro, fiscal |
| 9 | TIS | ✅ | Convênios TISS (simulação) |
| 10 | CRM | ✅ | CRM, comunicação comercial |
| 11 | IA  | ✅ | IA clínica (simulação) |
| 12 | INT | ✅ | Integrações, portal paciente |
| 13 | SAL | ✅ | Salas, fluxo físico |

## 7. Restrições por Módulo

### M9 TIS — Convênios
- XML TISS em **simulação** — não transmite para operadoras
- Requer: credencial ANS, endpoint homologação, certificado digital

### M11 IA — Inteligência Artificial
- Provider padrão: `simulated` — nenhuma API de IA é chamada
- Todo conteúdo gerado é rascunho até revisão humana

### M12 INT — Integrações
- Todos os conectores em `NAO_CONFIGURADO` por padrão
- Secretes de webhook nunca armazenados em texto claro

### M13 SAL — Salas
- Custos de sala não calculados sem integração com FIN/EST

## 8. Variáveis de Produção Adicionais

As seguintes variáveis NÃO devem ter valores de desenvolvimento em produção:

- `DATABASE_URL` — usar credenciais dedicadas com permissões mínimas
- `NEXTAUTH_SECRET` — gerar valor aleatório único por ambiente
- `JWT_ISSUER` — apontar para Keycloak de produção
- `KEYCLOAK_CLIENT_SECRET` — obter do console Keycloak de produção
- `CORS_ORIGINS` — restringir ao domínio da aplicação
