# M18 — Engajamento, Referência e Reputação (ENG)

**Status:** Implementado (F2)  
**Fase:** F2 (10 RFs), F3 (2 RFs)  
**Dependências:** M1 (ORG), M4 (PRO), M5 (PAC), M6 (AGD)

## Objetivo

Gestão de perfil público da organização, encaminhamentos entre profissionais e organizações, avaliações de pacientes, rede de parceiros e campanhas segmentadas por tipo (educativo, assistencial, comercial).

## Requisitos Funcionais

| ID | Descrição | Fase | Status |
|---|---|---|---|
| RF-ENG-001 | Perfil público da organização com slug, nome, especialidades | F2 | ✅ |
| RF-ENG-002 | Encaminhamento com destino (org, profissional ou parceiro) | F2 | ✅ |
| RF-ENG-003 | Ciclo de vida do encaminhamento (ENVIADO → ACEITO/RECUSADO → CONCLUIDO) | F2 | ✅ |
| RF-ENG-004 | Avaliação de paciente sem autenticação (patient-facing) | F2 | ✅ |
| RF-ENG-005 | Resposta pública a avaliação com aprovação obrigatória | F2 | ✅ |
| RF-ENG-006 | Rede de parceiros com verificação | F2 | ✅ |
| RF-ENG-007 | Campanha com separação por tipo (EDUCATIVO/ASSISTENCIAL/COMERCIAL) | F2 | ✅ |
| RF-ENG-008 | Pesquisa de satisfação por estágio (PRE/POS_ATENDIMENTO/etc.) | F2 | ✅ |
| RF-ENG-009 | Bloqueio de dupla resposta a pesquisa | F2 | ✅ |
| RF-ENG-010 | Dashboard de engajamento | F2 | ✅ |
| RF-ENG-011 | Gestão de consentimento e preferências de contato | F3 | — |
| RF-ENG-012 | Limite de frequência de comunicação por paciente | F3 | — |

## Restrições de Segurança

- Respostas públicas a avaliações passam por aprovação e não revelam relação clínica ou dados de saúde
- Conteúdo educativo, assistencial e comercial são mantidos separados (campos distintos, não combinados)
- Diagnóstico, prontuário ou dado de saúde não usados para segmentação de marketing
- Pacientes não pressionados a avaliar ou indicar
- Consentimentos, preferências de contato e descadastros são respeitados

## Modelos de Dados

- `EngPublicProfile` — perfil público da organização (slug único por org)
- `EngReferral` — encaminhamento com destino flexível (org, profissional ou parceiro)
- `EngReview` — avaliação de paciente com ciclo de moderação
- `EngPartner` — parceiro verificado da rede
- `EngCampaign` — campanha com tipo segregado
- `EngSurvey` — pesquisa de satisfação com bloqueio de dupla resposta

## Endpoints (v1)

```
GET    /v1/eng/:orgId/profile
PUT    /v1/eng/:orgId/profile
POST   /v1/eng/:orgId/referrals
GET    /v1/eng/:orgId/referrals
PATCH  /v1/eng/:orgId/referrals/:id/status
POST   /v1/eng/:orgId/reviews (sem auth)
GET    /v1/eng/:orgId/reviews
POST   /v1/eng/:orgId/reviews/:id/approve-response
POST   /v1/eng/:orgId/partners
PATCH  /v1/eng/:orgId/partners/:id/verify
POST   /v1/eng/:orgId/campaigns
GET    /v1/eng/:orgId/surveys/:id/submit-answers
GET    /v1/eng/:orgId/dashboard
```

## Cobertura de Testes

17 testes passando em `eng.service.spec.ts`.
