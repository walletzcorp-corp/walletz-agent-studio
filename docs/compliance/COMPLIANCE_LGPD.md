# Compliance LGPD — Walletz Agent Studio

> Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais
> Atualizado: 2026-10-06 | Versão: 1.0

---

## 1. Papel da Walletz

| Contexto | Papel | Base Legal |
|----------|-------|------------|
| Dados dos usuários da plataforma (admins, operadores) | Controladora | Art. 7º, V (contrato) |
| Dados dos contatos processados pelos tenants | Operadora | Art. 39 (instruções do controlador) |
| WhatsApp Cloud API | Sub-operadora da Meta | DPA Meta |

A Walletz atua como **operadora** em relação aos contatos dos clientes (tenants). O tenant é o **controlador** dos dados de seus próprios contatos.

---

## 2. Bases Legais Suportadas

| Finalidade | Base Legal LGPD | Implementação |
|------------|----------------|---------------|
| Marketing via WhatsApp | Art. 7º, I (consentimento) | Tabela `consents` com `purpose = marketing` |
| Atendimento ao cliente | Art. 7º, V (contrato) | Canal de conversas inbound |
| Agendamento | Art. 7º, V (contrato) | Integração de calendário |
| Prevenção a fraude | Art. 7º, IX (legítimo interesse) | Auditoria e rate limiting |

---

## 3. Direitos dos Titulares Implementados

| Direito | Art. LGPD | Endpoint | Status |
|---------|-----------|----------|--------|
| Acesso aos dados | Art. 18, I | `GET /tenants/:id/privacy/contacts/:contactId/export` | ✅ |
| Portabilidade | Art. 18, V | Mesmo endpoint (formato JSON estruturado) | ✅ |
| Eliminação/Anonimização | Art. 18, VI | `DELETE /tenants/:id/privacy/contacts/:contactId` | ✅ |
| Revogação de consentimento | Art. 15, I | `POST /tenants/:id/privacy/contacts/:contactId/revoke-consent` | ✅ |
| Opt-out automático | Art. 15, I | Via STOP keyword no WhatsApp | ✅ |
| Correção de dados | Art. 18, III | `PATCH /tenants/:id/contacts/:contactId` (existente) | ✅ |
| Informação sobre compartilhamento | Art. 18, VII | `MAPA_DE_DADOS.md` | 📄 |

---

## 4. Dados Coletados por Categoria

### 4.1 Usuários da Plataforma (Controlados pela Walletz)
- Nome, e-mail, senha (hash bcrypt)
- IP de acesso, user-agent
- Ações no sistema (audit log)
- Plano e dados de cobrança (via Stripe)

### 4.2 Contatos dos Tenants (Controlados pelo Tenant)
- Nome, sobrenome, empresa
- Número de telefone (E.164 normalizado)
- E-mail
- Histórico de conversas e mensagens
- Consentimentos e opt-outs
- Campos personalizados definidos pelo tenant

---

## 5. Retenção de Dados

| Categoria | Período padrão | Justificativa |
|-----------|---------------|---------------|
| Mensagens WhatsApp | 2 anos | Suporte ao cliente |
| Logs de auditoria | 5 anos | Obrigação legal |
| Consentimentos | Duração do relacionamento + 5 anos | Prova de conformidade |
| Dados de cobrança | 5 anos | Obrigação fiscal |
| Dados de usuário após cancelamento | 90 dias (grace period) | Recuperação de conta |
| Chaves e tokens OAuth | Enquanto integração ativa + 30 dias | Operação do serviço |

**NUNCA:** dados de tenant excluídos por falha de pagamento durante grace period.

---

## 6. Segurança dos Dados

| Controle | Implementação |
|----------|--------------|
| Criptografia em trânsito | TLS 1.2+ obrigatório |
| Criptografia em repouso (tokens) | AES-256-GCM via `EncryptionService` |
| Hash de senhas | bcrypt rounds ≥ 12 |
| Isolamento multi-tenant | `tenant_id` em todas as tabelas |
| Logs sem dados sensíveis | Logger estruturado sem tokens/senhas |
| MFA disponível | Implementado em `mfa.service.ts` |
| Rate limiting | ThrottlerModule (10/s, 50/10s, 100/min) |

---

## 7. Transferência Internacional

| Destinatário | País | Base Legal | DPA |
|-------------|------|------------|-----|
| Anthropic (LLM) | EUA | Cláusulas padrão | anthropic.com/privacy |
| Meta Platforms (WhatsApp API) | EUA | Cláusulas padrão | meta.com/legal/dpa |
| AWS/Cloudflare (infra) | EUA/Global | Cláusulas padrão | A definir |

**ATENÇÃO:** Mensagens de usuários podem ser processadas pela Anthropic para geração de respostas do agente. O tenant deve informar seus usuários sobre isso na política de privacidade.

---

## 8. Incidentes de Segurança

Processo:
1. Detecção → alerta automático via observabilidade (OpenTelemetry)
2. Contenção → suspensão de integrações afetadas
3. Notificação → ANPD em 72h (se dados de usuários afetados)
4. Notificação → Tenants afetados em 72h
5. Notificação → Titulares (se alto risco)
6. Pós-mortem documentado

Ver: `PLANO_DE_RESPOSTA_A_INCIDENTES.md`

---

## 9. DPA (Data Processing Agreement)

A Walletz disponibiliza DPA padronizado para clientes que precisam de conformidade LGPD formal na relação controlador-operador. O DPA cobre:

- Finalidades do tratamento
- Categorias de dados e titulares
- Sub-operadores autorizados
- Medidas de segurança
- Assistência aos direitos dos titulares
- Notificação de incidentes
- Exclusão/devolução de dados no encerramento

Status: **Minuta em elaboração** — ver equipe jurídica.
