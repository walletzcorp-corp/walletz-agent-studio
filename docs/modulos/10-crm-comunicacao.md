# Módulo 10 — CRM e Comunicação Comercial

## Escopo

RF-CRM-001 a RF-CRM-019 — Gestão comercial: leads, funis de venda, oportunidades, atividades, propostas, templates de comunicação e tickets de suporte.

## Princípios de Privacidade e Compliance

> **Comunicação comercial ≠ comunicação assistencial.**  
> Dados clínicos e de prontuário NUNCA devem ser usados para segmentação comercial.  
> Todo envio de comunicação comercial exige consentimento registrado no perfil do lead.  
> Gravação de chamadas requer consentimento explícito do paciente/lead.

## Componentes Implementados

### Backend

| Arquivo | Descrição |
|---------|-----------|
| `apps/api/src/modules/crm/services/crm.service.ts` | Serviço com toda lógica CRM |
| `apps/api/src/modules/crm/crm.controller.ts` | Controller REST versão 1 |
| `apps/api/src/modules/crm/crm.module.ts` | Módulo NestJS |
| `apps/api/src/modules/crm/services/crm.service.spec.ts` | 35 testes unitários |

### Schema (Prisma)

- `CrmFunnel` + `CrmFunnelStage` — Funis customizáveis com etapas, probabilidade, marcadores isWon/isLost
- `CrmLead` — Leads com consentimento, origem, status e conversão para paciente
- `CrmOpportunity` — Oportunidades com valor `NUMERIC(15,2)`, probabilidade, ciclo de venda
- `CrmActivity` — Atividades (ligação, e-mail, visita, tarefa) vinculadas a lead ou oportunidade
- `CrmProposal` — Propostas comerciais com valor `NUMERIC(15,2)` e fluxo de aceite
- `CrmTemplate` — Templates de comunicação com canal, finalidade e aprovação
- `CrmTicket` + `CrmTicketMessage` — Tickets com SLA, prioridade e histórico de mensagens

### Frontend

| Rota | Página |
|------|--------|
| `/crm` | Dashboard com KPIs e oportunidades |
| `/crm/leads` | Leads com busca, cadastro e consentimento |
| `/crm/tickets` | Tickets com SLA, filtros e respostas |
| `/crm/templates` | Templates de comunicação com aprovação |

## Endpoints REST (prefixo `/api/v1/crm`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/funis` | Lista funis com etapas |
| POST | `/funis` | Cria funil com etapas em transação |
| GET | `/leads` | Lista leads (busca, status, origem) |
| POST | `/leads` | Cria lead com consentimento |
| GET | `/leads/:id` | Detalhe do lead |
| PATCH | `/leads/:id` | Atualiza lead |
| POST | `/leads/:id/converter` | Converte lead em paciente |
| GET | `/oportunidades` | Lista oportunidades |
| POST | `/oportunidades` | Cria oportunidade |
| PATCH | `/oportunidades/:id/mover` | Move para etapa (atualiza status) |
| POST | `/atividades` | Registra atividade |
| POST | `/atividades/:id/concluir` | Marca atividade como concluída |
| POST | `/propostas` | Cria proposta |
| POST | `/propostas/:id/aceitar` | Aceita proposta |
| GET | `/templates` | Lista templates ativos |
| POST | `/templates` | Cria template |
| POST | `/templates/:id/aprovar` | Aprova template |
| GET | `/tickets` | Lista tickets (status, prioridade) |
| POST | `/tickets` | Cria ticket com SLA |
| POST | `/tickets/:id/mensagens` | Adiciona mensagem ao ticket |
| PATCH | `/tickets/:id/status` | Atualiza status (registra resolvedAt/closedAt) |
| GET | `/metricas` | KPIs: leads, oportunidades, ciclo, tickets |

## Regras de Negócio Implementadas

1. **Isolamento de tenant**: `assertAccess()` em toda operação
2. **Consentimento em leads**: campo `consentGiven` registrado com data e canal
3. **Conversão lead→paciente**: valida existência do paciente na mesma organização; rejeita lead já convertido
4. **Funil**: etapas `isWon`/`isLost` definem automaticamente o status da oportunidade ao mover
5. **Valores monetários NUMERIC**: `CrmOpportunity.value` e `CrmProposal.value` são `Decimal`
6. **Proposta**: fluxo RASCUNHO → ACEITA; rejeita aceite duplo
7. **Template**: precisa de aprovação explícita; separação comercial vs assistencial
8. **Ticket**: criação em transação (ticket + primeira mensagem); SLA padrão de 24h
9. **Ticket fechado**: não aceita novas mensagens
10. **Resolução/fechamento**: registra `resolvedAt`/`closedAt` automaticamente
11. **Métricas**: taxa de conversão, receita de oportunidades ganhas, ciclo médio, tickets abertos
