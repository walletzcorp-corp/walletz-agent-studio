# Mapa de Dados — Walletz Agent Studio

> Registro de Atividades de Tratamento (RAT) — LGPD Art. 37
> Atualizado: 2026-10-06

## Fluxo de Dados: WhatsApp Business

```
Contato (titular) 
  → WhatsApp (Meta Cloud API)
  → Webhook → Walletz API (NestJS)
  → PostgreSQL (dados do tenant, isolados por tenant_id)
  → Agente IA → Anthropic API (processamento LLM)
  → Resposta → WhatsApp → Contato
```

## Tabelas e Dados Pessoais

| Tabela | Dados Pessoais | Retenção | Criptografia |
|--------|---------------|----------|-------------|
| `contacts` | nome, empresa | 2 anos após last contact | Não (estrutural) |
| `contact_identities` | telefone E.164, email | Enquanto ativo | Não (indexado) |
| `consents` | referência ao contato, data, origem | 5 anos | Não |
| `suppressions` | telefone normalizado | Permanente (compliance) | Não |
| `whatsapp_accounts` | **access_token** (criptografado) | Enquanto ativo | ✅ AES-256-GCM |
| `whatsapp_message_logs` | conteúdo de mensagens, de/para | 2 anos | Não |
| `conversations` | referência ao contato | 2 anos | Não |
| `messages` | conteúdo de mensagens | 2 anos | Não |
| `users` | nome, email, senha (hash) | Enquanto conta ativa + 90 dias | Hash bcrypt |
| `audit_logs` | userId, IP, ação | 5 anos | Não |

## Sub-operadores com Acesso a Dados Pessoais

| Sub-operador | Dados Compartilhados | Finalidade | País |
|-------------|---------------------|-----------|------|
| Meta Platforms | Mensagens WhatsApp, número de telefone | Entrega de mensagens | EUA |
| Anthropic | Conteúdo de mensagens (agente IA) | Processamento LLM | EUA |
| PostgreSQL (auto-hospedado) | Todos os dados | Armazenamento | Brasil (dev) |
| Redis | Dados de sessão, filas | Cache e processamento | Brasil (dev) |

## Transferências que Exigem Base Legal Adicional

- **Mensagens → Anthropic**: texto do usuário é enviado para processamento LLM nos EUA. Base: Cláusulas Contratuais Padrão.
- **Mensagens → Meta**: para entrega via Cloud API. Base: Cláusulas Contratuais Padrão.

O tenant (controlador) é responsável por informar os titulares sobre estas transferências na política de privacidade do serviço.
