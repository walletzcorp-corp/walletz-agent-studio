# Documentação da API — Walletz Agent Studio

| Arquivo | Para quê |
|---|---|
| [REFERENCE.md](REFERENCE.md) | Lista de todas as rotas por módulo (gerada) |
| [openapi.json](openapi.json) | Especificação OpenAPI 3: importe no Postman, Insomnia ou gerador de cliente (gerada) |
| Swagger UI | Documentação interativa: só na máquina de desenvolvimento |

## Swagger (somente local)

Com a API rodando (`pnpm --filter @walletz/api dev`), abra:

- http://localhost:3001/api/docs — interface interativa
- http://localhost:3001/api/docs-json — especificação em JSON

Para testar rotas autenticadas: faça `POST /api/v1/auth/login`, copie o `accessToken` da resposta, clique em **Authorize** e cole o token. A autorização fica salva no navegador entre recarregamentos.

### Por que não abre em produção

São duas barreiras independentes (código em `apps/api/src/shared/docs/swagger.ts`):

1. **Ambiente:** com `NODE_ENV=production` ou `staging` o Swagger nem é registrado. A imagem Docker da API já define `NODE_ENV=production`, então em produção `/api/docs` responde 404.
2. **Host:** mesmo fora de produção, a documentação só responde quando acessada por `localhost`, `127.0.0.1` ou `[::1]`. Qualquer outro host recebe 404. A checagem usa o header `Host` e não o IP, porque atrás do nginx toda requisição chega de 127.0.0.1.

Testes: `apps/api/src/shared/docs/__tests__/swagger.spec.ts`.

## Atualizar os arquivos gerados

Sempre que criar ou alterar rotas:

```bash
pnpm --filter @walletz/api dev            # terminal 1
pnpm --filter @walletz/api docs:openapi   # terminal 2
```

O script lê `http://localhost:3001/api/docs-json` (mude com `API_DOCS_URL`) e reescreve `openapi.json` e `REFERENCE.md`. Commite os dois junto com a mudança.

## Como documentar uma rota nova

```ts
@ApiTags('agents')                 // módulo (precisa existir em buildOpenApiConfig)
@ApiBearerAuth()                   // rota exige JWT
@Controller('tenants/:tenantId/agents')
export class AgentsController {
  @Post()
  @ApiOperation({ summary: 'Criar agente' })   // aparece na referência
  create(@Body() dto: CreateAgentDto) { ... }
}
```

Nos DTOs, use `@ApiProperty()` / `@ApiPropertyOptional()` em cada campo para o corpo aparecer no Swagger.

## Convenções da API

- **Prefixo e versão:** `/api/v1/...`
- **Multi-tenant:** rotas `/tenants/:tenantId/...` exigem que o usuário seja membro da organização; o servidor valida vínculo e papel (RBAC) em toda requisição, independentemente do front.
- **Erros:** JSON com `statusCode`, `message` em português e `traceId` para localizar nos logs.
- **Rotas sem JWT:** login/cadastro/senha, webhooks do WhatsApp (assinatura da Meta), callback OAuth das agendas (`state` de uso único no Redis), conector local (token do dispositivo) e health checks.
