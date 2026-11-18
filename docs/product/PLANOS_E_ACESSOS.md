# Planos e acessos: regras aplicadas pela API

**Base comercial:** *Walletz Studio IA — Planos Sugeridos*, proposta v4.2 (16/11/2026)
**Última atualização:** 2026-11-18

A API é a única fonte de verdade. Toda chamada é validada no servidor contra o plano **atual** da organização, e não só no momento de criar algo. O que o painel esconde ou mostra é conveniência; a decisão é sempre da API.

---

## 1. Ordem das verificações

Toda rota de organização (`/v1/tenants/:tenantId/...`) passa pelo `RbacGuard` ([rbac.guard.ts](../../apps/api/src/shared/rbac/rbac.guard.ts)). As verificações acontecem nesta ordem; a primeira que falha encerra a requisição.

| # | Verificação | Resposta quando falha |
|---|---|---|
| 1 | A rota declara o papel mínimo (`@Roles`) | 403 `ROUTE_ROLE_NOT_DEFINED` (negação por padrão) |
| 2 | Usuário com vínculo ativo **nesta** organização | 403 |
| 3 | Organização não suspensa nem cancelada | 403 `TENANT_SUSPENDED` |
| 4 | Trial dentro do prazo (`trial_ends_at`) | 403 `TRIAL_EXPIRED` |
| 5 | Usuário dentro do limite de usuários do plano | 403 `PLAN_LIMIT_EXCEEDED` (`resource: users`) |
| 6 | Recurso exigido pela rota (`@RequiresFeature`) liberado no plano | 403 `FEATURE_NOT_IN_PLAN` ou `FEATURE_IN_DEVELOPMENT` |
| 7 | Papel do usuário ≥ papel exigido | 403 `Insufficient role` |

Depois do guard, o serviço confere o **item** usado: o número de WhatsApp, a agenda, o widget, o webhook, a chave de IA ou o agente precisa estar dentro do limite do plano (seção 4).

Os caminhos que não passam por login, como webhooks da Meta, webchat público, entregas da fila e ferramentas do agente, usam a mesma regra por meio de `PlanLimitsService.usageBlock()` / `assertUsable()` ([plan-limits.service.ts](../../apps/api/src/shared/plans/plan-limits.service.ts)).

## 2. Recursos por plano

Fonte: [plan-catalog.ts](../../apps/api/src/shared/plans/plan-catalog.ts). Só `available` libera. `in_development` fica bloqueado até ser homologado.

| Recurso | Starter | Pro | Business | Agency |
|---|---|---|---|---|
| Webchat | ✅ | ✅ | ✅ | ✅ |
| WhatsApp oficial | — | ✅ | ✅ | ✅ |
| Agendas | — | ✅ | ✅ | ✅ |
| Webhooks de saída | — | ✅ | ✅ | ✅ |
| Notificações por e-mail | — | em desenv. | em desenv. | em desenv. |
| Caixa de e-mail, API pública, CRM | — | — | em desenv. | em desenv. |
| White Label / subcontas | — | — | — | em desenv. |
| Campanhas em massa | — | — | — | — |
| PC Connector | em desenv. | em desenv. | em desenv. | em desenv. |

**Exceções do admin da plataforma:** em `tenants.feature_flags`, `true` libera o recurso sob medida e `false` bloqueia mesmo que o plano inclua. Valem na hora, para o painel e para os canais.

## 3. Limites por plano

| Limite | Starter | Pro | Business | Agency |
|---|---|---|---|---|
| Agentes (não arquivados) | 1 | 3 | 8 | 10 |
| Usuários | 1 | 5 | 15 | 25 |
| Chaves de IA | 1 | 2 | 3 | 2 |
| Números de WhatsApp | 0 | 1 | 2 | 5 |
| Agendas | 0 | 1 | 3 | 5 |
| Widgets de webchat | 1 | 3 | 8 | 10 |
| Webhooks de saída | 0 | 1 | 5 | 5 |

- **Criar além do limite:** 403 `PLAN_LIMIT_REACHED`.
- **Concorrência:** a criação reserva a vaga com uma trava no Postgres (`pg_advisory_xact_lock` por organização e recurso) e conta e insere na mesma transação. Requisições simultâneas não passam do limite. O teste de integração faz 6 criações ao mesmo tempo no Starter, e só 1 é aceita.

## 4. Rebaixamento de plano: só os mais novos param

Quando a organização muda para um plano menor, **nada é apagado** (regra do CLAUDE.md). Os itens que cabem no novo plano continuam funcionando, escolhidos do mais antigo para o mais novo. Os excedentes, que são os mais novos, ficam bloqueados no uso até o cliente excluir itens ou ampliar o plano.

