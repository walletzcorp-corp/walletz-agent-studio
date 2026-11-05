# @walletz/worker

Processa as filas BullMQ (`inbox-dispatch`, `campaign-dispatch`, `knowledge`) e o relay do outbox em um
processo separado da API. O código fica em `apps/api/src/worker.ts` para compartilhar módulos, banco e
migrations.

| Processo | Comando                                         | Variável        |
| -------- | ----------------------------------------------- | --------------- |
| API      | `pnpm --filter @walletz/api start`              | `QUEUE_ROLE=api` |
| Worker   | `pnpm --filter @walletz/worker start`           | (definida pelo entrypoint) |
| Tudo em um (dev) | `pnpm --filter @walletz/api start`      | `QUEUE_ROLE` ausente ou `all` |

`QUEUE_ROLE` deve vir do ambiente do processo, não do `.env.local` (é lido quando os módulos carregam).
