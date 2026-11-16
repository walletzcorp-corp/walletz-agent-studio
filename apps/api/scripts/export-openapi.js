#!/usr/bin/env node
/**
 * Exporta a documentação da API a partir da API rodando localmente.
 *
 *   pnpm --filter @walletz/api dev        # em outro terminal
 *   pnpm --filter @walletz/api docs:openapi
 *
 * Gera docs/api/openapi.json (importável no Postman/Insomnia) e docs/api/REFERENCE.md.
 * Variável opcional: API_DOCS_URL (padrão http://localhost:3001/api/docs-json).
 */
const fs = require('fs');
const path = require('path');

const url = process.env.API_DOCS_URL || 'http://localhost:3001/api/docs-json';
const outDir = path.resolve(__dirname, '../../../docs/api');
const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

function tagDescriptions(doc) {
  return Object.fromEntries((doc.tags || []).map((t) => [t.name, t.description || '']));
}

function toMarkdown(doc) {
  const descriptions = tagDescriptions(doc);
  const byTag = new Map();
  for (const [route, ops] of Object.entries(doc.paths)) {
    for (const method of METHODS) {
      const op = ops[method];
      if (!op) continue;
      const tag = (op.tags && op.tags[0]) || 'outros';
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag).push({ method: method.toUpperCase(), route, op });
    }
  }

  const order = (doc.tags || []).map((t) => t.name);
  const tags = [...byTag.keys()].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });

  const total = [...byTag.values()].reduce((n, list) => n + list.length, 0);
  const lines = [
    `# Referência da API — ${doc.info.title}`,
    '',
    '> Arquivo gerado por `pnpm --filter @walletz/api docs:openapi`. Não edite à mão.',
    '',
    `Versão ${doc.info.version} · ${total} rotas · prefixo \`/api/v1\` · autenticação Bearer (JWT), exceto onde indicado "sem JWT" (login, webhooks, callback OAuth, conector local — protegidos por outros meios).`,
    '',
    '## Módulos',
    '',
    '| Módulo | Descrição | Rotas |',
    '|---|---|---|',
    ...tags.map((t) => `| [${t}](#${t}) | ${descriptions[t] || ''} | ${byTag.get(t).length} |`),
    '',
  ];

  for (const tag of tags) {
    lines.push(`## ${tag}`, '');
    if (descriptions[tag]) lines.push(descriptions[tag], '');
    lines.push('| Método | Rota | Descrição | Auth |', '|---|---|---|---|');
    for (const { method, route, op } of byTag.get(tag)) {
      const isPublic = !op.security || op.security.length === 0;
      const summary = (op.summary || '').replace(/\|/g, '\\|');
      lines.push(`| \`${method}\` | \`${route}\` | ${summary} | ${isPublic ? 'sem JWT' : 'Bearer'} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

async function main() {
  let res;
  try {
    res = await fetch(url);
  } catch {
    console.error(`Não consegui acessar ${url}. Suba a API local antes (pnpm --filter @walletz/api dev).`);
    process.exit(1);
  }
  if (!res.ok) {
    console.error(`${url} respondeu ${res.status}. O Swagger só existe fora de produção e via localhost.`);
    process.exit(1);
  }
  const doc = await res.json();
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'openapi.json'), JSON.stringify(doc, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'REFERENCE.md'), toMarkdown(doc) + '\n');
  console.log(`Documentação gerada em ${path.relative(process.cwd(), outDir)} (openapi.json, REFERENCE.md)`);
}

main();
