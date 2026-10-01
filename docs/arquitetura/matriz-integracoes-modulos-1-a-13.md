# Matriz de Integrações — Módulos 1 a 13

## Mapa de Dependências

```
M1 ORG ──→ todos os módulos (organizationId)

M2 PAC ──→ M3 AGE  (patient.id → appointment.patientId)
M2 PAC ──→ M4 PEP  (patient.id → entry.patientId)
M2 PAC ──→ M9 TIS  (patient.id → guide.patientId)
M2 PAC ──→ M10 CRM (patient.id → lead.convertedToPatientId)
M2 PAC ──→ M12 INT (patient.id → portalSession.patientId, consentGrant.patientId)
M2 PAC ──→ M11 IA  (patient.id → aiDraft.patientId)
M2 PAC ──→ M13 SAL (patient.id → roomBooking.patientId, flowEvent.patientId)

M3 AGE ──→ M4 PEP  (appointment.id → entry.appointmentId)
M3 AGE ──→ M9 TIS  (appointment.id → guide.appointmentId)
M3 AGE ──→ M13 SAL (appointment.id → roomBooking.appointmentId)

M4 PEP ──→ M11 IA  (entry.id → aiDraft.entryId — rascunho vinculado a entrada)

M9 TIS ──→ M8 FIN  (faturamento de guias → receita)
M10 CRM ──→ M2 PAC (conversão lead → paciente)

M13 SAL ──→ M8 FIN (custo de sala → despesa — via integração futura)
M13 SAL ──→ M7 EST (insumos consumidos na sala — via integração futura)
M12 INT ──→ M2 PAC (portal do paciente acessa dados do paciente)
```

## Tabela de Integrações

| Módulo | Integra com | Campo/Mecanismo | Obrigatoriedade |
|--------|-------------|-----------------|-----------------|
| ORG (M1) | Todos | `organizationId` FK | Obrigatório em toda operação |
| PAC (M2) | AGE (M3) | `patient.id → appointment.patientId` | Obrigatório |
| PAC (M2) | PEP (M4) | `patient.id → entry.patientId` | Obrigatório |
| PAC (M2) | TIS (M9) | `patient.id → guide.patientId` | Opcional |
| PAC (M2) | CRM (M10) | `patient.id → lead.convertedToPatientId` | Na conversão |
| PAC (M2) | INT (M12) | `patient.id → portalSession.patientId` | Na criação de sessão |
| PAC (M2) | IA (M11) | `patient.id → aiDraft.patientId` | Opcional |
| PAC (M2) | SAL (M13) | `patient.id → roomBooking.patientId` | Opcional |
| AGE (M3) | PEP (M4) | `appointment.id → entry.appointmentId` | Opcional |
| AGE (M3) | TIS (M9) | `appointment.id → guide.appointmentId` | Opcional |
| AGE (M3) | SAL (M13) | `appointment.id → roomBooking.appointmentId` | Opcional |
| PEP (M4) | IA (M11) | `entry.id → aiDraft.entryId` | Opcional |
| TIS (M9) | FIN (M8) | Faturamento convênio → receita | Manual por ora |
| CRM (M10) | PAC (M2) | Conversão lead → paciente | Na conversão |
| SAL (M13) | FIN (M8) | Custo sala → despesa | Integração futura |
| SAL (M13) | EST (M7) | Insumos sala → consumo | Integração futura |
| INT (M12) | PAC (M2) | Portal acessa paciente por ID | Via sessão autenticada |

## Isolamento de Dados Sensíveis

| Dado | Módulo Origem | Não Disponível Em |
|------|---------------|-------------------|
| Diagnósticos, exames, prescrições | PEP (M4) | CRM (M10), IA (M11) para segmentação comercial |
| Dados de atendimento clínico | PEP/AGE | CRM (M10) — proibido por design |
| Dados financeiros pessoais | FIN (M8) | CRM (M10) — apenas métricas agregadas |
| Rascunho IA | IA (M11) | Apenas para revisor humano designado |
| secretHash webhook | INT (M12) | Nunca exposto após criação |
| configJson conector | INT (M12) | Nunca retornado em listagens |

## Fluxo M13 SAL → M3 AGE → M2 PAC

```
Paciente agendado (AGE)
  → Reserva de sala criada (SAL) vinculada ao appointment
  → Paciente chega: flowEvent ENTRADA registrado
  → Sala ocupa: status OCUPADA
  → Consulta encerra: flowEvent SAIDA registrado
  → Higienização: status HIGIENIZACAO
  → Checklist de liberação executado
  → Sala retorna: status LIVRE
```
