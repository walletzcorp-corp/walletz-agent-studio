# M20 — Studio No-code e Automação (NCD)

**Status:** Implementado (F2)  
**Fase:** F2 (10 RFs)  
**Dependências:** M1 (ORG)

## Objetivo

Criação e versionamento de templates (formulários, protocolos, documentos, consentimentos) com fluxo de aprovação, publicação atômica, automações com limite de execuções e idempotência, e simulações com dados fictícios.

## Requisitos Funcionais

| ID | Descrição | Fase | Status |
|---|---|---|---|
| RF-NCD-001 | Criar template com tipo (FORMULARIO, PROTOCOLO, DOCUMENTO, CONSENTIMENTO, FLUXO) | F2 | ✅ |
| RF-NCD-002 | Listar templates da organização | F2 | ✅ |
| RF-NCD-003 | Criar versão com número incremental | F2 | ✅ |
| RF-NCD-004 | Aprovar versão (AGUARDANDO_APROVACAO → APROVADO) | F2 | ✅ |
| RF-NCD-005 | Publicar versão (PUBLICADO) retirando versão anterior | F2 | ✅ |
| RF-NCD-006 | Retirar versão publicada | F2 | ✅ |
| RF-NCD-007 | Simulação com dados fictícios e validação de campos obrigatórios | F2 | ✅ |
| RF-NCD-008 | Criar automação com gatilho, ação e limite de execuções | F2 | ✅ |
| RF-NCD-009 | Pausar/inativar automação (botão de interrupção) | F2 | ✅ |
| RF-NCD-010 | Dashboard de templates, versões e automações | F2 | ✅ |

## Restrições de Segurança

- Versão publicada tem autor, aprovador, vigência e histórico imutável
- Mudança em protocolo não altera registros já iniciados ou concluídos
- Configuração visual não remove barreiras de segurança, autorização, auditoria ou consentimento
- Automações têm limite de execuções, idempotência e botão de interrupção
- Simulações usam apenas dados fictícios — nunca dados reais de pacientes

## Modelos de Dados

- `NcdTemplate` — template configurável com tipo e referência à versão publicada atual
- `NcdVersion` — versão com schema JSON, número incremental, autor, aprovador e status
- `NcdAutomation` — automação com gatilho, ação, limite de execuções e contador
- `NcdSimulation` — histórico de simulações com resultado e erros

## Publicação Atômica

`publishVersion()` usa `$transaction` para:
1. Retirar (`RETIRADO`) todas as versões `PUBLICADO` do mesmo template
2. Promover a versão alvo para `PUBLICADO`
3. Atualizar `publishedVersionId` no template

## Endpoints (v1)

```
POST   /v1/ncd/:orgId/templates
GET    /v1/ncd/:orgId/templates
POST   /v1/ncd/:orgId/versions
POST   /v1/ncd/:orgId/versions/:id/approve
POST   /v1/ncd/:orgId/versions/:id/publish
PATCH  /v1/ncd/:orgId/versions/:id/retire
POST   /v1/ncd/:orgId/simulations
POST   /v1/ncd/:orgId/automations
PATCH  /v1/ncd/:orgId/automations/:id/status
GET    /v1/ncd/:orgId/dashboard
```

## Cobertura de Testes

17 testes passando em `ncd.service.spec.ts`.
