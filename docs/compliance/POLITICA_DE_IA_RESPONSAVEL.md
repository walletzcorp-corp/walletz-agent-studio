# Política de IA Responsável — Walletz Agent Studio

> Atualizado: 2026-10-06 | Versão: 1.0

## Princípios

1. **Transparência**: O usuário final deve saber que está interagindo com um agente de IA.
2. **Controle humano**: Operadores podem pausar o agente e assumir a conversa a qualquer momento.
3. **Aprendizado com aprovação**: Nenhuma atualização automática do agente em produção sem aprovação humana.
4. **Consentimento de texto**: Texto de usuário/documento nunca concede permissão ao agente.
5. **Segregação**: O agente opera dentro dos limites de conhecimento e ferramentas aprovadas pelo tenant.
6. **Auditabilidade**: Toda resposta do agente tem `trace_id` e é auditável.

## Restrições Absolutas (Código)

| Restrição | Implementação |
|-----------|-------------|
| Agente não pode acessar dados de outros tenants | LabService filtra por `tenantId` |
| Agente não pode escalar permissões via prompt | Não existe tool de escalada de privilégio |
| Texto de usuário não concede permissões | Instrução de sistema sobrepõe qualquer prompt |
| Aprendizado automático proibido em produção | Não existe pipeline de fine-tuning automático |
| Respostas geradas rastreadas | Campo `is_ai_generated`, `trace_id` em messages |

## Escalamento para Humano

Quando `conversations.ai_paused_at IS NOT NULL`:
- O agente não responde
- Interface mostra "Agente pausado — operador respondendo"
- Operador humano responde via Inbox
- Para retomar: `PATCH /conversations/:id { "aiPausedAt": null }`

## Modelos de IA Utilizados

| Modelo | Fornecedor | Uso |
|--------|-----------|-----|
| Claude Sonnet 4.x | Anthropic | Respostas do agente |
| Voyage-3 | Anthropic | Embeddings para RAG |

Dados enviados à Anthropic: conteúdo de mensagens e contexto do agente. Nunca: tokens OAuth, senhas, dados de cobrança.

## Avaliação Contínua (Evals)

```bash
pnpm test:evals  # Suíte de avaliações de qualidade do agente
```

Inclui: precisão de resposta, taxa de alucinação, aderência a persona, respostas inapropriadas.

## Revisão Periódica

- Revisão mensal de logs de conversas por operadores do tenant
- Revisão trimestral da política de IA
- Revisão anual com equipe jurídica e de segurança
