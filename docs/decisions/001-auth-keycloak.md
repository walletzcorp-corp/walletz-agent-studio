# ADR-001: Keycloak como provedor OIDC local

**Data:** 2026-09-30  
**Status:** Aceito

## Contexto
O Módulo 1 precisa de autenticação desacoplada que permita troca futura de provedor.

## Decisão
- Keycloak 24 no ambiente local via Docker Compose
- `passport-jwt` + `jwks-rsa` no backend para validar tokens RS256 do Keycloak
- `next-auth` com provider Keycloak no frontend
- Autorização de negócio (organização, unidade, perfil) controlada pelo Walletz Med — não depende das roles do Keycloak

## Consequências
- Para usar outro provedor: trocar issuer/jwks-uri no `.env` e ajustar o realm-export
- Senhas não são armazenadas no banco do Walletz Med
- Tokens de convite não são registrados em logs
