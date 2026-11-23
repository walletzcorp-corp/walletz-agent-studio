# Referência da API — Walletz Agent Studio API

> Arquivo gerado por `pnpm --filter @walletz/api docs:openapi`. Não edite à mão.

Versão 1.0 · 164 rotas · prefixo `/api/v1` · autenticação Bearer (JWT), exceto onde indicado "sem JWT" (login, webhooks, callback OAuth, conector local — protegidos por outros meios).

## Módulos

| Módulo | Descrição | Rotas |
|---|---|---|
| [auth](#auth) | Autenticação e sessões | 12 |
| [tenants](#tenants) | Organizações e configurações | 11 |
| [users](#users) | Usuários e convites | 1 |
| [agents](#agents) | Agentes de IA | 14 |
| [knowledge](#knowledge) | Base de conhecimento | 10 |
| [teach](#teach) | Ensinar a IA (fatos, diretrizes, exemplos) | 7 |
| [lab](#lab) | Laboratório de testes | 1 |
| [conversations](#conversations) | Conversas e inbox | 7 |
| [contacts](#contacts) | Contatos e leads | 5 |
| [campaigns](#campaigns) | Campanhas e cadências | 8 |
| [calendars](#calendars) | Agendas Google e Microsoft | 12 |
| [whatsapp](#whatsapp) | WhatsApp Business | 21 |
| [privacy](#privacy) | LGPD: exportação e exclusão de dados | 4 |
| [pc-connector](#pc-connector) | Conector local (agente no computador do cliente) | 8 |
| [admin](#admin) | Administração da plataforma | 16 |
| [health](#health) | Health checks | 2 |
| [ai-connections](#ai-connections) |  | 9 |
| [webchat](#webchat) |  | 4 |
| [webchat-public](#webchat-public) |  | 5 |
| [webhooks](#webhooks) |  | 7 |

## auth

Autenticação e sessões

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Cadastrar novo usuário | sem JWT |
| `GET` | `/api/v1/auth/verify-email` | Confirmar email | sem JWT |
| `POST` | `/api/v1/auth/login` | Login | sem JWT |
| `POST` | `/api/v1/auth/refresh` | Renovar tokens | sem JWT |
| `POST` | `/api/v1/auth/logout` | Logout | Bearer |
| `POST` | `/api/v1/auth/forgot-password` | Solicitar redefinição de senha | sem JWT |
| `POST` | `/api/v1/auth/reset-password` | Redefinir senha | sem JWT |
| `POST` | `/api/v1/auth/change-password` | Alterar senha | Bearer |
| `GET` | `/api/v1/auth/mfa/setup` | Iniciar configuração de MFA | Bearer |
| `POST` | `/api/v1/auth/mfa/confirm` | Confirmar configuração de MFA | Bearer |
| `POST` | `/api/v1/auth/mfa/disable` | Desativar MFA | Bearer |
| `GET` | `/api/v1/auth/me` | Dados do usuário autenticado | Bearer |

## tenants

Organizações e configurações

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/v1/tenants/plans/catalog` | Catálogo de planos comerciais (v4.2). Nenhum plano inclui tokens de IA. | Bearer |
| `POST` | `/api/v1/tenants` | Criar tenant (onboarding) | Bearer |
| `GET` | `/api/v1/tenants/my` | Listar tenants do usuário autenticado | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}` | Detalhes do tenant | Bearer |
| `PATCH` | `/api/v1/tenants/{tenantId}/settings` | Atualizar configurações do tenant | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/feature-flags` | Recursos liberados para a organização (plano + exceções) | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/plan` | Plano da organização, uso de cada limite e recursos liberados | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/members` | Listar membros do tenant | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/members` | Adicionar usuário à organização (login novo, exclusivo desta organização) | Bearer |
| `PATCH` | `/api/v1/tenants/{tenantId}/members/{membershipId}/role` | Alterar papel do membro (o dono não muda) | Bearer |
| `DELETE` | `/api/v1/tenants/{tenantId}/members/{membershipId}` | Remover membro | Bearer |

## users

Usuários e convites

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/v1/users/profile` | Perfil do usuário autenticado | Bearer |

## agents

Agentes de IA

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/v1/tenants/{tenantId}/agents/templates` | Listar templates de agente disponíveis | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/agents/tools` | Listar ferramentas disponíveis para agentes | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/agents` | Listar agentes do tenant | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/agents` | Criar agente | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/agents/{agentId}` | Detalhes do agente | Bearer |
| `PATCH` | `/api/v1/tenants/{tenantId}/agents/{agentId}` | Atualizar agente | Bearer |
| `DELETE` | `/api/v1/tenants/{tenantId}/agents/{agentId}` | Arquivar agente | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/agents/{agentId}/publish` | Publicar agente (cria nova release) | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/agents/{agentId}/pause` | Pausar agente | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/agents/{agentId}/resume` | Reativar agente pausado | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/agents/{agentId}/releases` | Histórico de releases do agente | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/agents/{agentId}/releases/{releaseId}/rollback` | Fazer rollback para uma release anterior | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/agents/{agentId}/tool-permissions` | Listar permissões de ferramentas do agente | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/agents/{agentId}/tool-permissions` | Definir permissão de ferramenta | Bearer |

## knowledge

Base de conhecimento

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/v1/tenants/{tenantId}/knowledge/formats` | Formatos aceitos e limite técnico por arquivo | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/knowledge` | Listar documentos da base de conhecimento | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/knowledge/{sourceId}` | Detalhes do documento: metadados, trechos, indexação e prévia do texto | Bearer |
| `DELETE` | `/api/v1/tenants/{tenantId}/knowledge/{sourceId}` | Excluir documento (arquivo, texto, trechos e embeddings) | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/knowledge/{sourceId}/download` | Baixar o arquivo original | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/knowledge/upload` | Enviar arquivo (PDF, DOCX, TXT, MD, CSV, HTML) | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/knowledge/url` | Indexar URL (ainda não disponível) | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/knowledge/typed` | Criar conteúdo digitado (título, conteúdo, agente, contexto) | Bearer |
| `PATCH` | `/api/v1/tenants/{tenantId}/knowledge/{sourceId}/agent` | Alterar a associação: agente específico ou compartilhado (null) | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/knowledge/{sourceId}/retry` | Reprocessar (também indexa documentos que aguardavam IA) | Bearer |

## teach

Ensinar a IA (fatos, diretrizes, exemplos)

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/v1/tenants/{tenantId}/teach` | Listar itens de conhecimento ensinados | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/teach` | Criar novo item de conhecimento | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/teach/{itemId}` | Detalhes de um item de conhecimento | Bearer |
| `PATCH` | `/api/v1/tenants/{tenantId}/teach/{itemId}` | Atualizar item de conhecimento (requer reaprovação) | Bearer |
| `DELETE` | `/api/v1/tenants/{tenantId}/teach/{itemId}` | Remover item de conhecimento | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/teach/{itemId}/approve` | Aprovar item de conhecimento para uso em produção | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/teach/{itemId}/revoke-approval` | Revogar aprovação de item | Bearer |

## lab

Laboratório de testes

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `POST` | `/api/v1/tenants/{tenantId}/lab/chat` | Test agent in the lab with RAG | Bearer |

## conversations

Conversas e inbox

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/v1/tenants/{tenantId}/conversations` | Listar conversas (inbox) | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/conversations/{conversationId}` | Detalhar conversa | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/conversations/{conversationId}/messages` | Listar mensagens da conversa | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/conversations/{conversationId}/messages` | Enviar mensagem como atendente humano | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/conversations/{conversationId}/assume` | Assumir a conversa (pausa a IA) | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/conversations/{conversationId}/return-to-ai` | Devolver a conversa para a IA | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/conversations/{conversationId}/resolve` | Marcar conversa como resolvida | Bearer |

## contacts

Contatos e leads

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/v1/tenants/{tenantId}/contacts` | List contacts | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/contacts/{contactId}` | Get contact | Bearer |
| `DELETE` | `/api/v1/tenants/{tenantId}/contacts/{contactId}` | Delete contact | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/contacts/import/json` | Import contacts from JSON array | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/contacts/import/csv` | Import contacts from CSV/XLSX | Bearer |

## campaigns

Campanhas e cadências

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/v1/tenants/{tenantId}/segments` | Listar segmentos de contatos | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/segments` | Criar segmento de contatos | Bearer |
| `DELETE` | `/api/v1/tenants/{tenantId}/segments/{segmentId}` | Excluir segmento | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/campaigns` | Listar campanhas | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/campaigns` | Criar campanha (rascunho) | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/campaigns/{campaignId}` | Detalhar campanha | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/campaigns/{campaignId}/eligibility` | Send Policy Gateway — check eligible recipients | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/campaigns/{campaignId}/launch` | Launch campaign after policy check | Bearer |

## calendars

Agendas Google e Microsoft

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/v1/tenants/{tenantId}/calendars/connections` | Listar conexões de calendário do tenant | Bearer |
| `DELETE` | `/api/v1/tenants/{tenantId}/calendars/connections/{connectionId}` | Desconectar calendário: apaga os tokens e revoga a autorização no provedor | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/calendars/sync` | Verificar agora se as agendas conectadas respondem | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/calendars/{provider}/authorize` | Gerar URL de autorização OAuth (Google ou Microsoft) | Bearer |
| `GET` | `/api/v1/tenants/callback/{provider}` | Callback OAuth (Google/Microsoft) | sem JWT |
| `GET` | `/api/v1/tenants/{tenantId}/calendars/availability` | Obter slots disponíveis para agendamento | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/calendars/meetings` | Listar reuniões | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/calendars/meetings` | Criar reunião | Bearer |
| `PATCH` | `/api/v1/tenants/{tenantId}/calendars/meetings/{meetingId}/reschedule` | Reagendar reunião | Bearer |
| `DELETE` | `/api/v1/tenants/{tenantId}/calendars/meetings/{meetingId}` | Cancelar reunião | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/calendars/agents/{agentId}/settings` | Obter configurações de agendamento do agente | Bearer |
| `PATCH` | `/api/v1/tenants/{tenantId}/calendars/agents/{agentId}/settings` | Atualizar configurações de agendamento do agente | Bearer |

## whatsapp

WhatsApp Business

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/v1/webhook/whatsapp` | Meta webhook verification (GET challenge) | sem JWT |
| `POST` | `/api/v1/webhook/whatsapp` | Receive WhatsApp Cloud API webhook events | sem JWT |
| `GET` | `/api/v1/webhook/whatsapp/{accountId}` | Verificação do webhook exclusivo de um número (app Meta do cliente) | sem JWT |
| `POST` | `/api/v1/webhook/whatsapp/{accountId}` | Eventos do webhook exclusivo de um número (assinados com o App Secret do cliente) | sem JWT |
| `GET` | `/api/v1/tenants/{tenantId}/whatsapp/accounts` | List WhatsApp accounts for tenant | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/whatsapp/accounts` | Conectar número com o app Meta do próprio cliente (token permanente + App Secret, validados na Meta) | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/whatsapp/accounts/{accountId}` | Get WhatsApp account details | Bearer |
| `DELETE` | `/api/v1/tenants/{tenantId}/whatsapp/accounts/{accountId}` | Disconnect a WhatsApp account | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/whatsapp/embedded-signup` | Complete WhatsApp connection via Meta Embedded Signup (code exchange on backend) | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/whatsapp/accounts/{accountId}/webhook-setup` | Callback URL e token de verificação para colar no app Meta do cliente | Bearer |
| `PUT` | `/api/v1/tenants/{tenantId}/whatsapp/accounts/{accountId}/credentials` | Trocar token e/ou App Secret (validados na Meta antes de substituir) | Bearer |
| `PATCH` | `/api/v1/tenants/{tenantId}/whatsapp/accounts/{accountId}/agent` | Definir o agente que responde neste número | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/whatsapp/accounts/{accountId}/reconnect` | Reconnect WhatsApp account (renew token via Embedded Signup) | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/whatsapp/accounts/{accountId}/send` | Send a text message via WhatsApp | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/whatsapp/accounts/{accountId}/waba-subscribe` | Reinscreveu o app na WABA (subscribed_apps) e retorna diagnóstico detalhado da Meta | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/whatsapp/accounts/{accountId}/waba-subscriptions` | Lista apps inscritos na WABA para diagnóstico | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/whatsapp/accounts/{accountId}/sync-templates` | Sync templates from Meta | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/whatsapp/accounts/{accountId}/templates` | List approved templates | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/whatsapp/accounts/{accountId}/stats` | Get message statistics for account | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/whatsapp/accounts/{accountId}/message-logs` | Logs de mensagens recentes com erros de envio (diagnóstico) | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/whatsapp/accounts/{accountId}/pipeline-check` | Diagnóstico completo do pipeline WhatsApp → IA: agente, provedor de IA, webhook subscription | Bearer |

## privacy

LGPD: exportação e exclusão de dados

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/v1/tenants/{tenantId}/privacy/contacts/{contactId}/export` | LGPD Art. 18 I — Export all data for a data subject | Bearer |
| `DELETE` | `/api/v1/tenants/{tenantId}/privacy/contacts/{contactId}` | LGPD Art. 18 VI — Anonymize contact (right to erasure) | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/privacy/consents` | List all consent records for tenant | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/privacy/contacts/{contactId}/revoke-consent` | LGPD Art. 15 I — Revoke consent for a data subject | Bearer |

## pc-connector

Conector local (agente no computador do cliente)

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `POST` | `/api/v1/tenants/{tenantId}/pc-connector/pair-token` | Gerar token de pareamento para novo dispositivo | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/pc-connector/devices` | Listar dispositivos conectados | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/pc-connector/devices/{deviceId}` | Obter dispositivo | Bearer |
| `DELETE` | `/api/v1/tenants/{tenantId}/pc-connector/devices/{deviceId}` | Desconectar dispositivo | Bearer |
| `PATCH` | `/api/v1/tenants/{tenantId}/pc-connector/devices/{deviceId}/capabilities` | Atualizar permissões do dispositivo | Bearer |
| `POST` | `/api/v1/pc-connector/pair` | Parear dispositivo com token | sem JWT |
| `GET` | `/api/v1/pc-connector/devices/{deviceId}/commands` | Buscar comandos pendentes (polling do connector) | sem JWT |
| `POST` | `/api/v1/pc-connector/devices/{deviceId}/commands/{commandId}/result` | Postar resultado de comando executado | sem JWT |

## admin

Administração da plataforma

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/v1/admin/overview` | Dashboard: totais, agentes por tipo e por organização, IA, atividade | Bearer |
| `GET` | `/api/v1/admin/tenants` | Listar organizações (clientes) com métricas | Bearer |
| `POST` | `/api/v1/admin/tenants` | Cadastrar cliente PF (CPF) ou PJ (CNPJ): cria a organização e o login do responsável | Bearer |
| `GET` | `/api/v1/admin/tenants/{tenantId}` | Detalhe da organização: membros, agentes, consumo, atividade | Bearer |
| `GET` | `/api/v1/admin/agents` | Listar agentes de todas as organizações | Bearer |
| `GET` | `/api/v1/admin/users` | Listar usuários da plataforma | Bearer |
| `POST` | `/api/v1/admin/users` | Criar conta de cliente (cadastro público é fechado) | Bearer |
| `GET` | `/api/v1/admin/activity` | Atividade da plataforma (audit log) | Bearer |
| `GET` | `/api/v1/admin/llm` | Conexões de IA (chave do próprio cliente) de todas as organizações | Bearer |
| `POST` | `/api/v1/admin/tenants/{tenantId}/suspend` | Suspender organização (bloqueia o uso; dados preservados) | Bearer |
| `POST` | `/api/v1/admin/tenants/{tenantId}/reactivate` | Reativar organização suspensa | Bearer |
| `POST` | `/api/v1/admin/tenants/{tenantId}/activate` | Ativar organização (encerra o trial; cliente contratado) | Bearer |
| `POST` | `/api/v1/admin/tenants/{tenantId}/extend-trial` | Estender o período de trial | Bearer |
| `PATCH` | `/api/v1/admin/tenants/{tenantId}/plan` | Alterar o plano comercial da organização (Starter, Pro, Business, Agency) | Bearer |
| `PATCH` | `/api/v1/admin/tenants/{tenantId}/features` | Liberar/bloquear um recurso fora do plano (sob medida); null volta ao padrão | Bearer |
| `PATCH` | `/api/v1/admin/tenants/{tenantId}/token-limit` | Definir limite mensal de tokens de IA (null remove) | Bearer |

## health

Health checks

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/v1/health` | Health check | sem JWT |
| `GET` | `/api/v1/ready` | Readiness check | sem JWT |

## ai-connections

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/v1/tenants/{tenantId}/ai-connections/providers` | Provedores homologados e links oficiais de compra/chave | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/ai-connections` | Listar conexões de IA (chave sempre mascarada) | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/ai-connections` | Conectar chave de IA: valida autenticação, modelo e faturamento com uma chamada de teste | Bearer |
| `PATCH` | `/api/v1/tenants/{tenantId}/ai-connections/{connectionId}` | Trocar a chave (rotação), o modelo ou o nome; a nova chave é validada antes de substituir | Bearer |
| `DELETE` | `/api/v1/tenants/{tenantId}/ai-connections/{connectionId}` | Revogar a conexão (a chave cifrada é apagada) | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/ai-connections/{connectionId}/test` | Testar a chave salva (reativa após regularizar o faturamento no provedor) | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/ai-connections/{connectionId}/models` | Modelos disponíveis na conta do provedor | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/ai-connections/{connectionId}/default` | Tornar a conexão padrão da organização | Bearer |
| `PUT` | `/api/v1/tenants/{tenantId}/ai-connections/agents/{agentId}` | Definir qual conexão de IA o agente usa (null = padrão da organização) | Bearer |

## webchat

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/v1/tenants/{tenantId}/webchat/widgets` | Listar widgets de webchat | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/webchat/widgets` | Criar widget de webchat para incorporar ao site | Bearer |
| `PATCH` | `/api/v1/tenants/{tenantId}/webchat/widgets/{widgetId}` | Alterar widget (agente, sites autorizados, aparência, ativo) | Bearer |
| `DELETE` | `/api/v1/tenants/{tenantId}/webchat/widgets/{widgetId}` | Remover widget | Bearer |

## webchat-public

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/v1/public/webchat/widget.js` | Script do widget para incorporar ao site | sem JWT |
| `GET` | `/api/v1/public/webchat/{publicKey}/config` |  | sem JWT |
| `POST` | `/api/v1/public/webchat/{publicKey}/sessions` |  | sem JWT |
| `GET` | `/api/v1/public/webchat/{publicKey}/messages` |  | sem JWT |
| `POST` | `/api/v1/public/webchat/{publicKey}/messages` |  | sem JWT |

## webhooks

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/v1/tenants/{tenantId}/webhooks/events` | Eventos disponíveis para assinatura | Bearer |
| `GET` | `/api/v1/tenants/{tenantId}/webhooks` | Listar webhooks de saída | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/webhooks` | Criar webhook de saída (o segredo de assinatura é exibido só nesta resposta) | Bearer |
| `PATCH` | `/api/v1/tenants/{tenantId}/webhooks/{webhookId}` | Alterar URL, eventos ou pausar/reativar | Bearer |
| `DELETE` | `/api/v1/tenants/{tenantId}/webhooks/{webhookId}` | Remover webhook | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/webhooks/{webhookId}/rotate-secret` | Gerar novo segredo de assinatura | Bearer |
| `POST` | `/api/v1/tenants/{tenantId}/webhooks/{webhookId}/test` | Enviar evento de teste agora | Bearer |

