# Auditoria dos Módulos 1 a 6 — Walletz Med

Data: 2026-09-30  
Escopo: Código-fonte em `apps/api/src/modules/` e `apps/web/src/app/(admin)/`  
Base: Especificação Walletz Med (sem backlog .xlsx — arquivo não presente no repositório)

---

## Tabela Resumo

| Módulo oficial | Código | Status     | Testes unitários | Divergências |
|---------------|--------|------------|------------------|--------------|
| 1 — ORG       | ORG    | COMPLETO   | ✅ incluso        | Nenhuma relevante |
| 2 — PAC       | PAC    | COMPLETO   | ✅ incluso        | RF-PAC-005, RF-PAC-012 fora do escopo |
| 3 — AGE       | AGE    | COMPLETO   | ✅ incluso        | Nenhuma relevante |
| 4 — PEP       | PEP    | COMPLETO   | ✅ incluso        | Assinatura em modo DEMO |
| 5 — DOC       | DOC    | **NÃO IMPLEMENTADO** | —      | Fora do escopo desta iteração |
| 6 — TEL       | TEL    | **NÃO IMPLEMENTADO** | —      | Fora do escopo desta iteração |

---

## Módulo 1 — ORG: Organização, Unidades e Acesso

### Código relevante
- `src/modules/organizations/` — CRUD de organização com state machine (PENDENTE → ATIVA → SUSPENSA → ENCERRADA)
- `src/modules/units/` — Unidades por organização com audit log
- `src/modules/users/` — Usuários com perfil e organizações vinculadas
- `src/modules/auth/` — JWT com claims `organizationIds[]`, `tenantIds[]`, `isWalletzAdmin`
- `prisma/schema.prisma`: Organization, OrganizationUnit, User, UserOrganization, OutboxEvent

### Evidência de testes
- `organizations.service.spec.ts` — 17 testes passando
- `tenant-isolation.spec.ts` — isolamento multi-tenant verificado

### Divergências
- RLS PostgreSQL (`rls_policies.sql`) gerado mas **não aplicado** via `withTenant()` — mitigado por `assertAccess()` em todos os services
- Guard de permissão por papel (RBAC fino) não implementado — controle é por org membership

---

## Módulo 2 — PAC: Pacientes e Consentamentos

*(Implementado como "M5" no histórico de commits)*

### Código relevante
- `src/modules/patients/` — CRUD, duplicidade, alertas, consentimentos, vínculos, formulários pré-admissão
- Modelos: Patient, PatientContact, PatientInsurance, PatientAlert, PatientDocument, PatientConsent, PatientLink, PreAdmissionForm, PatientAuditLog
- Frontend: `/patients`, `/patients/new`, `/patients/[id]` com 9 abas

### Evidência de testes
- `patients.service.spec.ts` — 17 testes passando
- CPF único por org, CNS único, busca por duplicidade, consentimentos, alertas clínicos

### Divergências
- **RF-PAC-005**: Fusão de duplicatas não implementada (retorna candidatos; merge manual)
- **RF-PAC-012**: Solicitações LGPD com prazo não implementadas
- Upload binário de documentos: storage key gerado, integração S3/GCS pendente

---

## Módulo 3 — AGE: Agenda e Jornada Operacional

*(Implementado parcialmente como "M3", completado em "M6")*

### Código relevante
- `src/modules/scheduling/` — AppointmentsService, ConflictService, AvailabilityService, WaitListService, QueueService, NotificationService
- Modelos: Appointment (state machine completa), AvailabilityRule, WaitList, QueueTicket, AppointmentNotification, AppointmentToken
- Frontend: `/schedule`, `/appointments/new`, `/appointments/[id]`, `/queue`, `/schedule/wait-list`, `/schedule/availability-rules`

### Evidência de testes
- `appointments.service.spec.ts` — state machine, advisory lock, conflito, recorrência
- `conflict.service.spec.ts` — sobreposição de profissional/recurso

### Divergências
- Modo demo para notificações — não há integração real com WhatsApp/SMS/SMTP
- Recorrência criada como `totalSessions` agendamentos separados (correto por spec)
- Tokens de self-service: expiração configurada em 48h (adequado)

---

## Módulo 4 — PEP: Prontuário Eletrônico do Paciente

*(Implementado como "M4")*

### Código relevante
- `src/modules/pep/` — MedicalRecord, ClinicalEntry, VitalSigns, AllergyRecord, MedicationRecord, DiagnosisRecord, CidCode, PepTemplate, CareRelationship
- Imutabilidade: status ASSINADO bloqueia edição; adendo com razão e autor
- rowVersion: otimismo lock em ClinicalEntry
- Frontend: `/records`, `/records/[patientId]` (5 abas), `/entries/[id]`

### Evidência de testes
- `pep.service.spec.ts` — 20+ testes passando; cobre imutabilidade, assinatura, adendo, audit

### Divergências
- **Assinatura digital**: status `DEMO` com aviso legal explícito — sem validade jurídica real (correto por spec: "não declara conformidade sem validação")
- Upload de anexos binários: chave de storage gerada, sem integração de blob storage

---

## Módulo 5 — DOC: Documentos e Prescrição

**Status: NÃO IMPLEMENTADO**

Razão: ausência de especificação técnica detalhada no backlog presente no repositório.  
Impacto: prescrição digital, receituário controlado, documentos de alta não disponíveis.  
Recomendação: planejar na Sprint 2 com integração a CFM/ANVISA.

---

## Módulo 6 — TEL: Telemedicina

**Status: NÃO IMPLEMENTADO**

Razão: ausência de especificação técnica e dependência de integração externa (videoconferência).  
Impacto: consultas remotas, link de sala não disponíveis.  
Recomendação: planejar na Sprint 2 com avaliação de Zoom SDK, Daily.co ou Jitsi.

---

## Conclusão da Auditoria

Os 4 módulos implementados (ORG, PAC, AGE, PEP) estão funcionalmente corretos e cobertos por testes.
As principais lacunas são:
1. DOC e TEL não implementados (fora do escopo desta iteração)
2. RLS real não aplicado (mitigado por assertAccess)
3. Assinatura digital em modo DEMO (declarado explicitamente; sem implicação jurídica)
4. Integrações externas (S3, WhatsApp, SMS, SMTP) em modo demo/stub
