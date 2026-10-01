# Módulo 16 — ATI: Ativos, Manutenção, Esterilização e Cadeia do Frio

**Código**: ATI  
**Versão**: 1.0.0  
**Data**: 2026-10-01

## Visão Geral

Gestão do ciclo de vida de equipamentos e ativos: cadastro com patrimônio, ordens de manutenção, ciclos de esterilização e monitoramento de cadeia do frio. Equipamentos bloqueados por manutenção ou falha de calibração não podem ser reservados.

## Requisitos Implementados

| RF | Descrição | Status |
|----|-----------|--------|
| RF-ATI-001 | Cadastro de ativo com patrimônio e categoria | ✅ |
| RF-ATI-002 | Listagem de ativos com filtros de status e localização | ✅ |
| RF-ATI-003 | Atualização de status do ativo | ✅ |
| RF-ATI-004 | Criação de ordem de manutenção | ✅ |
| RF-ATI-005 | Listagem de ordens de manutenção | ✅ |
| RF-ATI-006 | Atualização de status da ordem (bloqueia/libera ativo automaticamente) | ✅ |
| RF-ATI-007 | Registro de ciclo de esterilização | ✅ |
| RF-ATI-008 | Listagem de ciclos de esterilização | ✅ |
| RF-ATI-009 | Registro de leitura de temperatura (cadeia do frio) | ✅ |
| RF-ATI-010 | Detecção automática de excursão de temperatura | ✅ |
| RF-ATI-011 | Resolução de excursão (decisão humana obrigatória) | ✅ |
| RF-ATI-012 | Listagem de leituras de cadeia do frio | ✅ |
| RF-ATI-013 | Dashboard de ativos | ✅ |

## Endpoints

| Método | Caminho | Descrição |
|--------|---------|-----------|
| GET | `/v1/ati/assets` | Listar ativos |
| POST | `/v1/ati/assets` | Cadastrar ativo |
| PATCH | `/v1/ati/assets/:id/status` | Atualizar status |
| GET | `/v1/ati/maintenance` | Listar ordens de manutenção |
| POST | `/v1/ati/maintenance` | Criar ordem |
| PATCH | `/v1/ati/maintenance/:id/status` | Atualizar status da ordem |
| GET | `/v1/ati/sterilization` | Listar ciclos |
| POST | `/v1/ati/sterilization` | Registrar ciclo |
| GET | `/v1/ati/cold-chain` | Listar leituras |
| POST | `/v1/ati/cold-chain` | Registrar leitura |
| POST | `/v1/ati/cold-chain/excursions/:id/resolve` | Resolver excursão |
| GET | `/v1/ati/cold-chain/excursions` | Listar excursões |
| GET | `/v1/ati/dashboard` | Dashboard |
| GET | `/v1/ati/due-maintenance` | Ativos com manutenção vencida |

## Regras de Segurança

1. **Bloqueio automático por manutenção**: ao ir para EM_EXECUCAO, ativo vai a EM_MANUTENCAO; ao ir para CONCLUIDA, ativo vai a DISPONIVEL
2. **Temperatura não monitorada automaticamente**: sem sensor ou fonte de dados configurada, o sistema não afirma monitoramento automático
3. **Excursão requer decisão humana**: excursão detectada cria registro com `resolved = false`; `resolveExcursion` exige responsável e decisão explícita (`LIBERAR` / `DESCARTAR` / `QUARENTENA`)
4. **Excursão já decidida não pode ser redecidida**: uma excursão resolvida não aceita nova resolução
5. **Esterilização segue procedimento aprovado**: o sistema registra o ciclo; a validação técnica é responsabilidade do profissional habilitado
6. **Rastreabilidade restrita**: vínculo ativo ↔ procedimento/paciente requer acesso autorizado

## Fluxo de Manutenção

```
SOLICITADA → EM_EXECUCAO → CONCLUIDA
                         → CANCELADA
             (ativo: EM_MANUTENCAO) → (ativo: DISPONIVEL)
```

## Modelos de Dados

- `Asset` — ativo com patrimônio, categoria, status, configurações de cadeia do frio e calibração
- `AssetMaintenanceOrder` — ordem de manutenção preventiva, corretiva ou calibração
- `AssetSterilizationCycle` — ciclo de esterilização com método e parâmetros
- `AssetColdChainLog` — leitura de temperatura com excursão detectada automaticamente
- `AssetColdChainExcursion` — excursão identificada, aguardando decisão humana

## Arquivos

| Arquivo | Caminho |
|---------|---------|
| Serviço | `apps/api/src/modules/ati/services/ati.service.ts` |
| Controller | `apps/api/src/modules/ati/ati.controller.ts` |
| Módulo | `apps/api/src/modules/ati/ati.module.ts` |
| Testes | `apps/api/src/modules/ati/services/ati.service.spec.ts` |
| Frontend | `apps/web/src/app/(admin)/ativos/page.tsx` |
