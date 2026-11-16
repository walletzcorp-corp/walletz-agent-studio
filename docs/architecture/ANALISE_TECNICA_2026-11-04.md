# Análise técnica do Walletz Agent Studio

**Data:** 2026-11-04 (segunda versão, substitui a primeira do mesmo dia)
**Commit analisado:** `53e5f08` (branch `master`)
**Classificação:** interno. Este documento descreve falhas de segurança ainda abertas e como reproduzi-las. Não deve sair da equipe.

## Conclusão

**O produto não está pronto para clientes reais.**

- **Não sobe do jeito documentado:** a API quebra no boot com o `.env.example`, as migrations param na metade e o front não compila para produção.
- **Não isola empresas:** qualquer pessoa que crie uma conta gratuita passa pela autorização das **86 rotas de tenant** de outra empresa, desde que tenha o `tenantId` dela.
- **Expõe clientes finais:** um desconhecido no WhatsApp pode receber dados de reuniões de outros clientes da empresa.
- **Vários fluxos só parecem funcionar:** campanha não envia, inbox dá erro 500, convite não tem saída e nenhum PDF é processado.

A base é bem organizada e as consultas costumam filtrar por `tenant_id`. Por isso, os problemas de isolamento têm correção concentrada, principalmente no guard.

## Como a análise foi feita

Desta vez **a API foi executada**, em uma cópia isolada do commit, com Postgres e Redis próprios. Os containers foram removidos no final, e o repositório não foi alterado além deste arquivo.

| Marca | Significado |
|---|---|
| **[T]** | Testado com a API rodando, por HTTP e com o resultado conferido no banco |
| **[T-stub]** | Igual ao [T], mas com um LLM falso local no lugar da Anthropic, que escolhia as chamadas de ferramenta |
| **[C]** | Conclusão pela leitura do código, sem teste |

**O que não foi testado:**

- Meta, Google, Microsoft e Claude reais. As saídas para esses serviços ficaram bloqueadas ou sem credencial.
- As telas no navegador. O front foi avaliado por `tsc`, `next build` e leitura.
- O conector rodando contra um PC. `guardPath` e a injeção em `cmd` foram provados isoladamente, com `echo`.

Com o LLM falso, a chamada de ferramenta é forçada. Isso prova o que o servidor permite, não com que facilidade um modelo real seria induzido a fazê-la.

### O que mudou em relação à primeira versão

| Primeira versão dizia | O teste mostrou |
|---|---|
| Bypass pelo header "precisa de teste" | **Confirmado** nas 86 rotas de tenant |
| Tomada de número de WhatsApp, sem distinguir rotas | A conexão manual **recusa com 409** e valida com a Meta. O risco resta só no `embeddedSignup` [C] |
| `publish` e `rollback` não afetam a execução | **Parcialmente errado:** o rollback funciona. Só o `publish` é indiferente, porque a execução lê a linha atual do agente |
| O servidor não aplica `capabilities` | **Impreciso:** a oferta de ferramentas respeita. Falta a checagem ao enfileirar o comando |
| Sem limite no `history` | **Impreciso:** não há limite de itens, mas o corpo tem teto de 100 KB, e estourar gera 500 em vez de 413 |

**Falhas novas nesta versão:** seções 3.1, 3.2, 4.3 e 4.11, a seção 7 e os itens 2 e 6 da seção 5, além de várias linhas da seção 6.

## 1. O que o sistema faz

É um SaaS multi-tenant em que cada empresa cria agentes de IA, ensina esses agentes com documentos e regras, testa no Laboratório e os coloca para atender no WhatsApp. Os agentes também podem agendar reuniões (Google/Microsoft) e executar tarefas em um PC Windows.

## 2. Arquitetura real

```text
Next.js 15 (apps/web)  -- Bearer JWT no localStorage -->  NestJS (apps/api) /api/v1
                                                            |-- PostgreSQL (Drizzle)
Meta WhatsApp  -- webhook ------------------------------->  |-- Redis/BullMQ (só conhecimento)
Google/Microsoft  -- OAuth ------------------------------>  |-- Disco local (uploads/)
PC Windows  -- polling a cada 1s ------------------------>  |-- Anthropic
```

Fluxo de uma mensagem: webhook, depois contato e conversa, depois `LabService.chat`. Esse método monta o prompt, chama o Claude, executa as ferramentas e a resposta volta pelo WhatsApp.

