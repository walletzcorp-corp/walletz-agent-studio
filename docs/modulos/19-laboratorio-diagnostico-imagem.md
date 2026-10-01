# M19 — Laboratório e Diagnóstico por Imagem (DIA)

**Status:** Implementado (F2/F3)  
**Fase:** F2 (2 RFs), F3 (10 RFs)  
**Dependências:** M1 (ORG), M5 (PAC), M6 (AGD)

## Objetivo

Gestão de pedidos de exames laboratoriais e de imagem, rastreabilidade de amostras com código de barras, resultados versionados, resultado crítico com ciência obrigatória, retificação com histórico imutável e worklist de análise.

## Requisitos Funcionais

| ID | Descrição | Fase | Status |
|---|---|---|---|
| RF-DIA-001 | Pedido de exame (LAB ou IMAGEM) com código e nome | F2 | ✅ |
| RF-DIA-002 | Ciclo de status do pedido | F2 | ✅ |
| RF-DIA-003 | Registro de amostra com código de barras único por org | F3 | ✅ |
| RF-DIA-004 | Rejeição de amostra com motivo | F3 | ✅ |
| RF-DIA-005 | Recoleta vinculada à amostra rejeitada | F3 | ✅ |
| RF-DIA-006 | Resultado com versão incremental | F3 | ✅ |
| RF-DIA-007 | Liberação de resultado com registro de responsável | F3 | ✅ |
| RF-DIA-008 | Resultado crítico com ciência obrigatória (sem dupla ciência) | F3 | ✅ |
| RF-DIA-009 | Retificação de resultado liberado preservando versão anterior | F3 | ✅ |
| RF-DIA-010 | Worklist de análise por técnico | F3 | ✅ |
| RF-DIA-011 | Dashboard de diagnóstico | F3 | ✅ |
| RF-DIA-012 | Integração RIS/PACS (requer provedor externo) | F3 | — |

## Restrições de Segurança

- O sistema registra pedidos e resultados — não interpreta exame nem oferece diagnóstico autônomo
- Resultado crítico requer destinatário responsável, prazo, registro de comunicação e ciência confirmada
- Ciência crítica bloqueada para dupla confirmação (cada resultado: uma ciência)
- Retificação cria nova versão — versão anterior permanece com status RETIFICADO
- Integração RIS/PACS não declarada sem provedor, ambiente e dispositivo reais configurados

## Modelos de Dados

- `DiaOrder` — pedido de exame com status e tipo
- `DiaSample` — amostra com barcode único por org, suporte a recoleta (parentSampleId)
- `DiaResult` — resultado versionado com flag isCritical e criticalAckedBy
- `DiaWorkItem` — item de worklist para análise técnica

## Endpoints (v1)

```
POST   /v1/dia/:orgId/orders
GET    /v1/dia/:orgId/orders
PATCH  /v1/dia/:orgId/orders/:id/status
POST   /v1/dia/:orgId/samples
PATCH  /v1/dia/:orgId/samples/:id/reject
POST   /v1/dia/:orgId/samples/:id/recolect
POST   /v1/dia/:orgId/results
PATCH  /v1/dia/:orgId/results/:id/release
POST   /v1/dia/:orgId/results/:id/acknowledge-critical
POST   /v1/dia/:orgId/results/:id/rectify
GET    /v1/dia/:orgId/worklist
GET    /v1/dia/:orgId/dashboard
```

## Cobertura de Testes

19 testes passando em `dia.service.spec.ts`.
