# Product Spec — Walletz Agent Studio

**Versão**: 0.1.0  
**Data**: 2026-10-05  
**Status**: Sprint 0

---

## 1. Visão Geral

**Walletz Agent Studio** é um SaaS B2B no-code/low-code que permite empresas criar, ensinar, testar, publicar e operar agentes de inteligência artificial sem precisar de programadores ou especialistas em prompts.

**Usuário central**: Gestor de PME, agência, equipe comercial, atendimento, operações ou agendamento.

**Problema resolvido**: Eliminar a necessidade de combinar chatbot + provedor WhatsApp + base de conhecimento + agenda + CRM + planilha + fluxos + fornecedor de IA em uma experiência única, governada e simples.

**Meta de experiência**: "Ensine sua IA como ensinaria um novo funcionário."

---

## 2. Diferencial Central — Walletz Teach AI

O usuário ensina a IA de cinco formas:
1. Conversando em linguagem natural
2. Enviando documentos (PDF, DOCX, XLSX, CSV, TXT)
3. Adicionando URLs autorizadas
4. Cadastrando perguntas e respostas
5. Corrigindo respostas geradas pela IA

O sistema interpreta, propõe estrutura, exibe conflitos, versiona e exige aprovação humana antes de qualquer publicação.

---

## 3. Personas

### Maria — Gestora Comercial (PME)
- 35 anos, gerencia equipe de 5 vendedores
- Usa WhatsApp para prospecção, não tem TI
- Quer automatizar qualificação de leads sem contratar desenvolvedor
- Não sabe o que é RAG, embedding ou prompt engineering
- Sucesso: cria primeiro agente em 30 minutos

### Carlos — Dono de Clínica (Agendamento)
- 42 anos, clínica com 3 dentistas
- Reclamações de agenda lotada por WhatsApp fora do horário
- Quer agente que agenda, confirma e lembra consultas
- Usa Google Calendar
- Sucesso: zero double bookings, agente responde 24/7

### Ana — Head de Operações (Agência)
- 38 anos, agência com 15 clientes
- Precisa de múltiplos agentes para diferentes clientes
- Quer governança, controle, relatórios
- Sucesso: gerencia 15 agentes com uma equipe de 2 pessoas

---

## 4. Módulos do Produto (P0 para release comercial)

| ID | Módulo | Prioridade |
|----|--------|-----------|
| A | Organização, tenancy e usuários | P0 |
| B | Meus Agentes | P0 |
| C | Walletz Teach AI | P0 |
| D | Laboratório de IA | P0 |
| E | Conversas / Inbox | P0 |
| F | WhatsApp Business Platform | P0 |
| G | Contatos, leads e importação | P0 |
| H | Campanhas e cadências | P0 |
| I | Agenda Google e Microsoft 365 | P0 |
| J | Ferramentas e ações do agente | P0 |
| K | Learning Loop supervisionado | P0 |
| L | Analytics | P0 |
| M | Billing e planos | P0 |
| N | Administração da plataforma | P0 |

---

## 5. Planos Iniciais

| Plano | Agentes | Usuários | Canais | Features |
|-------|---------|---------|--------|----------|
| Starter | 1 | 2 | 1 | Base de conhecimento, Inbox, volume controlado |
| Growth | 5 | 10 | 2 | + Importação, Cadências, 1 Agenda, Analytics |
| Professional | 15 | 30 | 5 | + Automação visual P1, Governança, Analytics avançado |
| Enterprise | Negociado | Negociado | Negociado | + SSO, White label, Suporte premium |

Todos os limites são configuráveis sem redeploy.

---

## 6. Restrições e Não-Escopo

- **NÃO É** um CRM enterprise completo (sem pipeline de vendas complexo, sem deals, sem forecasting)
- **NÃO USA** WhatsApp Web automatizado, scraping ou técnicas não oficiais
- **NÃO APRENDE** automaticamente sem aprovação humana
- **NÃO MISTURA** dados entre tenants em nenhuma circunstância
- **NÃO EXPÕE** segredos ou dados sensíveis em logs

---

## 7. Métricas de Sucesso (Produto)

- Time-to-first-agent < 30 minutos para usuário não técnico
- Grounded answer rate > 85% (respostas com fonte verificável)
- Handoff rate < 20% (agente resolve sem humano)
- Zero cross-tenant data leaks
- Uptime > 99,9% após maturação

---

## 8. Roadmap de Alto Nível

| Fase | Conteúdo | Meta |
|------|----------|------|
| Sprint 0 | Fundação, repo, CI, infra | Build limpo, CI verde |
| Sprint 1 | Auth, tenancy, RBAC, design system | Suite cross-tenant verde |
| Sprint 2 | Agent Builder | Usuário cria agente sem prompt |
| Sprint 3 | Ingestão de conhecimento | Documentos reais processados |
| Sprint 4 | Teach AI | Regra aprovada auditável |
| Sprint 5 | RAG + tools + tracing | Respostas com fonte |
| Sprint 6 | Laboratório + publicação | Gate P0 funcional |
| Sprint 7 | WhatsApp | Mensagem real/sandbox |
| Sprint 8 | Inbox + handoff | IA nunca compete com atendente |
| Sprint 9 | Leads + importação | Lote reconciliável |
| Sprint 10 | Calendários | Evento real sem double booking |
| Sprint 11 | Campanhas + cadências | Elegibilidade e opt-out |
| Sprint 12 | Analytics + billing | Quota impede ação |
| Sprint 13 | Hardening + release comercial | Gate final aprovado |

---

## 9. User Journeys Principais

Ver [USER_JOURNEYS.md](USER_JOURNEYS.md) para detalhamento completo.

---

## 10. Decisões de Produto Registradas

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| WhatsApp provider | Cloud API oficial Meta | Única opção segura/legal |
| Calendário | Google + Microsoft OAuth | Cobertura 95%+ do mercado |
| LLM primário | Claude (Anthropic) | Melhor reasoning, suporte a pt-BR |
| Idioma padrão | pt-BR | Mercado primário Brasil |
| Consentimento | Por canal + finalidade | LGPD compliance |
