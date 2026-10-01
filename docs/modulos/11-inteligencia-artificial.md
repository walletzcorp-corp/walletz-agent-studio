# Módulo 11 — IA: Inteligência Artificial

## Escopo

RF-IA-001 a RF-IA-012 — Governança, geração de rascunhos, revisão humana e monitoramento de qualidade.

## Princípios Obrigatórios

> **IA é apoio; não substitui decisão clínica, não assina, não prescreve e não finaliza prontuário autonomamente.**
> Todo conteúdo gerado para uso clínico é **rascunho** até revisão humana explícita.
> Não são fabricadas fontes, dados clínicos, exames, citações ou grau de certeza.
> Não há treinamento ou reutilização de dados clínicos para fins não aprovados.
> Provedores e modelos são isolados por adaptadores configuráveis — nenhuma regra de negócio está amarrada a um provedor específico.

## Componentes Implementados

| Arquivo | Descrição |
|---------|-----------|
| `apps/api/src/modules/ia/services/ia.service.ts` | Serviço com governança, rascunhos e métricas |
| `apps/api/src/modules/ia/ia.controller.ts` | Controller REST versão 1 |
| `apps/api/src/modules/ia/ia.module.ts` | Módulo NestJS |
| `apps/api/src/modules/ia/services/ia.service.spec.ts` | 25 testes unitários |
| `apps/web/src/app/(admin)/ia/page.tsx` | Painel de configuração e revisão |

## Schema (Prisma)

- `AiConfig` — Configuração por caso de uso: enabled, provider, riskLevel, requiresConsent, approvedBy/At
- `AiDraft` — Rascunho gerado com status PENDENTE/ACEITO/REJEITADO/EXPIRADO
- `AiUsageLog` — Log de uso por usuário, caso de uso e ação
- `AiQualityMetric` — Métricas periódicas: totalRequests, acceptedCount, driftDetected

## Endpoints REST (prefixo `/api/v1/ia/:organizationId`)

| Método | Rota | RF | Descrição |
|--------|------|----|-----------|
| GET | `/configs` | RF-IA-001 | Lista configs de IA |
| POST | `/configs` | RF-IA-002 | Upsert config de caso de uso |
| PATCH | `/configs/:useCase/aprovar` | RF-IA-003 | Aprovar caso de uso |
| PATCH | `/configs/:useCase/desativar` | RF-IA-004 | Desativar caso de uso |
| POST | `/rascunhos` | RF-IA-005 | Gerar rascunho (simulado) |
| GET | `/rascunhos/pendentes` | RF-IA-006 | Listar rascunhos pendentes |
| PATCH | `/rascunhos/:id/aceitar` | RF-IA-007 | Revisor aceita rascunho |
| PATCH | `/rascunhos/:id/rejeitar` | RF-IA-008 | Revisor rejeita rascunho |
| POST | `/rascunhos/expirar` | RF-IA-009 | Expirar rascunhos vencidos |
| POST | `/metricas-qualidade` | RF-IA-010 | Registrar métrica de qualidade |
| GET | `/metricas-qualidade` | RF-IA-011 | Listar métricas |
| GET | `/logs` | RF-IA-012 | Listar logs de uso |

## Regras Implementadas

1. Caso de uso não configurado → NotFoundException
2. Caso de uso desabilitado → BadRequestException com mensagem clara
3. Rascunho gerado com `_notice: 'SIMULAÇÃO'` no output — nunca para uso clínico direto
4. Apenas rascunhos PENDENTE podem ser aceitos ou rejeitados
5. Expiração automática de rascunhos após 24h (ou TTL configurado)
6. `approvedBy/At` são nulos após qualquer atualização de config — requer re-aprovação
7. Logs de uso registrados em toda ação (geração, aceite, rejeição)
8. Isolamento de tenant em toda operação

## Modo de Simulação

O provider padrão é `'simulated'`. Nenhuma chamada a API de IA externa é feita. O campo `_notice` no output do rascunho sempre contém:
```json
{ "_notice": "SIMULAÇÃO — Este conteúdo não foi gerado por IA real e não deve ser usado clinicamente." }
```

Integração real requer: provider configurado com credenciais, endpoint validado, e aprovação explícita do caso de uso com classificação de risco.
