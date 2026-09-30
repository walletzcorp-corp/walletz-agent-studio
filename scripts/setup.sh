#!/bin/bash
# Walletz Med — Setup inicial do ambiente de desenvolvimento
set -e

echo "=== Walletz Med Setup ==="

# 1. Copia .env.example → .env se não existir
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✓ .env criado a partir de .env.example"
else
  echo "✓ .env já existe"
fi

# 2. Sobe os containers
echo ""
echo "Subindo containers Docker..."
docker compose up -d
echo "✓ Containers iniciados"

# 3. Aguarda PostgreSQL ficar pronto
echo ""
echo "Aguardando PostgreSQL..."
until docker exec walletz_med_postgres pg_isready -U postgres > /dev/null 2>&1; do
  sleep 2
done
echo "✓ PostgreSQL pronto"

# 4. Instala dependências
echo ""
echo "Instalando dependências..."
npm install
echo "✓ Dependências instaladas"

# 5. Gera Prisma Client
echo ""
echo "Gerando Prisma Client..."
cd apps/api && npx prisma generate && cd ../..
echo "✓ Prisma Client gerado"

# 6. Executa migrations
echo ""
echo "Executando migrations..."
cd apps/api && npx prisma migrate deploy && cd ../..
echo "✓ Migrations aplicadas"

# 7. Seed de dados sintéticos
echo ""
echo "Aplicando seed de dados de desenvolvimento..."
cd apps/api && npx ts-node prisma/seed.ts && cd ../..
echo "✓ Seed concluído"

echo ""
echo "=== Setup concluído! ==="
echo ""
echo "Inicie a aplicação:"
echo "  npm run dev"
echo ""
echo "URLs:"
echo "  Web:      http://localhost:3000"
echo "  API:      http://localhost:3001/api/docs"
echo "  Keycloak: http://localhost:8080  (admin / admin_dev_password)"
echo "  Mailpit:  http://localhost:8025"
echo ""
echo "Usuário de dev: dev-admin / admin123 (no Keycloak)"
