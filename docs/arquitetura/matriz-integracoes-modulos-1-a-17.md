# Matriz de Integrações — Módulos 1 a 17

**Data**: 2026-10-01

## Legenda

- **→** Consome dados de
- **←** Produz dados para
- **↔** Bidirecional
- **[sim]** Integração simulada (sem credenciais reais)
- **[evt]** Via eventos/outbox pattern

## Matriz

| Módulo | ORG | PAC | AGE | PEP | EST | FIN | TIS | CRM | IA | INT | SAL | MED | QUA | ATI | EQP |
|--------|-----|-----|-----|-----|-----|-----|-----|-----|----|-----|-----|-----|-----|-----|-----|
| **ORG** | — | ← org | ← org | ← org | ← org | ← org | ← org | ← org | ← org | ← org | ← org | ← org | ← org | ← org | ← org |
| **PAC** | → org | — | ← pac | ← pac | — | ← pac | ← pac | ← pac | ← pac | ← pac | ← pac | ← pac | ← pac | — | — |
| **AGE** | → org | → pac | — | ← appt | → est [evt] | → fin [evt] | → tis [evt] | → crm [evt] | → ia | — | → sal | → med | — | → ati | → eqp |
| **PEP** | → org | → pac | → appt | — | — | — | — | — | → ia | — | — | → med | → qua | — | — |
| **EST** | → org | — | — | — | — | → fin [evt] | → tis | — | — | — | — | → med [evt] | — | — | — |
| **FIN** | → org | → pac | → appt | — | → est | — | → tis | — | — | → int [sim] | — | → med | — | — | — |
| **TIS** | → org | → pac | → appt | → pep | → est | → fin | — | — | — | → int [sim] | — | — | → qua | — | — |
| **CRM** | → org | → pac | → appt | — | — | — | — | — | → ia | → int [sim] | — | — | — | — | — |
| **IA** | → org | → pac | → appt | → pep | — | — | — | — | — | — | — | → med | → qua | — | — |
| **INT** | → org | → pac | — | → pep | — | → fin | → tis | → crm | → ia | — | — | — | → qua | — | — |
| **SAL** | → org | — | → appt | — | → est | → fin | → tis | — | — | — | — | — | → qua | → ati | → eqp |
| **MED** | → org | → pac | → appt | → pep | → est [evt] | → fin [evt] | — | — | → ia | — | → sal | — | → qua [evt] | — | → eqp |
| **QUA** | → org | → pac | → appt | → pep | — | — | — | — | → ia | → int [sim] | → sal | → med | — | → ati | → eqp |
| **ATI** | → org | — | → appt | — | — | → fin [evt] | — | — | — | — | → sal | → med | → qua | — | — |
| **EQP** | → org | — | → appt | — | — | — | — | — | — | — | → sal | → med | → qua | — | — |

## Integrações Externas (Todas Simuladas em Desenvolvimento)

| Sistema | Módulo Consumidor | Status | Observação |
|---------|------------------|--------|------------|
| TISS/ANS | TIS | [sim] | Requer credenciais de operadora + ambiente de homologação |
| NFSe | FIN | [sim] | Requer prefeitura + certificado digital |
| SPED/SEFAZ | FIN | [sim] | Requer certificado A1/A3 e ambiente de testes |
| HubSpot | CRM → INT | [sim] | Requer API Key HubSpot |
| RD Station | CRM → INT | [sim] | Requer token RD Station |
| Salesforce | CRM → INT | [sim] | Requer OAuth Salesforce |
| WhatsApp Business | CRM → INT | [sim] | Requer WABA aprovada |
| SMS | CRM → INT | [sim] | Requer conta provedor SMS |
| E-mail (SMTP) | INT | [sim] | Requer credenciais SMTP |
| FHIR R4 / RNDS | INT | [sim] | Requer certificado ICP-Brasil + ambiente RNDS |
| DICOM/PACS | INT | [sim] | Requer servidor PACS + VPN |
| Notificação Regulatória | QUA | [sim] | Requer endpoint do órgão regulador + credenciais |

## Fluxos Críticos de Dados

### Admissão e Atendimento
`AGE → SAL → PEP → MED → EST → FIN → TIS`

### Incidente de Segurança
`MED (reação) → QUA (incidente) → QUA (plano de ação) → QUA (notificação)`

### Gestão de Equipe
`EQP (credencial ativa) → AGE (escala) → SAL (turno) → MED (executor)`

### Rastreabilidade de Medicamento
`EST (lote) → MED (registro) → PEP (prontuário) → QUA (se reação)`

### Manutenção de Ativo
`ATI (ordem) → ATI (bloqueio) → AGE (não reserva) → ATI (liberação)`
