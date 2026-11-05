# Tenant Isolation Matrix

Gerado automaticamente por `tenant-isolation.e2e-spec.ts` em 2026-11-05T17:27:58.333Z.

- Rotas descobertas: **111** (tenant-scoped: **88**, públicas: 14, autenticadas: 9)
- Ataques executados: **1762** — PASS: **1762** — FAIL: **0**

| METHOD | ROUTE | ROLE | TENANT | ATTACK | EXPECTED | ACTUAL | RESULT |
|---|---|---|---|---|---|---|---|
| POST | `/api/v1/auth/change-password` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/auth/change-password` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/auth/logout` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/auth/logout` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/auth/me` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/auth/me` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/auth/mfa/confirm` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/auth/mfa/confirm` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/auth/mfa/disable` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/auth/mfa/disable` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/auth/mfa/setup` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/auth/mfa/setup` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/pause` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/pause` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/publish` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/publish` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/releases/:releaseId/rollback` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/releases/:releaseId/rollback` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/releases` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/releases` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/resume` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/resume` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | - | A | garbage token | 401 | 401 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/agents/:agentId` | - | A | no token | 401 | 401 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/agents/:agentId` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId` | - | A | garbage token | 401 | 401 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/agents/:agentId` | - | A | no token | 401 | 401 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/agents/:agentId` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/templates` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/templates` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/tools` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/tools` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/:provider/authorize` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/:provider/authorize` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | - | A | garbage token | 401 | 401 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | - | A | no token | 401 | 401 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/availability` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/availability` | - | A | garbage token | 401 | 401 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/connections/:connectionId` | - | A | no token | 401 | 401 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/connections/:connectionId` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/connections` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/connections` | - | A | garbage token | 401 | 401 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId/reschedule` | - | A | no token | 401 | 401 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId/reschedule` | - | A | garbage token | 401 | 401 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId` | - | A | no token | 401 | 401 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/meetings` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/meetings` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/meetings` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/meetings` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/sync` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/sync` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId/eligibility` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId/eligibility` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns/:campaignId/launch` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns/:campaignId/launch` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns` | - | A | garbage token | 401 | 401 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/contacts/:contactId` | - | A | no token | 401 | 401 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/contacts/:contactId` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts/:contactId` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts/:contactId` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/csv` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/csv` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/json` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/json` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/assume` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/assume` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/resolve` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/resolve` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/return-to-ai` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/return-to-ai` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/feature-flags` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/feature-flags` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/:sourceId/retry` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/:sourceId/retry` | - | A | garbage token | 401 | 401 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | - | A | no token | 401 | 401 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/typed` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/typed` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/upload` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/upload` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/url` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/url` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/lab/chat` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/lab/chat` | - | A | garbage token | 401 | 401 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/members/:membershipId/role` | - | A | no token | 401 | 401 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/members/:membershipId/role` | - | A | garbage token | 401 | 401 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/members/:membershipId` | - | A | no token | 401 | 401 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/members/:membershipId` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/members/invite` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/members/invite` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/members` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/members` | - | A | garbage token | 401 | 401 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/commands/:commandId/approve` | - | A | no token | 401 | 401 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/commands/:commandId/approve` | - | A | garbage token | 401 | 401 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId/capabilities` | - | A | no token | 401 | 401 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId/capabilities` | - | A | garbage token | 401 | 401 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | - | A | no token | 401 | 401 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/pc-connector/pair-token` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/pc-connector/pair-token` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/consents` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/consents` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/export` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/export` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/revoke-consent` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/revoke-consent` | - | A | garbage token | 401 | 401 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId` | - | A | no token | 401 | 401 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId` | - | A | garbage token | 401 | 401 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/segments/:segmentId` | - | A | no token | 401 | 401 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/segments/:segmentId` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/segments` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/segments` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/segments` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/segments` | - | A | garbage token | 401 | 401 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/settings` | - | A | no token | 401 | 401 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/settings` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/approve` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/approve` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/revoke-approval` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/revoke-approval` | - | A | garbage token | 401 | 401 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/teach/:itemId` | - | A | no token | 401 | 401 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/teach/:itemId` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach/:itemId` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach/:itemId` | - | A | garbage token | 401 | 401 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/teach/:itemId` | - | A | no token | 401 | 401 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/teach/:itemId` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach` | - | A | garbage token | 401 | 401 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/agent` | - | A | no token | 401 | 401 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/agent` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/reconnect` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/reconnect` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/send` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/send` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/stats` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/stats` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/sync-templates` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/sync-templates` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/templates` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/templates` | - | A | garbage token | 401 | 401 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | - | A | no token | 401 | 401 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/embedded-signup` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/embedded-signup` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/:tenantId` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/my` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/tenants/my` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants` | - | A | no token | 401 | 401 | PASS |
| POST | `/api/v1/tenants` | - | A | garbage token | 401 | 401 | PASS |
| GET | `/api/v1/users/profile` | - | A | no token | 401 | 401 | PASS |
| GET | `/api/v1/users/profile` | - | A | garbage token | 401 | 401 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/pause` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/publish` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/releases/:releaseId/rollback` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/releases` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/resume` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/templates` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/tools` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/:provider/authorize` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/availability` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/connections/:connectionId` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/connections` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId/reschedule` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/meetings` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/meetings` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/sync` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId/eligibility` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns/:campaignId/launch` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/contacts/:contactId` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts/:contactId` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/csv` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/json` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/assume` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/resolve` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/return-to-ai` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/feature-flags` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/:sourceId/retry` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/typed` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/upload` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/url` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/lab/chat` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/members/:membershipId/role` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/members/:membershipId` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/members/invite` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/members` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/commands/:commandId/approve` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId/capabilities` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/pc-connector/pair-token` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/consents` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/export` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/revoke-consent` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/segments/:segmentId` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/segments` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/segments` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/settings` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/approve` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/revoke-approval` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/agent` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/reconnect` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/send` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/stats` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/sync-templates` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/templates` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/embedded-signup` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId` | owner | A->B | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/pause` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/publish` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/releases/:releaseId/rollback` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/releases` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/resume` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/templates` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/tools` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/:provider/authorize` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/availability` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/connections/:connectionId` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/connections` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId/reschedule` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/meetings` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/meetings` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/sync` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId/eligibility` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns/:campaignId/launch` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/contacts/:contactId` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts/:contactId` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/csv` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/json` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/assume` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/resolve` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/return-to-ai` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/feature-flags` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/:sourceId/retry` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/typed` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/upload` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/url` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/lab/chat` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/members/:membershipId/role` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/members/:membershipId` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/members/invite` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/members` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/commands/:commandId/approve` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId/capabilities` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/pc-connector/pair-token` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/consents` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/export` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/revoke-consent` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/segments/:segmentId` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/segments` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/segments` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/settings` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/approve` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/revoke-approval` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/agent` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/reconnect` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/send` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/stats` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/sync-templates` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/templates` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/embedded-signup` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId` | owner | B->A | URL tenant of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/pause` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/publish` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/releases/:releaseId/rollback` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/releases` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/resume` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/templates` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/tools` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/:provider/authorize` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/availability` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/connections/:connectionId` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/connections` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId/reschedule` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/meetings` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/meetings` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/sync` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId/eligibility` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns/:campaignId/launch` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/contacts/:contactId` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts/:contactId` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/csv` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/json` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/assume` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/resolve` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/return-to-ai` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/feature-flags` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/:sourceId/retry` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/typed` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/upload` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/url` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/lab/chat` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/members/:membershipId/role` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/members/:membershipId` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/members/invite` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/members` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/commands/:commandId/approve` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId/capabilities` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/pc-connector/pair-token` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/consents` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/export` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/revoke-consent` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/segments/:segmentId` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/segments` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/segments` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/settings` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/approve` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/revoke-approval` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/agent` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/reconnect` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/send` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/stats` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/sync-templates` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/templates` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/embedded-signup` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId` | owner | A->B | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/pause` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/publish` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/releases/:releaseId/rollback` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/releases` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/resume` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/templates` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/tools` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/:provider/authorize` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/availability` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/connections/:connectionId` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/connections` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId/reschedule` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/meetings` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/meetings` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/sync` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId/eligibility` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns/:campaignId/launch` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/contacts/:contactId` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts/:contactId` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/csv` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/json` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/assume` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/resolve` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/return-to-ai` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/feature-flags` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/:sourceId/retry` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/typed` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/upload` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/url` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/lab/chat` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/members/:membershipId/role` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/members/:membershipId` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/members/invite` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/members` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/commands/:commandId/approve` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId/capabilities` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/pc-connector/pair-token` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/consents` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/export` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/revoke-consent` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/segments/:segmentId` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/segments` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/segments` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/settings` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/approve` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/revoke-approval` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/agent` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/reconnect` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/send` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/stats` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/sync-templates` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/templates` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/embedded-signup` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId` | owner | B->A | own slug header + foreign URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/pause` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/publish` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/releases/:releaseId/rollback` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/releases` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/resume` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/templates` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/tools` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/:provider/authorize` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/availability` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/connections/:connectionId` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/connections` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId/reschedule` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/meetings` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/meetings` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/sync` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId/eligibility` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns/:campaignId/launch` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/contacts/:contactId` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts/:contactId` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/csv` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/json` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/assume` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/resolve` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/return-to-ai` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/feature-flags` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/:sourceId/retry` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/typed` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/upload` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/url` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/lab/chat` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/members/:membershipId/role` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/members/:membershipId` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/members/invite` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/members` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/commands/:commandId/approve` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId/capabilities` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/pc-connector/pair-token` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/consents` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/export` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/revoke-consent` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/segments/:segmentId` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/segments` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/segments` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/settings` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/approve` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/revoke-approval` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/agent` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/reconnect` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/send` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/stats` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/sync-templates` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/templates` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/embedded-signup` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId` | owner | A->B | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/pause` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/publish` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/releases/:releaseId/rollback` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/releases` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/resume` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/templates` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/tools` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/:provider/authorize` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/availability` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/connections/:connectionId` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/connections` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId/reschedule` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/meetings` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/meetings` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/sync` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId/eligibility` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns/:campaignId/launch` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/contacts/:contactId` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts/:contactId` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/csv` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/json` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/assume` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/resolve` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/return-to-ai` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/feature-flags` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/:sourceId/retry` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/typed` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/upload` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/url` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/lab/chat` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/members/:membershipId/role` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/members/:membershipId` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/members/invite` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/members` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/commands/:commandId/approve` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId/capabilities` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/pc-connector/pair-token` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/consents` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/export` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/revoke-consent` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/segments/:segmentId` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/segments` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/segments` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/settings` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/approve` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/revoke-approval` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/agent` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/reconnect` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/send` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/stats` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/sync-templates` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/templates` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/embedded-signup` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId` | owner | B->A | foreign slug header + own URL | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/pause` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/publish` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/releases/:releaseId/rollback` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/releases` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/resume` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/templates` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/tools` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/:provider/authorize` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/availability` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/connections/:connectionId` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/connections` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId/reschedule` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/meetings` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/meetings` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/sync` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId/eligibility` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns/:campaignId/launch` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/contacts/:contactId` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts/:contactId` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/csv` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/json` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/assume` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/resolve` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/return-to-ai` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/feature-flags` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/:sourceId/retry` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/typed` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/upload` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/url` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/lab/chat` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/members/:membershipId/role` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/members/:membershipId` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/members/invite` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/members` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/commands/:commandId/approve` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId/capabilities` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/pc-connector/pair-token` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/consents` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/export` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/revoke-consent` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/segments/:segmentId` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/segments` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/segments` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/settings` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/approve` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/revoke-approval` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/agent` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/reconnect` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/send` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/stats` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/sync-templates` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/templates` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/embedded-signup` | owner | A->B | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId` | owner | A->B | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/pause` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/publish` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/releases/:releaseId/rollback` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/releases` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/resume` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/templates` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/tools` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/:provider/authorize` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/availability` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/connections/:connectionId` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/connections` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId/reschedule` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/meetings` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/meetings` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/sync` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId/eligibility` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns/:campaignId/launch` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/contacts/:contactId` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts/:contactId` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/csv` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/json` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/assume` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/resolve` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/return-to-ai` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/feature-flags` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/:sourceId/retry` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/typed` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/upload` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/url` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/lab/chat` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/members/:membershipId/role` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/members/:membershipId` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/members/invite` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/members` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/commands/:commandId/approve` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId/capabilities` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/pc-connector/pair-token` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/consents` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/export` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/revoke-consent` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/segments/:segmentId` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/segments` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/segments` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/settings` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/approve` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/revoke-approval` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/agent` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/reconnect` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/send` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/stats` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/sync-templates` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/templates` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/embedded-signup` | owner | B->A | body.tenantId of other company | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId` | owner | B->A | query.tenantId of other company | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/pause` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/publish` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/releases/:releaseId/rollback` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/releases` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/resume` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/connections/:connectionId` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId/reschedule` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId/eligibility` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns/:campaignId/launch` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/contacts/:contactId` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts/:contactId` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/assume` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/resolve` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/return-to-ai` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/:sourceId/retry` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/members/:membershipId/role` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/members/:membershipId` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/commands/:commandId/approve` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId/capabilities` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/export` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/revoke-consent` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 400 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/segments/:segmentId` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/approve` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/revoke-approval` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/agent` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/reconnect` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/send` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/stats` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/sync-templates` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/templates` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | owner | A->B | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/pause` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/publish` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/releases/:releaseId/rollback` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/releases` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/resume` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/connections/:connectionId` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId/reschedule` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId/eligibility` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns/:campaignId/launch` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/contacts/:contactId` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts/:contactId` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/assume` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/resolve` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/return-to-ai` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/:sourceId/retry` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/members/:membershipId/role` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/members/:membershipId` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/commands/:commandId/approve` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId/capabilities` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/export` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/revoke-consent` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 400 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/segments/:segmentId` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/approve` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/revoke-approval` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/agent` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/reconnect` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/send` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/stats` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/sync-templates` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/templates` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | owner | B->A | foreign resource id in path (IDOR) | 4xx, no data | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | A->B | foreign id referenced in body | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/meetings` | owner | A->B | foreign id referenced in body | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns` | owner | A->B | foreign id referenced in body | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/typed` | owner | A->B | foreign id referenced in body | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/url` | owner | A->B | foreign id referenced in body | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/lab/chat` | owner | A->B | foreign id referenced in body | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach` | owner | A->B | foreign id referenced in body | 4xx, no data | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/agent` | owner | A->B | foreign id referenced in body | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts` | owner | A->B | foreign id referenced in body | 4xx, no data | 400 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | B->A | foreign id referenced in body | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/meetings` | owner | B->A | foreign id referenced in body | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns` | owner | B->A | foreign id referenced in body | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/typed` | owner | B->A | foreign id referenced in body | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/url` | owner | B->A | foreign id referenced in body | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/lab/chat` | owner | B->A | foreign id referenced in body | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach` | owner | B->A | foreign id referenced in body | 4xx, no data | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/agent` | owner | B->A | foreign id referenced in body | 4xx, no data | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts` | owner | B->A | foreign id referenced in body | 4xx, no data | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/pause` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/pause` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/pause` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/pause` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/publish` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/publish` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/publish` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/publish` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/releases/:releaseId/rollback` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/releases/:releaseId/rollback` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/releases/:releaseId/rollback` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/releases/:releaseId/rollback` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/releases` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/releases` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/releases` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/releases` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/resume` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/resume` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/resume` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/resume` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/agents/:agentId` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/agents/:agentId` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/agents/:agentId` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/agents/:agentId` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/agents/:agentId` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/agents/:agentId` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/templates` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/templates` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/templates` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/templates` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/tools` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/tools` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/tools` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/tools` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/:provider/authorize` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/:provider/authorize` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/:provider/authorize` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 302 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/:provider/authorize` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 302 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/availability` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/availability` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/availability` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/availability` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/connections/:connectionId` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/connections/:connectionId` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/connections/:connectionId` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/connections/:connectionId` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/connections` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/connections` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/connections` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/connections` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId/reschedule` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId/reschedule` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId/reschedule` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId/reschedule` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/meetings` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/meetings` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/meetings` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/meetings` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/meetings` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/meetings` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/meetings` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/meetings` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/sync` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/sync` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 201 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/sync` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 201 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/sync` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 201 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId/eligibility` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId/eligibility` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId/eligibility` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId/eligibility` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns/:campaignId/launch` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns/:campaignId/launch` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns/:campaignId/launch` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns/:campaignId/launch` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/contacts/:contactId` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/contacts/:contactId` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/contacts/:contactId` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/contacts/:contactId` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts/:contactId` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts/:contactId` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts/:contactId` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts/:contactId` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/csv` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/csv` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/csv` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/csv` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/json` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/json` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/json` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/json` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/assume` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/assume` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/assume` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/assume` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/resolve` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/resolve` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/resolve` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/resolve` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/return-to-ai` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/return-to-ai` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/return-to-ai` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/return-to-ai` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/feature-flags` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/feature-flags` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/feature-flags` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/feature-flags` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/:sourceId/retry` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/:sourceId/retry` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/:sourceId/retry` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/:sourceId/retry` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/typed` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/typed` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/typed` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/typed` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/upload` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/upload` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/upload` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/upload` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/url` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/url` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/url` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/url` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| POST | `/api/v1/tenants/:tenantId/lab/chat` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/lab/chat` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/lab/chat` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/lab/chat` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/members/:membershipId/role` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/members/:membershipId/role` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/members/:membershipId/role` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/members/:membershipId/role` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/members/:membershipId` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/members/:membershipId` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/members/:membershipId` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/members/:membershipId` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/members/invite` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/members/invite` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/members/invite` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/members/invite` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| GET | `/api/v1/tenants/:tenantId/members` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/members` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/members` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/members` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/commands/:commandId/approve` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/commands/:commandId/approve` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/commands/:commandId/approve` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/commands/:commandId/approve` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId/capabilities` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId/capabilities` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId/capabilities` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId/capabilities` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| POST | `/api/v1/tenants/:tenantId/pc-connector/pair-token` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/pc-connector/pair-token` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/pc-connector/pair-token` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 201 | PASS |
| POST | `/api/v1/tenants/:tenantId/pc-connector/pair-token` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 201 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/consents` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/consents` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/consents` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/consents` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/export` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/export` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/export` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/export` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/revoke-consent` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/revoke-consent` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/revoke-consent` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/revoke-consent` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/segments/:segmentId` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/segments/:segmentId` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/segments/:segmentId` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/segments/:segmentId` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/segments` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/segments` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/segments` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/segments` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| POST | `/api/v1/tenants/:tenantId/segments` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/segments` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/segments` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/segments` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/settings` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/settings` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/settings` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/settings` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/approve` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/approve` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/approve` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/approve` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/revoke-approval` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/revoke-approval` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/revoke-approval` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/revoke-approval` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/teach/:itemId` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/teach/:itemId` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/teach/:itemId` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach/:itemId` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach/:itemId` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach/:itemId` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/teach/:itemId` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/teach/:itemId` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/teach/:itemId` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/agent` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/agent` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/agent` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/agent` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/reconnect` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/reconnect` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/reconnect` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/reconnect` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/send` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/send` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/send` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/send` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/stats` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/stats` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/stats` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/stats` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/sync-templates` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/sync-templates` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/sync-templates` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/sync-templates` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/templates` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/templates` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/templates` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/templates` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/embedded-signup` | viewer | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/embedded-signup` | operator | A | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/embedded-signup` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/embedded-signup` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| GET | `/api/v1/tenants/:tenantId` | viewer | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId` | operator | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId` | admin | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId` | owner | A | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/pause` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/pause` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/pause` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/pause` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/publish` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/publish` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/publish` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/publish` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/releases/:releaseId/rollback` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/releases/:releaseId/rollback` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/releases/:releaseId/rollback` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/releases/:releaseId/rollback` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/releases` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/releases` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/releases` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/releases` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/resume` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/resume` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/resume` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/resume` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents/:agentId/tool-permissions` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/agents/:agentId` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/agents/:agentId` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/agents/:agentId` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/agents/:agentId` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/agents/:agentId` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/agents/:agentId` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/agents/:agentId` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/templates` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/templates` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/templates` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/templates` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/tools` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/tools` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/tools` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/tools` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/agents` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/:provider/authorize` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/:provider/authorize` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/:provider/authorize` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 302 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/:provider/authorize` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 302 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/agents/:agentId/settings` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/availability` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/availability` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/availability` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/availability` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/connections/:connectionId` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/connections/:connectionId` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/connections/:connectionId` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/connections/:connectionId` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/connections` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/connections` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/connections` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/connections` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId/reschedule` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId/reschedule` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId/reschedule` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId/reschedule` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/calendars/meetings/:meetingId` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/meetings` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/meetings` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/meetings` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/meetings` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/meetings` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/meetings` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/meetings` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/meetings` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/sync` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/sync` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 201 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/sync` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 201 | PASS |
| POST | `/api/v1/tenants/:tenantId/calendars/sync` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 201 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId/eligibility` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId/eligibility` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId/eligibility` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId/eligibility` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns/:campaignId/launch` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns/:campaignId/launch` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns/:campaignId/launch` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns/:campaignId/launch` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns/:campaignId` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/campaigns` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/contacts/:contactId` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/contacts/:contactId` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/contacts/:contactId` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/contacts/:contactId` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts/:contactId` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts/:contactId` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts/:contactId` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts/:contactId` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/csv` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/csv` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/csv` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/csv` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/json` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/json` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/json` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/contacts/import/json` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/assume` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/assume` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/assume` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/assume` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/messages` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/resolve` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/resolve` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/resolve` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/resolve` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/return-to-ai` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/return-to-ai` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/return-to-ai` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/conversations/:conversationId/return-to-ai` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations/:conversationId` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/feature-flags` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/feature-flags` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/feature-flags` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/feature-flags` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/:sourceId/retry` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/:sourceId/retry` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/:sourceId/retry` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/:sourceId/retry` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge/:sourceId` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/typed` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/typed` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/typed` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/typed` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/upload` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/upload` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/upload` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/upload` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/url` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/url` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/url` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/knowledge/url` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| POST | `/api/v1/tenants/:tenantId/lab/chat` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/lab/chat` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/lab/chat` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/lab/chat` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/members/:membershipId/role` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/members/:membershipId/role` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/members/:membershipId/role` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/members/:membershipId/role` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/members/:membershipId` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/members/:membershipId` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/members/:membershipId` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/members/:membershipId` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/members/invite` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/members/invite` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/members/invite` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/members/invite` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| GET | `/api/v1/tenants/:tenantId/members` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/members` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/members` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/members` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/commands/:commandId/approve` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/commands/:commandId/approve` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/commands/:commandId/approve` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/commands/:commandId/approve` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId/capabilities` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId/capabilities` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId/capabilities` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId/capabilities` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices/:deviceId` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| POST | `/api/v1/tenants/:tenantId/pc-connector/pair-token` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/pc-connector/pair-token` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/pc-connector/pair-token` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 201 | PASS |
| POST | `/api/v1/tenants/:tenantId/pc-connector/pair-token` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 201 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/consents` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/consents` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/consents` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/consents` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/export` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/export` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/export` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/export` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/revoke-consent` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/revoke-consent` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/revoke-consent` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId/revoke-consent` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/privacy/contacts/:contactId` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/segments/:segmentId` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/segments/:segmentId` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/segments/:segmentId` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/segments/:segmentId` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/segments` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/segments` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/segments` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/segments` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| POST | `/api/v1/tenants/:tenantId/segments` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/segments` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/segments` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/segments` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/settings` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/settings` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/settings` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/settings` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/approve` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/approve` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/approve` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/approve` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/revoke-approval` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/revoke-approval` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/revoke-approval` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach/:itemId/revoke-approval` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/teach/:itemId` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/teach/:itemId` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/teach/:itemId` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach/:itemId` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach/:itemId` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach/:itemId` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/teach/:itemId` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/teach/:itemId` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/teach/:itemId` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/teach/:itemId` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/teach` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/agent` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/agent` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/agent` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| PATCH | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/agent` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/reconnect` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/reconnect` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/reconnect` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/reconnect` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/send` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/send` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/send` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/send` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/stats` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/stats` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/stats` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/stats` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/sync-templates` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/sync-templates` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/sync-templates` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/sync-templates` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/templates` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/templates` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/templates` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId/templates` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| DELETE | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts/:accountId` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 404 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/accounts` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/embedded-signup` | viewer | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/embedded-signup` | operator | B | RBAC: role below requirement | 403 | 403 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/embedded-signup` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| POST | `/api/v1/tenants/:tenantId/whatsapp/embedded-signup` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 400 | PASS |
| GET | `/api/v1/tenants/:tenantId` | viewer | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId` | operator | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId` | admin | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId` | owner | B | RBAC: role allowed reaches handler | not 401/403 | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/templates` | owner | A | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/tools` | owner | A | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents` | owner | A | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/:provider/authorize` | owner | A | own list contains no foreign data | 200, no foreign data | 302 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/availability` | owner | A | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/connections` | owner | A | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/meetings` | owner | A | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns` | owner | A | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts` | owner | A | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations` | owner | A | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/feature-flags` | owner | A | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge` | owner | A | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/members` | owner | A | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices` | owner | A | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/consents` | owner | A | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/segments` | owner | A | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach` | owner | A | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts` | owner | A | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId` | owner | A | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/templates` | owner | B | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents/tools` | owner | B | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/agents` | owner | B | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/:provider/authorize` | owner | B | own list contains no foreign data | 200, no foreign data | 302 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/availability` | owner | B | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/connections` | owner | B | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/calendars/meetings` | owner | B | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/campaigns` | owner | B | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/contacts` | owner | B | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/conversations` | owner | B | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/feature-flags` | owner | B | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/knowledge` | owner | B | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/members` | owner | B | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/pc-connector/devices` | owner | B | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/privacy/consents` | owner | B | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/segments` | owner | B | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/teach` | owner | B | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId/whatsapp/accounts` | owner | B | own list contains no foreign data | 200, no foreign data | 200 | PASS |
| GET | `/api/v1/tenants/:tenantId` | owner | B | own list contains no foreign data | 200, no foreign data | 200 | PASS |