| Recurso | O que fica bloqueado no item excedente |
|---|---|
| Usuários | Perde o acesso à organização. **O dono nunca é bloqueado.** |
| Agentes | Não responde em WhatsApp nem webchat, não roda no Laboratório e não pode ser publicado, retomado ou ter versão restaurada. Pode ser editado e excluído. |
| Números de WhatsApp | A mensagem do contato é registrada, mas o agente não responde. Envio, templates, credenciais, reconexão e troca de agente ficam bloqueados. |
| Agendas | Não cria evento no provedor. |
| Widgets de webchat | O widget fica indisponível no site, e a edição é bloqueada. |
| Webhooks de saída | Não recebe eventos. Entregas já enfileiradas são descartadas, e editar, testar e trocar o segredo ficam bloqueados. |
| Chaves de IA | Não é usada. Agente fixado numa chave excedente recebe `PLAN_LIMIT_EXCEEDED`. Os demais usam a chave padrão dentro do limite. |

Quando o **recurso inteiro** sai do plano (por exemplo, WhatsApp num rebaixamento para Starter), todas as rotas do recurso respondem `FEATURE_NOT_IN_PLAN`. Ficam liberadas só as de **consultar e excluir** (`@PlanExempt`), para o cliente ver e remover o que tem.

O número do WhatsApp com o agente atribuído explicitamente a um agente bloqueado **não** troca para outro agente sozinho: fica sem resposta até o cliente decidir.

## 5. Papéis

Hierarquia: `viewer < analyst < agent_operator < manager < admin < owner`. Toda rota de organização declara o papel mínimo, e o teste [route-roles.spec.ts](../../apps/api/src/shared/rbac/__tests__/route-roles.spec.ts) falha se alguma ficar sem.

| Área | viewer | agent_operator | manager | admin |
|---|---|---|---|---|
| Ler agentes, conhecimento, conversas, contatos, campanhas, canais | ✅ | ✅ | ✅ | ✅ |
| Atender conversas (enviar, assumir, devolver para a IA, resolver) | — | ✅ | ✅ | ✅ |
| Agendar, remarcar e cancelar reuniões | — | ✅ | ✅ | ✅ |
| Criar e editar agentes, conhecimento, widgets, segmentos e campanhas; importar contatos; Laboratório | — | — | ✅ | ✅ |
| Conectar ou remover canais e chaves de IA; webhooks; lançar campanha; excluir contatos; enviar WhatsApp avulso; exportar dados pessoais (LGPD); usuários | — | — | — | ✅ |

Rotas `/v1/admin/...` usam o `PlatformAdminGuard` (admin da plataforma Walletz), fora deste esquema.

## 6. Como proteger uma rota nova

1. Coloque o controller sob `@UseGuards(JwtAuthGuard, RbacGuard)`.
2. Declare `@Roles(...)` em cada método. Sem isso, a rota é negada.
3. Se a rota pertence a um recurso comercial, use `@RequiresFeature('<recurso>')` no controller. Marque `@PlanExempt()` apenas em consultar e excluir.
4. No serviço:
   - antes de usar um item limitado, chame `planLimits.assertWithinPlan(...)` ou `assertUsable({ item })`;
   - para criar, use `planLimits.withSlot(...)`.
5. Caminho sem login (webhook, fila, rota pública): chame `planLimits.usageBlock(...)` e não execute se vier bloqueio.

## 7. Códigos de erro

| Código | Quando | O painel |
|---|---|---|
| `PLAN_LIMIT_REACHED` | Criar além do limite | Mostra a mensagem da API |
| `PLAN_LIMIT_EXCEEDED` | Usar item acima do limite (os mais novos, depois de rebaixar) | Mostra a mensagem; para usuário, faixa fixa no topo |
| `FEATURE_NOT_IN_PLAN` | Recurso fora do plano ou desligado pelo admin | Mostra a mensagem da API |
| `FEATURE_IN_DEVELOPMENT` | Recurso ainda não homologado | Mostra a mensagem da API |
| `TRIAL_EXPIRED` | Trial vencido | Faixa fixa no topo, com link para a Walletz |
| `TENANT_SUSPENDED` | Suspensa ou cancelada pelo admin | Faixa fixa no topo, com link para a Walletz |
| `ROUTE_ROLE_NOT_DEFINED` | Rota sem `@Roles` (erro de desenvolvimento) | Erro genérico; aparece no log da API |

## 8. Pendências conhecidas

- **PC Connector:** as rotas públicas do script não autenticam o dispositivo (ver [ANALISE_TECNICA_2026-11-04.md §4.5](../architecture/ANALISE_TECNICA_2026-11-04.md)). O recurso está bloqueado em todos os planos, inclusive nessas rotas, até ganhar um segredo por dispositivo e aprovação humana dos comandos.
- **Fluxo antigo de WhatsApp (Embedded Signup):** confere o limite antes de conectar, mas não usa a trava de concorrência. O fluxo principal (app Meta do cliente) usa.
- **Fim do trial:** a organização é bloqueada ao vencer. O admin precisa marcar a organização como ativa ou estender o trial.
