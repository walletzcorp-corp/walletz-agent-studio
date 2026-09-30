-- =============================================================
-- Walletz Med — Inicialização do PostgreSQL
-- Cria bancos auxiliares e usuários com privilégios mínimos
-- =============================================================

-- Banco para o Keycloak
CREATE DATABASE keycloak;

-- Banco shadow para Prisma migrations
CREATE DATABASE walletz_med_shadow;

-- Banco de testes (isolado do dev)
CREATE DATABASE walletz_med_test;

-- Usuário da aplicação (sem superuser, sem BYPASSRLS)
CREATE USER walletz_app WITH PASSWORD 'walletz_dev_password_change_in_prod';
GRANT CONNECT ON DATABASE walletz_med TO walletz_app;
GRANT CONNECT ON DATABASE walletz_med_shadow TO walletz_app;
GRANT CONNECT ON DATABASE walletz_med_test TO walletz_app;

-- O schema e as grants específicas são feitos nas migrations Prisma
-- O usuário walletz_app NÃO tem BYPASSRLS para que o RLS seja aplicado
