# ADR-003: Outbox Pattern para Eventos de Domínio

**Data:** 2026-09-30  
**Status:** Aceito

## Decisão
- Eventos de domínio gravados na tabela `outbox_events` dentro da mesma transação do negócio
- Sem broker externo (Kafka/RabbitMQ) nesta etapa
- Consumers futuros lêem a tabela e marcam como processado

## Eventos definidos
- organization.created / organization.status_changed
- unit.created / unit.status_changed
- membership.created / membership.revoked
- professional.linked_to_unit
- resource.published / service.published

## Consequências
- Integração desacoplada: módulos futuros assinam eventos sem depender das tabelas internas
- Idempotência: campo `idempotency_key` nas operações críticas
