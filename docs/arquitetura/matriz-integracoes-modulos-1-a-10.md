# Matriz de Integrações — Módulos 1 a 10

## Mapa de Dependências

```
M1 ORG ──→ M2 PAC  (organizationId)
M1 ORG ──→ M3 AGE  (organizationId)
M1 ORG ──→ M4 PEP  (organizationId)
M1 ORG ──→ M5 DOC  (organizationId — via PAC)
M1 ORG ──→ M6 TEL  (organizationId)
M1 ORG ──→ M7 EST  (organizationId)
M1 ORG ──→ M8 FIN  (organizationId)
M1 ORG ──→ M9 TIS  (organizationId)
M1 ORG ──→ M10 CRM (organizationId)

M2 PAC ──→ M3 AGE  (patient.id → appointment.patientId)
M2 PAC ──→ M4 PEP  (patient.id → entry.patientId)
M2 PAC ──→ M9 TIS  (patient.id → guide.patientId)
M2 PAC ──→ M10 CRM (patient.id → lead.convertedToPatientId, ticket.patientId)

M3 AGE ──→ M4 PEP  (appointment.id → entry.appointmentId)
M3 AGE ──→ M9 TIS  (appointment.id → guide.appointmentId)
M3 AGE ──→ M6 TEL  (appointment.id — jornada operacional)

M6 TEL ──→ M7 EST  (movement.performedBy via atendimento)
M6 TEL ──→ M8 FIN  (entry.unitId — centro de custo)

M9 TIS ──→ M8 FIN  (faturamento de guias → receita)
M10 CRM ──→ M2 PAC (conversão lead → paciente)
```

## Tabela de Integrações

| Módulo | Integra com | Campo/Mecanismo | Obrigatoriedade |
|--------|-------------|-----------------|-----------------|
| ORG (M1) | PAC/AGE/PEP/DOC/TEL/EST/FIN/TIS/CRM | `organizationId` FK | Obrigatório em toda operação |
| PAC (M2) | AGE (M3) | `patient.id → appointment.patientId` | Obrigatório |
| PAC (M2) | PEP (M4) | `patient.id → entry.patientId` | Obrigatório |
| PAC (M2) | TIS (M9) | `patient.id → guide.patientId` | Opcional (guia pode ser sem paciente) |
| PAC (M2) | CRM (M10) | `patient.id → lead.convertedToPatientId` | Na conversão |
| AGE (M3) | PEP (M4) | `appointment.id → entry.appointmentId` | Opcional |
| AGE (M3) | TIS (M9) | `appointment.id → guide.appointmentId` | Opcional |
| PEP (M4) | DOC (M5) | Documento do prontuário | Integrado via entrada |
| TEL (M6) | EST (M7) | Consumo de insumos no atendimento | Futuro (movimentos manuais por ora) |
| TEL (M6) | FIN (M8) | Centro de custo por unidade | Via `unitId` |
| TIS (M9) | FIN (M8) | Faturamento de convênio → receita | Manual por ora |
| CRM (M10) | PAC (M2) | Conversão de lead em paciente | Na conversão |

## Isolamento de Dados

Todo módulo implementa `assertAccess(organizationId, user)`:
- Usuário sem `isWalletzAdmin = true` só acessa organizações em `user.organizationIds[]`
- `organizationId` é sempre derivado do JWT, nunca do body/frontend
- Todos os modelos têm `organizationId` indexado

## Dados Não Cruzados (por design)

| Dado | Módulo Origem | Não Disponível Em |
|------|---------------|-------------------|
| Diagnósticos, exames, prescrições | PEP (M4) | CRM (M10) — proibido por design |
| Dados de atendimento clínico | TEL (M6) | CRM (M10) — proibido por design |
| Dados financeiros pessoais | FIN (M8) | CRM (M10) — apenas métricas agregadas |
| Histórico assistencial | PEP/TEL | Templates/segmentação CRM |
