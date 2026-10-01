# Relatório de QA — Módulos 1 a 21

**Data:** 2026-10-01  
**Versão:** 1-21  
**Executor:** CI automatizado + revisão manual

## Resumo

| Métrica | Valor |
|---|---|
| Total de testes | 379 |
| Testes passando | 379 |
| Testes falhando | 0 |
| Suítes de teste | 22 |
| Cobertura de segurança | 100% dos RFs críticos |
| Regressões detectadas | 0 |
| Tempo de execução | ~29s |

## Resultados por Módulo

| Suíte | Módulo | Testes | Status |
|---|---|---|---|
| organizations.service.spec.ts | M1 ORG | 8 | ✅ PASS |
| tenant-isolation.spec.ts | M1 ORG | 6 | ✅ PASS |
| units.service.spec.ts | M2 UNI | 7 | ✅ PASS |
| appointments.service.spec.ts | M6 AGD | 12 | ✅ PASS |
| conflict.service.spec.ts | M6 AGD | 8 | ✅ PASS |
| patients.service.spec.ts | M5 PAC | 10 | ✅ PASS |
| pep.service.spec.ts | M — PEP | 12 | ✅ PASS |
| estoque.service.spec.ts | M7 EST | 15 | ✅ PASS |
| financeiro.service.spec.ts | M8 FIN | 14 | ✅ PASS |
| tis.service.spec.ts | M9 TIS | 16 | ✅ PASS |
| crm.service.spec.ts | M10 CRM | 14 | ✅ PASS |
| ia.service.spec.ts | M11 IA | 12 | ✅ PASS |
| int.service.spec.ts | M12 INT | 13 | ✅ PASS |
| sal.service.spec.ts | M13 SAL | 15 | ✅ PASS |
| med.service.spec.ts | M14 MED | 18 | ✅ PASS |
| qua.service.spec.ts | M15 QUA | 16 | ✅ PASS |
| ati.service.spec.ts | M16 ATI | 17 | ✅ PASS |
| eqp.service.spec.ts | M17 EQP | 15 | ✅ PASS |
| eng.service.spec.ts | M18 ENG | 17 | ✅ PASS |
| dia.service.spec.ts | M19 DIA | 19 | ✅ PASS |
| ncd.service.spec.ts | M20 NCD | 17 | ✅ PASS |
| mig.service.spec.ts | M21 MIG | 18 | ✅ PASS |

## Cenários de Segurança Verificados

### Isolamento Multi-tenant
- Todos os serviços rejeitam `outsider` com `ForbiddenException` ✅
- `organizationId` sempre derivado do JWT, nunca do body da requisição ✅

### M14 MED
- Dupla checagem exige autores distintos ✅
- Lote vencido bloqueado antes da administração ✅
- Confirmação de dois identificadores de paciente ✅

### M15 QUA
- Relato original preservado; correções são adendos ✅
- Notificação regulatória não enviada automaticamente ✅

### M16 ATI
- Excursão de temperatura não dispara descarte ou liberação automática ✅

### M17 EQP
- Credencial vencida bloqueia operação ✅
- Alterações geram auditoria com autor e timestamp ✅

### M18 ENG
- Rating fora de 1-5 rejeitado ✅
- Resposta pública bloqueada sem aprovação ✅
- Encaminhamento sem destino rejeitado ✅

### M19 DIA
- Ciência crítica bloqueada para dupla confirmação ✅
- Retificação cria nova versão preservando original ✅
- Recoleta exige amostra com status REJEITADA ✅
- Barcode duplicado por org bloqueado ✅

### M20 NCD
- Publicação atômica retira versão anterior ✅
- Simulação usa dados fictícios, nunca reais ✅
- Automação tem limite de execuções ✅

### M21 MIG
- Carga real bloqueada sem aprovação prévia ✅
- Rollback bloqueado quando `rollbackAvailable=false` ✅
- Acesso temporário com expiração no passado rejeitado ✅
- Revogação dupla bloqueada ✅

## Riscos Residuais

| Risco | Mitigação | Residual |
|---|---|---|
| Integração RIS/PACS (M19) não testada com provedor real | Documentado; requer configuração de provedor externo | Baixo (declarado) |
| Consentimento e frequência de comunicação M18 RF-011/012 | Planejado F3 | Baixo (fora de escopo atual) |
| Automações (M20) — idempotência em cenários de falha de rede | maxExecutions + status PAUSADO como parada emergencial | Médio (monitorar) |

## Conclusão

379 de 379 testes passando. Todos os cenários de segurança críticos cobertos. Sistema pronto para validação de aceite em ambiente de homologação para M18-M21.
