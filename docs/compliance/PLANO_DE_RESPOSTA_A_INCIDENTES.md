# Plano de Resposta a Incidentes — Walletz Agent Studio

> LGPD Art. 48 — ANPD Resolução CD/ANPD nº 2/2022
> Atualizado: 2026-10-06

## Classificação de Incidentes

| Severidade | Critério | Prazo ANPD | Exemplos |
|------------|---------|-----------|---------|
| **P0 — Crítico** | Exposição de dados de > 1.000 titulares | 72h | Vazamento de banco, acesso não autorizado em massa |
| **P1 — Alto** | Acesso não autorizado a dados de qualquer titular | 72h | Token comprometido, SQL injection |
| **P2 — Médio** | Falha de serviço sem exposição de dados | 24h interno | Instabilidade, falha de webhook |
| **P3 — Baixo** | Anomalia isolada sem impacto a titulares | 48h interno | Log de erro individual |

## Processo P0/P1 (Dados Expostos)

```
T+0h   Detecção (alerta automático OU report de usuário)
T+1h   Contenção: suspender integrações afetadas, revogar tokens comprometidos
T+2h   Avaliação: escopo, titulares afetados, dados envolvidos
T+4h   Comunicação interna: CTO, CEO, DPO
T+24h  Notificação interna documentada
T+72h  Notificação à ANPD (se houver risco relevante aos titulares)
T+72h  Notificação aos tenants afetados
T+??   Notificação aos titulares (se risco alto ou solicitado pela ANPD)
T+30d  Pós-mortem documentado e plano corretivo
```

## Formulário de Notificação à ANPD

Conforme Resolução CD/ANPD nº 2/2022, notificar via peticionamento.anpd.gov.br com:
- Natureza dos dados pessoais afetados
- Titulares afetados (quantidade estimada)
- Medidas técnicas adotadas
- Riscos e danos possíveis
- Medidas para reverter ou mitigar

## Contatos de Emergência

```
DPO Walletz: a definir (privacidade@walletz.com.br)
CTO: contato interno
ANPD: peticionamento.anpd.gov.br | (61) 3216-6162
```

## Evidências a Preservar

1. Logs de acesso (servidor, API, banco)
2. Audit logs do sistema (tabela `audit_logs`)
3. Últimas 24h de requisições (se possível)
4. Tokens e credenciais suspeitos (invalidar mas preservar hash)
5. Screenshot ou dump do incidente

## Ações Imediatas Disponíveis

```bash
# Revogar acesso de usuário comprometido
POST /tenants/:id/users/:userId/revoke-sessions

# Desconectar conta WhatsApp comprometida  
DELETE /tenants/:id/whatsapp/accounts/:accountId

# Bloquear contato
PATCH /tenants/:id/contacts/:contactId { "isBlocked": true }
```