| Documentado no [CLAUDE.md](../../CLAUDE.md) | Situação real |
|---|---|
| `apps/worker` | Não existe; tudo roda dentro da API |
| `packages/ai`, `integrations`, `testing` | Não existem |
| RAG com pgvector | Nenhum embedding é gerado; a busca é `ILIKE` na primeira palavra com mais de 3 letras [T] |
| Storage S3/MinIO | Disco local, com a chave fixa `dev-signing-key` ([storage.service.ts:66](../../apps/api/src/shared/storage/storage.service.ts#L66)) |
| Outbox | Marca eventos como publicados sem publicar nada ([outbox-relay.service.ts](../../apps/api/src/shared/outbox/outbox-relay.service.ts)) |
| Rate limiting | `ThrottlerModule` sem guard: 60 logins errados seguidos, 60 respostas 401 e nenhum 429 [T] |
| Billing | Módulo vazio; a tela não chama a API |
| `docker compose up` na raiz, `pnpm test:e2e` | O compose está em `infra/docker/`, não há Dockerfile e o script `test:e2e` não existe |

[STATUS.md](../release/STATUS.md) foi atualizado pela última vez em 2026-10-06. Ele marca vários módulos como pendentes, o que é honesto, mas não cobre o que foi feito depois, como o PC Connector.

## 3. Bloqueadores: o sistema não sobe como documentado

### 3.1 A API quebra no boot com o `.env.example` [T]

- O código exige `MICROSOFT_OAUTH_CLIENT_ID`, `_SECRET` e `_TENANT_ID` com `getOrThrow` ([ms-graph-auth.service.ts:41](../../apps/api/src/modules/calendars/ms-graph-auth.service.ts#L41)). O template traz `MICROSOFT_CLIENT_ID`.
- Resultado: `Configuration key "MICROSOFT_OAUTH_CLIENT_ID" does not exist`, e o processo termina. Mesmo quem não usa Microsoft precisa dessas variáveis.
- Lidas pelo código e ausentes do template: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `MICROSOFT_OAUTH_*`, `CALENDAR_ENCRYPTION_KEY`, `PORT`.
- Sem efeito no código: `FEATURE_*`, `RATE_LIMIT_*`, `STRIPE_*`, `OTEL_*`, `WORKER_URL`.
- O redirect padrão da Microsoft aponta para `/v1/tenants/callback/microsoft`, sem `/api`, então não bate com a rota real [C].

### 3.2 O front não compila para produção [T]

- `next build` falha em [register/page.tsx:39](../../apps/web/src/app/%28auth%29/register/page.tsx#L39), e `tsc` acusa **40 erros**, 18 deles em `cadastro/page.tsx`.
- `packages/ui` importa `react-hook-form` sem declarar a dependência.
- `next dev` não faz essa checagem de tipos, o que explica o problema passar despercebido.

### 3.3 Migrations incompletas, e o comando diz que deu certo [T]

- O [_journal.json](../../apps/api/src/database/migrations/meta/_journal.json) só registra 0000 a 0002. Em banco novo, `drizzle-kit migrate` aplica 3 das 7 e responde `migrations applied successfully`.
- Ficam de fora agendas, reuniões, configurações de agendamento e PC. As rotas que usam essas tabelas devem falhar em banco novo, inclusive o Laboratório, que consulta agendamento e dispositivos [C].
- O próximo `db:generate` cria um `0003` que recria 5 tabelas, colidindo com os arquivos existentes.
- Aplicados à mão e em ordem, os arquivos 0003 a 0006 funcionam, e foi assim que os testes seguiram.

### 3.4 Nenhum controle de qualidade roda [T]

| Verificação | Resultado |
|---|---|
| CI | Só dispara em `main`, `staging` e `develop`; o branch atual é `master` |
| `tsc` na API | 13 erros, todos no único teste |
| `jest` na API | A suíte não compila: 0 testes executados |
| `test:isolation` | A configuração do jest nem é lida (`testPathPattern` inválido) |
| `eslint` na API e `next lint` no front | Não existe configuração de ESLint: um falha e o outro abre um prompt interativo |
| Testes no monorepo | 1 arquivo; nenhum teste E2E ou de avaliação de agente |

## 4. Falhas críticas de segurança

### 4.1 Qualquer conta acessa outra empresa pelo header [T]

- O guard usa `request.tenantId`, vindo do header `x-tenant-slug`, antes do `tenantId` da URL: [rbac.guard.ts:47](../../apps/api/src/shared/rbac/rbac.guard.ts#L47). O controller, porém, usa o da URL.
- **Como explorar:** criar conta e empresa própria (não exige e-mail verificado [T]) e enviar o próprio slug com o ID da vítima na URL.
- **Resultado:** o sweep passou pelo guard em **86 de 86 rotas de tenant**. Com dados reais, listou os membros da vítima e renomeou a empresa dela para `HACKED`. Sem o header, a mesma chamada dá 403.
- **Limite:** é preciso conhecer o `tenantId`. Ele é um UUID v7 não enumerável, mas aparece em URLs, logs e no `state` do OAuth.
- **Cuidado na correção:** o front envia esse header em toda chamada ([api.ts](../../apps/web/src/lib/api.ts)). Exigir que o header coincida com a URL evita quebrar as chamadas legítimas.

### 4.2 28 rotas nem precisam do header [T]

- Sem `@Roles`, o guard libera qualquer usuário logado: [rbac.guard.ts:32](../../apps/api/src/shared/rbac/rbac.guard.ts#L32).
- Afeta Laboratório, conversas, contatos, segmentos, campanhas, parte do WhatsApp e parte de Privacy. A lista está no anexo.
- Confirmado por um usuário de fora: listar contatos, exportar dados pessoais (LGPD), inserir contato, usar o Laboratório da vítima e **lançar campanha**.
- Também dentro da empresa: um `viewer` passa pelo guard nas mutações dessas rotas, como excluir contato ou enviar mensagem.

### 4.3 Desconhecido no WhatsApp recebe dados de outros clientes [T-stub]

- O webhook chama o agente sem `conversationId` nem `contactId` ([whatsapp.service.ts:824](../../apps/api/src/modules/whatsapp/whatsapp.service.ts#L824)).
- Assim, `find_meetings` fica sem filtro de pessoa e devolve as reuniões da empresa inteira ([scheduling-tools.service.ts:265](../../apps/api/src/modules/calendars/scheduling-tools.service.ts#L265)).
- **No teste:** um número novo disparou a ferramenta, e o resultado entregue ao modelo trazia o e-mail de outra cliente, além dos IDs das reuniões.
- `cancel_meeting` e `reschedule_meeting` também só verificam o tenant, então esses IDs bastariam para alterar a reunião de outra pessoa [C].
- **Condição real:** a ferramenta só é oferecida ao modelo quando o agendamento está habilitado no agente, e o modelo precisa decidir chamá-la. Uma pergunta comum ("quais reuniões estão marcadas?") pode bastar, pois não há barreira no servidor.

### 4.4 Refresh token pode ser forjado sem nenhum segredo [T]

- O refresh não valida a assinatura do JWT e compara com bcrypt, que só considera 72 bytes: cabeçalho fixo e o início do `sub` ([auth.service.ts](../../apps/api/src/modules/auth/auth.service.ts), [session.service.ts](../../apps/api/src/modules/auth/session.service.ts)).
- **No teste:** um token montado só com o `userId` e o `sessionId`, sem secret, gerou tokens válidos, e `/auth/me` respondeu como a vítima. Access token e assinatura falsa também foram aceitos.
- **Limite:** é preciso conhecer o `sessionId`, que está dentro de qualquer access token, mesmo expirado. Um token vazado uma vez dá acesso indefinido.
- **Efeito colateral:** enviar lixo com o `sessionId` de alguém revoga a sessão dessa pessoa, sem autenticação.

### 4.5 PC Connector sem autenticação e sem aprovação humana [T, T-stub]

- As rotas do conector são públicas, embora o comentário diga o contrário ([pc-connector.controller.ts:87](../../apps/api/src/modules/pc-connector/pc-connector.controller.ts#L87)). Quem tem o `deviceId` lê comandos e **forja resultados, que chegam ao modelo** [T-stub].
- Um `viewer` lê o `pairingToken` na listagem e **pareia um PC próprio** na empresa [T]. A partir daí, ele recebe os comandos dos agentes.
- Mensagem de WhatsApp de um desconhecido gerou `pc.readFile`, com `requiresApproval: false` fixo no código ([pc-connector.service.ts:133](../../apps/api/src/modules/pc-connector/pc-connector.service.ts#L133)) [T-stub].
- As ferramentas do PC continuaram oferecidas com `allowed: false` na permissão do agente e com o agente fora de `authorizedAgentIds` [T-stub]. Com `capabilities` desligadas, deixam de ser oferecidas, mas o servidor ainda aceita o comando [T-stub].
- Por padrão, ao parear, 6 ferramentas ficam ativas, inclusive criar arquivo e abrir URL [T-stub].
- No script local: `pc.openUrl` passa a URL para `cmd /c start`, e o `&` executa outro comando ([walletz-pc-connector.mjs:283](../../scripts/walletz-pc-connector.mjs#L283)). `guardPath` compara só o prefixo, então uma pasta vizinha também passa ([walletz-pc-connector.mjs:183](../../scripts/walletz-pc-connector.mjs#L183)). Ambos provados isoladamente [T].

### 4.6 A cadeia WhatsApp até o PC está bloqueada por acidente [C]

- A [documentação da API](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools) exige nomes de ferramenta no padrão `^[a-zA-Z0-9_-]{1,128}$`, e `pc.readFile` tem ponto. Com a API real, a chamada deve falhar com erro 400 sempre que um PC estiver online, derrubando também o atendimento normal da empresa.
- Esse erro aparece para o usuário como "ANTHROPIC_API_KEY não está configurada", porque o código trata qualquer mensagem com `invalid` assim ([lab.service.ts:294](../../apps/api/src/modules/lab/lab.service.ts#L294)). O mapeamento foi confirmado com o LLM falso [T-stub].
- **Não renomeie as ferramentas antes de corrigir o item 4.5.** O erro é a única coisa impedindo a cadeia completa.

### 4.7 Webhook do WhatsApp aceita mensagem sem assinatura [T]

- Sem o header, a API só registra um aviso e processa ([whatsapp.service.ts:552](../../apps/api/src/modules/whatsapp/whatsapp.service.ts#L552)). No teste, criou conversa e acionou o agente. Sem `META_APP_SECRET`, nada é verificado [C].
- Assinatura errada de mesmo tamanho é recusada com 401, o que está correto. Tamanho diferente dá 500 ([whatsapp.service.ts:548](../../apps/api/src/modules/whatsapp/whatsapp.service.ts#L548)), assim como payload malformado.
- **Reenvio duplica:** 3 entregas do mesmo `wamid` geraram 3 mensagens e **3 chamadas ao LLM**.

### 4.8 Dados sensíveis retornados ao cliente [T]

- `GET /users/profile` devolve `passwordHash`, `mfaSecret` e os tokens de verificação e reset ([users.controller.ts:17](../../apps/api/src/modules/users/users.controller.ts#L17)).
- As rotas de conta do WhatsApp devolvem `accessToken` e `appSecret`, além do `verifyToken` em claro, para qualquer usuário de fora.
- `mfaSecret` e o token de reset ficam em texto puro no banco.

### 4.9 Escalada de papel [T]

- O body de `PATCH members/:id/role` não é validado ([tenants.controller.ts:114](../../apps/api/src/modules/tenants/tenants.controller.ts#L114)). Um admin **se promoveu a owner e rebaixou o owner real**. Papel inválido gera 500.

### 4.10 OAuth e tomada de número [C]

- O `state` é um base64 sem assinatura ([calendars.service.ts:116](../../apps/api/src/modules/calendars/calendars.service.ts#L116)), e decodificá-lo mostra `tenantId` em claro [T]. O callback é público, então um atacante poderia vincular a própria agenda à empresa de outra pessoa. O fluxo completo não foi testado, por falta de credenciais reais.
- `embeddedSignup` não verifica o tenant no upsert ([whatsapp.service.ts:260](../../apps/api/src/modules/whatsapp/whatsapp.service.ts#L260)). Com um código válido da Meta e o `phoneNumberId` da vítima, sobrescreveria o token dela.

### 4.11 Dependências com falhas críticas [T]

`pnpm audit --prod` aponta **132 vulnerabilidades: 5 críticas, 52 altas, 67 moderadas e 8 baixas**.

- **As 5 críticas são do `next@15.0.0`**, incluindo execução remota de código sem autenticação no protocolo de React Server Components (corrigida a partir da 15.0.5).
- O bypass de middleware (CVE-2025-29927) não se aplica hoje, pois não existe `middleware.ts`. As demais dependem do cenário, como imagens ou hospedagem em Windows.
- Atualizar para `next >= 15.5.28` cobre as 5.
- Há altas em `axios@1.7.7`, `multer@1.4.4-lts.1`, `drizzle-orm@0.34.1` e `path-to-regexp`. A exploração de cada uma não foi avaliada.

## 5. Falhas que quebram funcionalidades

1. **`@CurrentUser('userId')` devolve o objeto inteiro** ([current-user.decorator.ts:6](../../apps/api/src/modules/auth/decorators/current-user.decorator.ts#L6)), em 15 usos [T]:
   - **Erro 500:** criar segmento, criar campanha, assumir conversa e responder pela inbox.
   - **Sem erro, mas errado:** em `audit_logs`, grava `{"sub":...,"email":...}` no lugar do ID.
2. **Nenhum PDF é processado** [T]: até um PDF válido termina em `failed` com `pdfParse is not a function`. O código chama como função ([file-parser.ts:52](../../apps/api/src/modules/knowledge/parsers/file-parser.ts#L52)), e o `pdf-parse` instalado é o 2.4.5, com outra interface. TXT, CSV e HTML funcionam. DOCX não foi testado.
3. **Campanha não envia** [T]: `launch` só muda o status para `running`, com 0 destinatários criados.
4. **Inbox não envia:** além do erro 500 do item 1, `sendHumanMessage` só grava `pending`, e nada envia depois [C]. Os filtros são ignorados: `status=resolved` devolveu todas as conversas [T].
5. **Convites sem saída** [T]:
   - O e-mail nunca é enviado (`sendInvite` não tem chamador) e não há rota de aceite.
   - O convidado novo recebe 409 ao se cadastrar e 401 ao entrar.
   - Efeito colateral: convidar um e-mail **impede que essa pessoa se cadastre normalmente**.
6. **Links de e-mail sem página** [C]: `/auth/verify-email`, `/auth/reset-password` e `/auth/accept-invite` não existem no front, então redefinir a senha pela tela não funciona.
7. **Sessão cai em 15 minutos:** o login não devolve `sessionId` [T], e o front exige esse valor para renovar [C].
8. **Conexão de agenda pela tela** [C]: usa `window.location` para `/api/v1/...` no host do front, sem Bearer e sem rewrite no `next.config`.
9. **URL da API** [C]: [api.ts](../../apps/web/src/lib/api.ts) assume `localhost:3001` e chama `/v1`, mas a API responde em `/api/v1`. As telas do PC assumem com `/api`. `NEXT_PUBLIC_API_URL` não está no `.env.example`.
10. **Templates do WhatsApp** [C]: o `onConflict` usa só `accountId`, mas o índice é composto ([whatsapp.service.ts:906](../../apps/api/src/modules/whatsapp/whatsapp.service.ts#L906)). A sincronização deve falhar, e o erro é engolido. Sem templates, a campanha é bloqueada.
11. **Fonte por URL** fica `pending` para sempre [T]; não existe coletor.
12. **Busca de conhecimento fraca** [T]: "qual o valor do plano Ouro?" recuperou 0 trechos, porque só usa a primeira palavra (`qual`) ([lab.service.ts:333](../../apps/api/src/modules/lab/lab.service.ts#L333)). "plano Ouro custa quanto?" encontrou o mesmo documento.
13. **Excluir dispositivo com comandos** dá 500 [T].
14. **Telas sem ligação com a API** [C]: dashboard, billing, custos, resultados, configurações, configurações/IA, onboarding, meta, meta/templates e admin não fazem chamadas de dados. A área admin exige o papel `super_admin`, que não existe no backend.
15. **Telas duplicadas:** `/login` e `/auth/login`; `/register`, `/auth/register` e `/cadastro`.

## 6. Regras de negócio e conformidade

| Tema | Problema | Marca |
|---|---|---|
| **Agendamento sem evento** | Reunião salva como `confirmed` e `external_event_id` nulo, pela API e pelo agente. No agente, a falha do provedor é engolida ([scheduling-tools.service.ts:199](../../apps/api/src/modules/calendars/scheduling-tools.service.ts#L199)) | T, C |
| **Reagendamento** | A nova reunião perde o `external_event_id`, e o evento antigo não é alterado no provedor ([calendars.service.ts:459](../../apps/api/src/modules/calendars/calendars.service.ts#L459)) | T, C |
| **Conflito de horário** | Sobreposição parcial passa, e horário de reunião cancelada continua bloqueado ([calendars.service.ts:344](../../apps/api/src/modules/calendars/calendars.service.ts#L344)) | T |
| **Conflito por empresa** | A checagem vale para o tenant inteiro, não por agenda: duas pessoas não podem ter reunião no mesmo horário | C |
| **Agenda real ignorada** | A ferramenta do agente só olha reuniões do banco, não a agenda do Google/Microsoft, embora o prompt diga "horários reais" ([scheduling-tools.service.ts:68](../../apps/api/src/modules/calendars/scheduling-tools.service.ts#L68)) | C |
| **Fuso horário** | Usa o fuso do servidor ([availability.service.ts:50](../../apps/api/src/modules/calendars/availability.service.ts#L50)). Em servidor UTC, o horário "09:00" vira **06:00 em Brasília** | T |
| **Cancelamento** | Se a exclusão externa falha, a reunião fica cancelada só no sistema ([calendars.service.ts:530](../../apps/api/src/modules/calendars/calendars.service.ts#L530)) | C |
| **Dados do contato** | Agendar pelo agente apaga os `customFields` do contato: `cpf` e `plano` sumiram ([scheduling-tools.service.ts:235](../../apps/api/src/modules/calendars/scheduling-tools.service.ts#L235)) | T-stub |
| **Elegibilidade** | Ignora o segmento: um segmento que não casa com ninguém mostrou 2 elegíveis. Contato excluído continua elegível ([campaigns.service.ts:206](../../apps/api/src/modules/campaigns/campaigns.service.ts#L206)) | T |
| **LGPD: anonimização** | O telefone permanece em `conversations` e `whatsapp_message_logs`, e o conteúdo das mensagens também | T |
| **LGPD: exportação** | Omite as mensagens, e `messageCount` conta conversas | C |
| **Consentimento** | A importação aceita "granted" sem prova, e o envio direto não verifica consentimento nem opt-out | T, C |
| **Opt-out** | `SAIR` funciona, mas `quero sair`, `pare de me mandar` e `Stop.` não são reconhecidos | T |
| **Prompt injection** | Trechos de documento entram no system prompt sem separação. Um item `permission` entra como regra | T-stub |
| **Agente no WhatsApp** | Pega um agente qualquer: rascunho responde, e **agente pausado também** ([whatsapp.service.ts:814](../../apps/api/src/modules/whatsapp/whatsapp.service.ts#L814)). Não há histórico da conversa | T-stub |
| **Publicação** | A execução lê a linha atual do agente, não a versão publicada. Por isso, editar um agente pausado deve valer na hora, sem publicar | T-stub, C |
| **Conhecimento entre agentes** | Um item ensinado ao Agente 2 aparece no prompt do Agente 1 ([lab.service.ts:162](../../apps/api/src/modules/lab/lab.service.ts#L162)) | T-stub |
| **Custo de IA** | O loop de ferramentas não tem limite: 60 rodadas sem interrupção, e parou só porque o LLM falso parou ([lab.service.ts:226](../../apps/api/src/modules/lab/lab.service.ts#L226)) | T-stub |
| **Cotas** | Só a de membros é aplicada. Plano com limite de 1 agente criou 2 [T], e a cota de mensagens não é verificada [C] | T, C |
| **Segredos** | Chave de criptografia fixa quando `ENCRYPTION_KEY` falta, mesmo em produção ([encryption.service.ts:25](../../apps/api/src/shared/crypto/encryption.service.ts#L25)). Sem `CALENDAR_ENCRYPTION_KEY`, a chave muda a cada restart | C |
| **Logs** | `req.url` é registrado com a query, inclusive `verify-email?token=...` e `code` do OAuth ([logging.interceptor.ts:25](../../apps/api/src/shared/interceptors/logging.interceptor.ts#L25)). Fora de produção, o e-mail inteiro com o token vai para o stdout | T |
| **E-mail em produção** | Sem `SMTP_HOST`, nada é enviado e a API responde sucesso ([mail.service.ts:14](../../apps/api/src/shared/mail/mail.service.ts#L14)) | C |
| **Auditoria** | O audit log é "fire-and-forget", e rotas como alterar papel e convidar não o geram | C |
| **Tratamento de erro** | CSV sem arquivo, CSV malformado, importação sem array, corpo acima de 100 KB e chave estrangeira inválida dão 500. A resposta traz `errorId`, sem `traceId` | T |
| **Conta** | Login não exige e-mail verificado. Empresa suspensa continua acessível. Senhas iguais nos primeiros 72 bytes são aceitas | T |
| **Tokens no front** | Access e refresh ficam no `localStorage`, expostos em caso de XSS | C |
| **Script de seed** | `seed-dev-user.mjs` tem credenciais fixas e não recusa rodar em produção | C |

### Proibições do CLAUDE.md

| Proibição | Situação |
|---|---|
| Mock/fake em rotas de produção | **Violada** no front: telas com dados fixos (item 14 da seção 5) |
| Misturar dados entre tenants | **Violada** (4.1 e 4.2) |
| Logar secrets e tokens | **Violada** (Logs, seção 6) |
| Confirmar agendamento sem `external_event_id` | **Violada** (seção 6) |
| Marcar integração conectada sem handshake | **Atendida** na conexão manual [T]; `embeddedSignup` troca o código com a Meta [C] |
| Campanha sem consentimento e elegibilidade | **Parcial:** o gateway bloqueia sem consentimento [T], mas conta contato excluído, e o envio direto não verifica |
| Texto de usuário ou documento conceder permissão | **Violada** na prática: documentos e itens entram no system prompt |
| Aprendizado automático sem aprovação | **Atendida:** itens de conhecimento só entram no prompt se aprovados [C] |
| Apagar dados por falha de pagamento | **Não se aplica:** billing não existe |
| Declarar pronto sem evidência | **Sem evidência automatizada:** não há teste funcionando |

## 7. Resiliência

| Cenário | Resultado | Marca |
|---|---|---|
| **Postgres reinicia com a API rodando** | **O processo da API morre** e não volta: `Unhandled 'error' event`, porque o `Pool` não tem listener de erro ([database.module.ts:19](../../apps/api/src/database/database.module.ts#L19)) | T |
| **Banco fora** | `/ready` responde **200** com `not_ready`, então um orquestrador não tira a instância do ar ([health.controller.ts:39](../../apps/api/src/modules/health/health.controller.ts#L39)). Login dá 500 | T |
| **Redis fora** | Criar fonte de conhecimento fica pendurado (sem resposta em 15 s), e `/ready` continua `ready`, pois não testa Redis | T |
| **Erro no início de `triggerAiResponse`** | A primeira consulta fica fora do `try` em uma chamada `void`, o que pode derrubar o processo por rejeição não tratada | C |
| **Comando do PC** | A requisição HTTP fica presa até 30 s esperando o conector, por chamada de ferramenta | C |

## 8. Situação por módulo

Prefixo `/api/v1`. São 109 endpoints, e a linha a linha está no anexo.

| Módulo | Qtd. | Proteção | O que foi visto |
|---|---:|---|---|
| **Auth** | 12 | 6 públicas, 6 JWT | Registro, login, logout e MFA respondem. Refresh forjável (4.4), sem rate limit |
| **Users** | 1 | JWT | Retorna hash e segredos (4.8) |
| **Health** | 2 | Pública | `ready` sempre 200 (seção 7) |
| **Tenants** | 9 | JWT, `@Roles` nas de tenant | Bypass (4.1), escalada (4.9), convite sem saída |
| **Agents** | 14 | `@Roles` | CRUD, publicar, pausar e rollback funcionam. Publicação e permissões não governam a execução |
| **Knowledge** | 7 | `@Roles` | TXT, CSV e HTML processam. PDF falha, URL não é coletada |
| **Teach** | 7 | `@Roles` | Criar e aprovar funcionam. Sem filtro por agente na execução |
| **Lab** | 1 | Só JWT | Aberto a qualquer conta (4.2) |
| **Conversations** | 7 | Só JWT | Aberto (4.2); envio e `assume` dão 500 |
| **Contacts** | 5 | Só JWT | Aberto (4.2); `search` ignorado, importação sem validação |
| **Campaigns** | 8 | Só JWT | Aberto (4.2); criar dá 500, lançar não envia |
| **WhatsApp** | 12 | Mista | Webhook sem assinatura (4.7), credenciais expostas (4.8). Conexão manual correta |
| **Calendars** | 12 | `@Roles`, callback público | Reunião sem provedor, conflito incorreto (seção 6), `state` sem assinatura (4.10) |
| **Privacy** | 4 | Mista | Exportação aberta (4.2), anonimização incompleta |
| **PC Connector** | 8 | Mista | 3 rotas públicas sem segredo (4.5), `pairingToken` exposto |

## 9. O que está bem feito

Confirmado em teste [T]:

- Anônimo é barrado em todas as 86 rotas de tenant.
- Logout invalida o access token.
- Assinatura errada de webhook, com o mesmo tamanho, é recusada.
- O slug da vítima, sem ser membro dela, dá 403.
- Conexão manual do WhatsApp valida com a Meta e recusa número de outra empresa.
- A elegibilidade bloqueia contato sem consentimento (`no_consent`).
- O rollback restaura a configuração do agente.
- A fila de conhecimento processa TXT, CSV e HTML.
- A varredura do histórico do git por padrões de chave (Anthropic, AWS, Meta, GitHub, chave privada) só achou um placeholder de exemplo. Não é uma garantia exaustiva.

Pela leitura [C]:

- Separação clara por módulos, e consultas de serviço quase sempre filtradas por `tenant_id`.
- AES-256-GCM para tokens, UUID v7 e bcrypt 12 nas senhas.
- `ValidationPipe` restritivo, Helmet e Swagger desligado em produção.
- Reaprovação obrigatória ao editar conhecimento.

## 10. Ordem de correção recomendada

1. **Bloqueio imediato de segurança:**
   - No guard: negar por padrão, usar só o `tenantId` da URL e recusar header divergente.
   - Colocar `@Roles` em todas as rotas de tenant.
   - Exigir assinatura no webhook.
   - Atualizar o `next` para `>= 15.5.28`.
   - Desligar o PC Connector até o passo 4.
2. **Vazamento pelo WhatsApp:** passar `conversationId` e `contactId` ao agente e fazer as ferramentas de reunião exigirem esse escopo.
3. **Autenticação:**
   - Validar o JWT no refresh e guardar SHA-256 do token.
   - Ativar o `ThrottlerGuard`.
   - Limpar as respostas de `profile` e WhatsApp.
   - Validar o papel, e impedir mexer em owner.
   - Assinar o `state` do OAuth.
4. **PC Connector:**
   - Criar um segredo por dispositivo e não expor `pairingToken`.
   - Abrir URLs sem `cmd` e usar `path.relative` no `guardPath`.
   - Aplicar permissões no servidor e implementar a aprovação humana.
   - Separar agente externo de ferramentas locais.
   - **Só depois** renomear as ferramentas.
5. **Fazer subir:**
   - Corrigir o `.env.example` e tornar a Microsoft opcional.
   - Corrigir o journal de migrations.
   - Corrigir os 40 erros de tipo.
   - Adicionar listener de erro no `Pool` e fazer `/ready` responder 503 e testar Redis.
6. **Testes e CI:**
   - Fazer o CI rodar em `master`.
   - Configurar o ESLint e corrigir a suíte de isolamento.
   - Transformar o sweep deste documento em teste automático, que percorra todas as rotas e falhe se uma rota nova aceitar usuário de fora.
7. **Fluxos quebrados:** decorator `@CurrentUser`, PDF, envio da inbox e das campanhas, convites, páginas de e-mail, `sessionId` e o agendamento (provedor, reagendamento, conflito e fuso).
8. **Depois disso:** worker e filas, S3, embeddings reais, LGPD completa, billing e remoção dos dados fixos.

## Anexo: resultado por endpoint

Cada rota foi chamada com IDs aleatórios e corpo vazio. Por isso, **400 ou 404 significa que a chamada passou pelo guard** e parou depois. **401 e 403 significam barrada.** As rotas de exclusão não apagaram nada, porque os IDs não existiam. Rotas sem ID podem ter efeito: `pair-token`, por exemplo, criou registros no banco de teste.

- **Anônimo:** sem token.
- **De fora:** dono de outra empresa, sem header.
- **De fora + header:** o mesmo usuário, com `x-tenant-slug` da própria empresa.
- **Viewer:** membro da empresa-alvo com o menor papel.
- **Dono:** dono da empresa-alvo. Um 500 aqui indica erro não tratado para aquela entrada, não necessariamente que a rota esteja sempre quebrada.

`POST /auth/logout` ficou fora, para não encerrar a sessão de teste. Ela exige JWT, e seu efeito foi testado à parte. `POST /auth/refresh` é pública: o 401 dela vem da sessão inexistente, não de falta de autenticação. Por rodar com corpo vazio, esta tabela mede a autorização, não o funcionamento: as falhas funcionais estão na seção 5.

`…` representa `/tenants/{tenantId}`.

### Auth (12)

| Método | Rota | Anônimo | De fora | De fora + header | Viewer | Dono |
|---|---|---:|---:|---:|---:|---:|
| POST | `/auth/register` | 400 | 400 | 400 | 400 | 400 |
| GET | `/auth/verify-email` | 400 | 400 | 400 | 400 | 400 |
| POST | `/auth/login` | 400 | 400 | 400 | 400 | 400 |
| POST | `/auth/refresh` | 401 | 401 | 401 | 401 | 401 |
| POST | `/auth/forgot-password` | 400 | 400 | 400 | 400 | 400 |
| POST | `/auth/reset-password` | 400 | 400 | 400 | 400 | 400 |
| POST | `/auth/change-password` | 401 | 400 | 400 | 400 | 400 |
| GET | `/auth/mfa/setup` | 401 | 200 | 200 | 200 | 200 |
| POST | `/auth/mfa/confirm` | 401 | 400 | 400 | 400 | 400 |
| POST | `/auth/mfa/disable` | 401 | 400 | 400 | 400 | 400 |
| GET | `/auth/me` | 401 | 200 | 200 | 200 | 200 |
| POST | `/auth/logout` | não testado | não testado | não testado | não testado | não testado |

### Users (1)

| Método | Rota | Anônimo | De fora | De fora + header | Viewer | Dono |
|---|---|---:|---:|---:|---:|---:|
| GET | `/users/profile` | 401 | 200 | 200 | 200 | 200 |

### Health (2)

| Método | Rota | Anônimo | De fora | De fora + header | Viewer | Dono |
|---|---|---:|---:|---:|---:|---:|
| GET | `/health` | 200 | 200 | 200 | 200 | 200 |
| GET | `/ready` | 200 | 200 | 200 | 200 | 200 |

### Tenants (9)

| Método | Rota | Anônimo | De fora | De fora + header | Viewer | Dono |
|---|---|---:|---:|---:|---:|---:|
| POST | `/tenants` | 401 | 400 | 400 | 400 | 400 |
| GET | `/tenants/my` | 401 | 200 | 200 | 200 | 200 |
| GET | `…` | 401 | 403 | 200 | 200 | 200 |
| PATCH | `…/settings` | 401 | 403 | 200 | 403 | 200 |
| GET | `…/feature-flags` | 401 | 403 | 200 | 200 | 200 |
| GET | `…/members` | 401 | 403 | 200 | 200 | 200 |
| POST | `…/members/invite` | 401 | 403 | 400 | 403 | 400 |
| PATCH | `…/members/{membershipId}/role` | 401 | 403 | 404 | 403 | 404 |
| DELETE | `…/members/{membershipId}` | 401 | 403 | 404 | 403 | 404 |

### Agents (14)

| Método | Rota | Anônimo | De fora | De fora + header | Viewer | Dono |
|---|---|---:|---:|---:|---:|---:|
| GET | `…/agents/templates` | 401 | 403 | 200 | 200 | 200 |
| GET | `…/agents/tools` | 401 | 403 | 200 | 200 | 200 |
| GET | `…/agents` | 401 | 403 | 200 | 200 | 200 |
| POST | `…/agents` | 401 | 403 | 400 | 403 | 400 |
| GET | `…/agents/{agentId}` | 401 | 403 | 404 | 404 | 404 |
| PATCH | `…/agents/{agentId}` | 401 | 403 | 404 | 403 | 404 |
| DELETE | `…/agents/{agentId}` | 401 | 403 | 404 | 403 | 404 |
| POST | `…/agents/{agentId}/publish` | 401 | 403 | 404 | 403 | 404 |
| POST | `…/agents/{agentId}/pause` | 401 | 403 | 404 | 403 | 404 |
| POST | `…/agents/{agentId}/resume` | 401 | 403 | 404 | 403 | 404 |
| GET | `…/agents/{agentId}/releases` | 401 | 403 | 404 | 404 | 404 |
| POST | `…/agents/{agentId}/releases/{releaseId}/rollback` | 401 | 403 | 404 | 403 | 404 |
| GET | `…/agents/{agentId}/tool-permissions` | 401 | 403 | 404 | 404 | 404 |
| POST | `…/agents/{agentId}/tool-permissions` | 401 | 403 | 400 | 403 | 400 |

### Knowledge (7)

| Método | Rota | Anônimo | De fora | De fora + header | Viewer | Dono |
|---|---|---:|---:|---:|---:|---:|
| GET | `…/knowledge` | 401 | 403 | 200 | 200 | 200 |
| GET | `…/knowledge/{sourceId}` | 401 | 403 | 404 | 404 | 404 |
| DELETE | `…/knowledge/{sourceId}` | 401 | 403 | 404 | 403 | 404 |
| POST | `…/knowledge/upload` | 401 | 403 | 400 | 403 | 400 |
| POST | `…/knowledge/url` | 401 | 403 | 400 | 403 | 400 |
| POST | `…/knowledge/typed` | 401 | 403 | 400 | 403 | 400 |
| POST | `…/knowledge/{sourceId}/retry` | 401 | 403 | 404 | 403 | 404 |

### Teach (7)

| Método | Rota | Anônimo | De fora | De fora + header | Viewer | Dono |
|---|---|---:|---:|---:|---:|---:|
| GET | `…/teach` | 401 | 403 | 200 | 200 | 200 |
| POST | `…/teach` | 401 | 403 | 400 | 403 | 400 |
| GET | `…/teach/{itemId}` | 401 | 403 | 404 | 404 | 404 |
| PATCH | `…/teach/{itemId}` | 401 | 403 | 404 | 403 | 404 |
| DELETE | `…/teach/{itemId}` | 401 | 403 | 404 | 403 | 404 |
| POST | `…/teach/{itemId}/approve` | 401 | 403 | 404 | 403 | 404 |
| POST | `…/teach/{itemId}/revoke-approval` | 401 | 403 | 404 | 403 | 404 |

### Lab (1)

| Método | Rota | Anônimo | De fora | De fora + header | Viewer | Dono |
|---|---|---:|---:|---:|---:|---:|
| POST | `…/lab/chat` | 401 | 400 | 400 | 400 | 400 |

### Conversations (7)

| Método | Rota | Anônimo | De fora | De fora + header | Viewer | Dono |
|---|---|---:|---:|---:|---:|---:|
| GET | `…/conversations` | 401 | 200 | 200 | 200 | 200 |
| GET | `…/conversations/{conversationId}` | 401 | 404 | 404 | 404 | 404 |
| GET | `…/conversations/{conversationId}/messages` | 401 | 404 | 404 | 404 | 404 |
| POST | `…/conversations/{conversationId}/messages` | 401 | 400 | 400 | 400 | 400 |
| POST | `…/conversations/{conversationId}/assume` | 401 | 404 | 404 | 404 | 404 |
| POST | `…/conversations/{conversationId}/return-to-ai` | 401 | 404 | 404 | 404 | 404 |
| POST | `…/conversations/{conversationId}/resolve` | 401 | 404 | 404 | 404 | 404 |

### Contacts (5)

| Método | Rota | Anônimo | De fora | De fora + header | Viewer | Dono |
|---|---|---:|---:|---:|---:|---:|
| GET | `…/contacts` | 401 | 200 | 200 | 200 | 200 |
| GET | `…/contacts/{contactId}` | 401 | 404 | 404 | 404 | 404 |
| DELETE | `…/contacts/{contactId}` | 401 | 404 | 404 | 404 | 404 |
| POST | `…/contacts/import/json` | 401 | 500 | 500 | 500 | 500 |
| POST | `…/contacts/import/csv` | 401 | 500 | 500 | 500 | 500 |

### Campaigns (8)

| Método | Rota | Anônimo | De fora | De fora + header | Viewer | Dono |
|---|---|---:|---:|---:|---:|---:|
| GET | `…/segments` | 401 | 200 | 200 | 200 | 200 |
| POST | `…/segments` | 401 | 400 | 400 | 400 | 400 |
| DELETE | `…/segments/{segmentId}` | 401 | 404 | 404 | 404 | 404 |
| GET | `…/campaigns` | 401 | 200 | 200 | 200 | 200 |
| POST | `…/campaigns` | 401 | 400 | 400 | 400 | 400 |
| GET | `…/campaigns/{campaignId}` | 401 | 404 | 404 | 404 | 404 |
| GET | `…/campaigns/{campaignId}/eligibility` | 401 | 404 | 404 | 404 | 404 |
| POST | `…/campaigns/{campaignId}/launch` | 401 | 404 | 404 | 404 | 404 |

### WhatsApp (12)

| Método | Rota | Anônimo | De fora | De fora + header | Viewer | Dono |
|---|---|---:|---:|---:|---:|---:|
| GET | `/webhook/whatsapp` | 400 | 400 | 400 | 400 | 400 |
| POST | `/webhook/whatsapp` | 200 | 200 | 200 | 200 | 200 |
| GET | `…/whatsapp/accounts` | 401 | 200 | 200 | 200 | 200 |
| POST | `…/whatsapp/accounts` | 401 | 403 | 400 | 403 | 400 |
| GET | `…/whatsapp/accounts/{accountId}` | 401 | 404 | 404 | 404 | 404 |
| DELETE | `…/whatsapp/accounts/{accountId}` | 401 | 403 | 404 | 403 | 404 |
| POST | `…/whatsapp/embedded-signup` | 401 | 403 | 400 | 403 | 400 |
| POST | `…/whatsapp/accounts/{accountId}/reconnect` | 401 | 403 | 400 | 403 | 400 |
| POST | `…/whatsapp/accounts/{accountId}/send` | 401 | 400 | 400 | 400 | 400 |
| POST | `…/whatsapp/accounts/{accountId}/sync-templates` | 401 | 403 | 204 | 403 | 204 |
| GET | `…/whatsapp/accounts/{accountId}/templates` | 401 | 200 | 200 | 200 | 200 |
| GET | `…/whatsapp/accounts/{accountId}/stats` | 401 | 200 | 200 | 200 | 200 |

### Calendars (12)

| Método | Rota | Anônimo | De fora | De fora + header | Viewer | Dono |
|---|---|---:|---:|---:|---:|---:|
| GET | `…/calendars/connections` | 401 | 403 | 200 | 200 | 200 |
| DELETE | `…/calendars/connections/{connectionId}` | 401 | 403 | 404 | 403 | 404 |
| POST | `…/calendars/sync` | 401 | 403 | 201 | 403 | 201 |
| GET | `…/calendars/{provider}/authorize` | 401 | 403 | 503 | 403 | 503 |
| GET | `/tenants/callback/{provider}` | 302 | 302 | 302 | 302 | 302 |
| GET | `…/calendars/availability` | 401 | 403 | 200 | 200 | 200 |
| GET | `…/calendars/meetings` | 401 | 403 | 200 | 200 | 200 |
| POST | `…/calendars/meetings` | 401 | 403 | 400 | 403 | 400 |
| PATCH | `…/calendars/meetings/{meetingId}/reschedule` | 401 | 403 | 400 | 403 | 400 |
| DELETE | `…/calendars/meetings/{meetingId}` | 401 | 403 | 404 | 403 | 404 |
| GET | `…/calendars/agents/{agentId}/settings` | 401 | 403 | 200 | 200 | 200 |
| PATCH | `…/calendars/agents/{agentId}/settings` | 401 | 403 | 500 | 403 | 500 |

### Privacy (4)

| Método | Rota | Anônimo | De fora | De fora + header | Viewer | Dono |
|---|---|---:|---:|---:|---:|---:|
| GET | `…/privacy/contacts/{contactId}/export` | 401 | 404 | 404 | 404 | 404 |
| DELETE | `…/privacy/contacts/{contactId}` | 401 | 403 | 404 | 403 | 404 |
| GET | `…/privacy/consents` | 401 | 200 | 200 | 200 | 200 |
| POST | `…/privacy/contacts/{contactId}/revoke-consent` | 401 | 403 | 400 | 403 | 400 |

### PC Connector (8)

| Método | Rota | Anônimo | De fora | De fora + header | Viewer | Dono |
|---|---|---:|---:|---:|---:|---:|
| POST | `…/pc-connector/pair-token` | 401 | 403 | 201 | 403 | 201 |
| GET | `…/pc-connector/devices` | 401 | 403 | 200 | 200 | 200 |
| GET | `…/pc-connector/devices/{deviceId}` | 401 | 403 | 404 | 404 | 404 |
| DELETE | `…/pc-connector/devices/{deviceId}` | 401 | 403 | 404 | 403 | 404 |
| PATCH | `…/pc-connector/devices/{deviceId}/capabilities` | 401 | 403 | 404 | 403 | 404 |
| POST | `/pc-connector/pair` | 404 | 404 | 404 | 404 | 404 |
| GET | `/pc-connector/devices/{deviceId}/commands` | 200 | 200 | 200 | 200 | 200 |
| POST | `/pc-connector/devices/{deviceId}/commands/{commandId}/result` | 404 | 404 | 404 | 404 | 404 |
