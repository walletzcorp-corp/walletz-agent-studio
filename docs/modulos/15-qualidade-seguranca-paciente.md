# Módulo 15 — QUA: Qualidade e Segurança do Paciente

**Código**: QUA  
**Versão**: 1.0.0  
**Data**: 2026-10-01

## Visão Geral

Gestão de incidentes de segurança do paciente, análise de causa raiz, planos de ação corretiva e preventiva, protocolos de qualidade e indicadores. Suporta relato anônimo com limites declarados de anonimato.

## Requisitos Implementados

| RF | Descrição | Status |
|----|-----------|--------|
| RF-QUA-001 | Criação de incidente (com ou sem identificação) | ✅ |
| RF-QUA-002 | Listagem de incidentes com filtros de acesso | ✅ |
| RF-QUA-003 | Adição de adendo (preserva relato original) | ✅ |
| RF-QUA-004 | Análise de incidente com causa raiz | ✅ |
| RF-QUA-005 | Encerramento de incidente com justificativa | ✅ |
| RF-QUA-006 | Criação de plano de ação corretiva/preventiva | ✅ |
| RF-QUA-007 | Atualização de plano (CONCLUIDA exige evidência) | ✅ |
| RF-QUA-008 | Verificação de efetividade do plano | ✅ |
| RF-QUA-009 | Criação de protocolo de qualidade | ✅ |
| RF-QUA-010 | Listagem de protocolos com filtros | ✅ |
| RF-QUA-011 | Preparação de notificação regulatória (humano revisa antes de enviar) | ✅ |
| RF-QUA-012 | Confirmação de notificação regulatória por responsável | ✅ |
| RF-QUA-013 | Dashboard de qualidade | ✅ |
| RF-QUA-014 | Criação de indicador de qualidade | ✅ |
| RF-QUA-015 | Registro de medição de indicador | ✅ |
| RF-QUA-016 | Listagem de indicadores com medições | ✅ |
| RF-QUA-017 | Bloqueio de adendo em incidente encerrado/cancelado | ✅ |
| RF-QUA-018 | Bloqueio de encerramento de plano sem evidência | ✅ |

## Endpoints

| Método | Caminho | Descrição |
|--------|---------|-----------|
| GET | `/v1/qua/incidents` | Listar incidentes |
| POST | `/v1/qua/incidents` | Criar incidente |
| POST | `/v1/qua/incidents/:id/addendum` | Adicionar adendo |
| POST | `/v1/qua/incidents/:id/analyse` | Análise de causa raiz |
| POST | `/v1/qua/incidents/:id/close` | Encerrar incidente |
| GET | `/v1/qua/action-plans` | Listar planos de ação |
| POST | `/v1/qua/action-plans` | Criar plano de ação |
| PATCH | `/v1/qua/action-plans/:id` | Atualizar plano |
| POST | `/v1/qua/action-plans/:id/verify` | Verificar efetividade |
| GET | `/v1/qua/protocols` | Listar protocolos |
| POST | `/v1/qua/protocols` | Criar protocolo |
| POST | `/v1/qua/incidents/:id/prepare-notification` | Preparar notificação regulatória |
| POST | `/v1/qua/incidents/:id/confirm-notification` | Confirmar envio por humano |
| GET | `/v1/qua/indicators` | Listar indicadores |
| POST | `/v1/qua/indicators` | Criar indicador |
| POST | `/v1/qua/indicators/:id/measurements` | Registrar medição |
| GET | `/v1/qua/indicators/:id/measurements` | Listar medições |
| GET | `/v1/qua/dashboard` | Dashboard de qualidade |

## Regras de Segurança

1. **Imutabilidade do relato**: adendos não sobrescrevem o original; são registros adicionais
2. **Adendo bloqueado**: incidente encerrado ou cancelado não aceita adendos
3. **Evidência obrigatória**: plano de ação só vai a CONCLUIDA com evidência documentada
4. **Verificação de efetividade**: plano CONCLUIDO sem verificação prévia não pode ser encerrado
5. **Notificação não automática**: `prepareRegulatoryNotification` marca para revisão; `confirmRegulatoryNotification` é ação separada e intencional do responsável
6. **Anonimato limitado**: relatos anônimos não expõem identidade em dashboards gerais; a arquitetura registra IP/sessão por requisito legal — não prometemos anonimato irrestrito

## Modelos de Dados

- `QualityIncident` — incidente com tipo, severidade, status
- `QualityIncidentAddendum` — adendo auditável (preserva original)
- `QualityActionPlan` — plano de ação corretiva/preventiva com evidência
- `QualityProtocol` — protocolo versionado aprovado por responsável
- `QualityIndicator` — indicador configurável com meta
- `QualityIndicatorMeasurement` — medição periódica do indicador

## Arquivos

| Arquivo | Caminho |
|---------|---------|
| Serviço | `apps/api/src/modules/qua/services/qua.service.ts` |
| Controller | `apps/api/src/modules/qua/qua.controller.ts` |
| Módulo | `apps/api/src/modules/qua/qua.module.ts` |
| Testes | `apps/api/src/modules/qua/services/qua.service.spec.ts` |
| Frontend | `apps/web/src/app/(admin)/qualidade/page.tsx` |
