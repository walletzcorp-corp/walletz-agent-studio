#!/usr/bin/env node
/**
 * Walletz — Digital Team Seed + Radar Editais + Email Test
 *
 * 1. Seeds 10 agents for the "Equipe Digital Walletz"
 * 2. Queries PNCP (national procurement portal) for real opportunities
 * 3. Sends testesEditais email via Microsoft Graph API (if configured)
 *
 * Usage: node scripts/seed-digital-team.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';
import { createRequire } from 'module';
import https from 'https';
import http from 'http';

const require = createRequire(import.meta.url);
const pg = require('../apps/api/node_modules/pg');

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');

// ─── Env ─────────────────────────────────────────────────────────────────────

function loadEnv(path) {
  try {
    const lines = readFileSync(path, 'utf8').split('\n');
    const env = {};
    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const idx = t.indexOf('=');
      if (idx === -1) continue;
      env[t.slice(0, idx)] = t.slice(idx + 1);
    }
    return env;
  } catch { return {}; }
}

const env = loadEnv(join(ROOT, 'apps', 'api', '.env.local'));
const DATABASE_URL = env['DATABASE_URL'];
const MS_TENANT_ID = env['MICROSOFT_OAUTH_TENANT_ID'];
const MS_CLIENT_ID = env['MICROSOFT_OAUTH_CLIENT_ID'];
const MS_CLIENT_SECRET = env['MICROSOFT_OAUTH_CLIENT_SECRET'];

// ─── ID ───────────────────────────────────────────────────────────────────────

function createId() {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function httpGet(url, options = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 15000, ...options }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function httpPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = typeof body === 'string' ? body : JSON.stringify(body);
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers,
      },
      timeout: 20000,
    };
    const req = mod.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

// ─── Agent definitions ────────────────────────────────────────────────────────

const AGENTS = [
  {
    name: 'Radar Editais Walletz',
    title: 'Analista de Inteligência Licitatória',
    template: 'radar_editais',
    objective: 'Buscar, analisar e classificar oportunidades de licitação compatíveis com o portfólio Walletz. Critérios: órgão, objeto, valor, data limite, link, aderência, documentação, atestados, capital mínimo, prazo, pagamento, remoto/presencial, riscos. Classificação: GO / NO GO / CONDICIONAL.',
    persona: { description: 'Especialista em licitações públicas com 10 anos de experiência em análise de editais federais, estaduais e municipais. Foca em TI, software, consultoria e serviços digitais.', traits: ['analítico', 'meticuloso', 'estratégico', 'objetivo'] },
    tone: 'professional',
    channels: ['internal'],
    handoffCriteria: { triggers: ['cláusula jurídica incomum', 'consórcio necessário', 'valor acima do limite'], maxTurns: 5 },
    category: 'INTELIGÊNCIA',
  },
  {
    name: 'Recepção Digital',
    title: 'Recepcionista Digital Walletz',
    template: 'reception',
    objective: 'Receber o primeiro contato e identificar a intenção: VENDAS, SUPORTE, FINANCEIRO, AGENDAMENTO, PARCERIA, PESSOAL, OUTRO. Encaminhar com contexto para o agente correto.',
    persona: { description: 'Recepcionista virtual calorosa que representa o Walletz na primeira impressão. Domina o portfólio e direciona qualquer solicitação com agilidade.', traits: ['acolhedor', 'ágil', 'empático', 'organizado'] },
    tone: 'friendly',
    channels: ['whatsapp', 'web_chat'],
    handoffCriteria: { triggers: ['pedir humano', 'reclamação grave', 'emergência'], maxTurns: 4 },
    category: 'ATENDIMENTO',
  },
  {
    name: 'SDR Inbound',
    title: 'SDR Inbound Walletz',
    template: 'sdr_inbound',
    objective: 'Atender leads que entraram por iniciativa própria. Descobrir naturalmente: nome, empresa, necessidade, dor, urgência, prazo, orçamento, autoridade. Encaminhar para reunião quando qualificado.',
    persona: { description: 'Especialista em vendas consultivas que faz as perguntas certas no momento certo, criando conexão genuína e entendendo profundamente a necessidade.', traits: ['curioso', 'consultivo', 'escuta ativa', 'orientado a resultado'] },
    tone: 'friendly',
    channels: ['whatsapp', 'web_chat', 'email'],
    handoffCriteria: { triggers: ['lead qualificado para demo', 'solicitação de proposta', 'objeção complexa'], maxTurns: 12 },
    category: 'COMERCIAL',
  },
  {
    name: 'SDR Outbound',
    title: 'SDR Outbound Walletz',
    template: 'sdr_outbound',
    objective: 'Abordar leads elegíveis e autorizados de forma consultiva. Rota: abordagem → interesse → qualificação → reunião. Respeitar consentimento, opt-out, templates Meta e frequência.',
    persona: { description: 'Especialista em prospecção ativa com abordagem de valor, sem scripts robotizados. Personaliza cada contato com base no contexto do prospect.', traits: ['proativo', 'resiliente', 'personalizado', 'respeitoso'] },
    tone: 'professional',
    channels: ['whatsapp', 'email'],
    handoffCriteria: { triggers: ['lead qualificado', 'pedido de falar com humano', 'opt-out'], maxTurns: 8 },
    category: 'COMERCIAL',
  },
  {
    name: 'Pré-Qualificador',
    title: 'Analista de Qualificação Walletz',
    template: 'pre_qualifier',
    objective: 'Calcular scoring (0–100): FRIO 0–39, MORNO 40–69, QUENTE 70–100. Critérios: fit, necessidade, urgência, autoridade, orçamento, timing, engajamento. Salvar justificativa.',
    persona: { description: 'Analista de qualificação que avalia o potencial de conversão com base em critérios objetivos e dados de comportamento, sem viés.', traits: ['analítico', 'imparcial', 'criterioso', 'data-driven'] },
    tone: 'professional',
    channels: ['internal'],
    handoffCriteria: { triggers: ['score >= 70 (QUENTE)', 'dado crítico ausente'], maxTurns: 6 },
    category: 'COMERCIAL',
  },
  {
    name: 'Consultor Comercial',
    title: 'Consultor Comercial Walletz',
    template: 'commercial_consultant',
    objective: 'Receber leads qualificados, aprofundar o problema, apresentar solução, trabalhar objeções e conduzir para demonstração/reunião. NUNCA inventar preço, desconto ou condição comercial.',
    persona: { description: 'Consultor comercial sênior que combina conhecimento técnico do produto com vendas consultivas. Focado em valor, não em características.', traits: ['consultivo', 'honesto', 'técnico', 'orientado a valor'] },
    tone: 'professional',
    channels: ['whatsapp', 'web_chat'],
    handoffCriteria: { triggers: ['decisão de compra', 'negociação especial', 'proposta formal'], maxTurns: 15 },
    category: 'COMERCIAL',
  },
  {
    name: 'Follow-up Comercial',
    title: 'Especialista em Follow-up Walletz',
    template: 'followup_commercial',
    objective: 'Acompanhar oportunidades paradas usando histórico real. Nunca repetir mensagem mecanicamente. Parar imediatamente em opt-out, recusa, bloqueio ou limite de frequência.',
    persona: { description: 'Especialista em relacionamento comercial que sabe o momento certo de retomar com contexto relevante, criando valor em cada touchpoint.', traits: ['persistente', 'criativo', 'contextual', 'empático'] },
    tone: 'friendly',
    channels: ['whatsapp', 'email'],
    handoffCriteria: { triggers: ['opt-out', 'lead retoma interesse', 'reunião agendada'], maxTurns: 6 },
    category: 'COMERCIAL',
  },
  {
    name: 'Assistente Executivo Emmanuel',
    title: 'Assistente Executivo — Emmanuel Walletz',
    template: 'executive_assistant',
    objective: 'Responder automaticamente em nome de Emmanuel (AUTONOMIA NÍVEL 2): cumprimentos, confirmações, informações simples, disponibilidade, pedidos de reunião. ENCAMINHAR: contratos, jurídico, valores relevantes, promessas financeiras, decisões estratégicas, informações confidenciais.',
    persona: { description: 'Assistente executivo virtual que representa Emmanuel com profissionalismo e discrição. Conhece as prioridades, o calendário e os limites de autonomia.', traits: ['discreto', 'profissional', 'eficiente', 'confiável'] },
    tone: 'professional',
    channels: ['whatsapp'],
    handoffCriteria: {
      triggers: ['contrato ou jurídico', 'valor financeiro relevante', 'promessa formal', 'decisão estratégica', 'informação confidencial'],
      maxTurns: 8,
    },
    category: 'PRODUTIVIDADE',
  },
  {
    name: 'Agenda AI Walletz',
    title: 'Gestora de Agenda Inteligente',
    template: 'agenda_ai',
    objective: 'Gerenciar disponibilidade e reuniões via calendários reais (Microsoft 365/Google). NUNCA inventar horários. Ferramentas: getAvailability, scheduleMeeting, rescheduleMeeting, cancelMeeting, getMeetingDetails.',
    persona: { description: 'Especialista em gestão de agenda que coordena reuniões com precisão, verificando disponibilidade real e criando links de videoconferência.', traits: ['preciso', 'organizado', 'proativo', 'confiável'] },
    tone: 'professional',
    channels: ['whatsapp', 'web_chat'],
    handoffCriteria: { triggers: ['conflito não resolvido', 'participante recusa', 'urgente'], maxTurns: 6 },
    category: 'PRODUTIVIDADE',
  },
  {
    name: 'Customer Success Walletz',
    title: 'Customer Success Manager',
    template: 'customer_success_cs',
    objective: 'Atender clientes existentes, identificar dificuldades, satisfação, risco de churn, necessidade de treinamento e oportunidades de expansão. Conduzir revisões de sucesso periódicas.',
    persona: { description: 'Customer Success Manager focado em garantir que clientes extraiam o máximo valor do Walletz. Antecipa problemas antes que se tornem motivos de cancelamento.', traits: ['proativo', 'empático', 'orientado a resultado', 'consultivo'] },
    tone: 'friendly',
    channels: ['whatsapp', 'email'],
    handoffCriteria: { triggers: ['risco crítico de churn', 'reclamação grave', 'solicitação de cancelamento'], maxTurns: 12 },
    category: 'ATENDIMENTO',
  },
];

// ─── PNCP API ─────────────────────────────────────────────────────────────────

// PNCP endpoint: /consulta/v1/contratacoes/proposta — dates in yyyyMMdd format
// codigoModalidadeContratacao: 6=Pregão Eletrônico, 8=Dispensa Eletrônica, 4=Concorrência
const PNCP_MODALIDADES = [6, 8, 4];
const PNCP_BASE = 'https://pncp.gov.br/api/consulta/v1/contratacoes/proposta';

// Keywords that indicate software/AI/digital relevance for Walletz
const WALLETZ_KEYWORDS = [
  'software', 'sistema', 'plataforma', 'saas', 'inteligência artificial',
  'ia', 'chatbot', 'agente', 'automatiza', 'digital', 'tecnologia da informação',
  'desenvolvimento de software', 'aplicativo', 'solução tecnológica',
  'gestão de ti', 'nuvem', 'cloud', 'crm', 'erp', 'atendimento digital',
];

function getToday() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

function getDateMinus(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

function scoreWalletz(item) {
  const text = ((item.objetoCompra || '') + ' ' + (item.orgaoEntidade?.razaoSocial || '') + ' ' + (item.informacaoComplementar || '')).toLowerCase();
  const hits = WALLETZ_KEYWORDS.filter(k => text.includes(k)).length;
  if (hits >= 4) return 'GO';
  if (hits >= 2) return 'CONDICIONAL';
  return 'NO GO';
}

async function queryPNCP() {
  console.log('\n🔍  Consultando PNCP — Portal Nacional de Contratações Públicas…');

  const allItems = [];
  const errors = [];
  const dataInicial = getDateMinus(30);
  const dataFinal = getToday();

  for (const modalidade of PNCP_MODALIDADES) {
    try {
      const url = `${PNCP_BASE}?dataInicial=${dataInicial}&dataFinal=${dataFinal}&pagina=1&tamanhoPagina=20&codigoModalidadeContratacao=${modalidade}`;
      const resp = await httpGet(url);

      if (resp.status === 200 && resp.body?.data) {
        for (const item of (resp.body.data || [])) {
          allItems.push(item);
        }
        console.log(`  📋  Modalidade ${modalidade}: ${(resp.body.data || []).length} itens (total no PNCP: ${resp.body.totalRegistros})`);
      } else {
        errors.push(`Modalidade ${modalidade}: HTTP ${resp.status}`);
      }
    } catch (e) {
      errors.push(`Modalidade ${modalidade}: ${e.message}`);
    }
  }

  if (errors.length) console.log('  ⚠️  Avisos:', errors.join('; '));

  // Filter for relevant items and deduplicate
  const seen = new Set();
  const results = [];

  for (const item of allItems) {
    const key = item.numeroControlePNCP || item.objetoCompra?.slice(0, 50);
    if (seen.has(key)) continue;
    seen.add(key);

    const parecer = scoreWalletz(item);
    // Only include GO and CONDICIONAL in the primary results
    if (parecer === 'NO GO') continue;

    results.push({
      orgao: item.orgaoEntidade?.razaoSocial || item.unidadeOrgao?.nomeUnidade || 'N/D',
      objeto: item.objetoCompra || 'N/D',
      valor: item.valorTotalEstimado ? `R$ ${Number(item.valorTotalEstimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/D',
      dataLimite: item.dataEncerramentoProposta || item.dataAberturaProposta || 'N/D',
      link: item.linkSistemaOrigem || `https://pncp.gov.br/app/editais/${item.numeroControlePNCP || ''}`,
      numeroControlePNCP: item.numeroControlePNCP,
      modalidade: item.modalidadeNome || 'N/D',
      uf: item.unidadeOrgao?.ufSigla || item.orgaoEntidade?.municipio || 'N/D',
      parecer,
      justificativa: item.informacaoComplementar?.slice(0, 200) || item.objetoCompra?.slice(0, 150) || '',
    });
  }

  // If no GO/CONDICIONAL, include a sample of all items with their scores
  if (results.length === 0) {
    for (const item of allItems.slice(0, 5)) {
      const key = item.numeroControlePNCP || item.objetoCompra?.slice(0, 50);
      results.push({
        orgao: item.orgaoEntidade?.razaoSocial || item.unidadeOrgao?.nomeUnidade || 'N/D',
        objeto: item.objetoCompra || 'N/D',
        valor: item.valorTotalEstimado ? `R$ ${Number(item.valorTotalEstimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/D',
        dataLimite: item.dataEncerramentoProposta || item.dataAberturaProposta || 'N/D',
        link: item.linkSistemaOrigem || `https://pncp.gov.br/app/editais/${item.numeroControlePNCP || ''}`,
        numeroControlePNCP: key,
        modalidade: item.modalidadeNome || 'N/D',
        uf: item.unidadeOrgao?.ufSigla || 'N/D',
        parecer: 'NO GO',
        justificativa: 'Sem aderência ao portfólio Walletz neste ciclo.',
      });
    }
  }

  console.log(`  ✅  ${allItems.length} itens coletados, ${results.length} aderentes (GO/CONDICIONAL)`);
  return { results, totalColetados: allItems.length };
}

// ─── Email via Microsoft Graph ────────────────────────────────────────────────

async function getMsGraphToken() {
  if (!MS_TENANT_ID || !MS_CLIENT_ID || !MS_CLIENT_SECRET) return null;

  try {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: MS_CLIENT_ID,
      client_secret: MS_CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
    }).toString();

    const resp = await new Promise((resolve, reject) => {
      const url = `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`;
      const parsed = new URL(url);
      const req = https.request({
        hostname: parsed.hostname,
        path: parsed.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
      }, res => {
        let d = ''; res.on('data', c => d += c);
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
      });
      req.on('error', reject);
      req.write(body); req.end();
    });

    return resp.body?.access_token || null;
  } catch { return null; }
}

async function sendEmailViaGraph(token, to, subject, htmlBody) {
  const fromEmail = 'ia@walletzcorp.com';
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(fromEmail)}/sendMail`;

  const payload = {
    message: {
      subject,
      body: { contentType: 'HTML', content: htmlBody },
      toRecipients: [{ emailAddress: { address: to } }],
      from: { emailAddress: { address: fromEmail, name: 'Radar Editais — Walletz Agent Studio' } },
    },
    saveToSentItems: false,
  };

  try {
    const resp = await new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const data = JSON.stringify(payload);
      const req = https.request({
        hostname: parsed.hostname,
        path: parsed.pathname,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: 15000,
      }, res => {
        let d = ''; res.on('data', c => d += c);
        res.on('end', () => resolve({ status: res.statusCode, body: d ? JSON.parse(d) : null }));
      });
      req.on('error', reject);
      req.write(data); req.end();
    });
    return resp;
  } catch (e) {
    return { status: 0, error: e.message };
  }
}

// ─── Build email HTML ─────────────────────────────────────────────────────────

function buildEmailHtml(opportunities, totalColetados = 0) {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const rows = opportunities.length === 0
    ? '<p>Nenhuma oportunidade compatível encontrada neste ciclo de teste.</p>'
    : opportunities.map(item => {
      const color = item.parecer === 'GO' ? '#25D366' : item.parecer === 'CONDICIONAL' ? '#F59E0B' : '#EF4444';
      return `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${item.orgao}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;max-width:300px">${item.objeto}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">${item.valor}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">${item.dataLimite}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">${item.modalidade}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">${item.uf}</td>
          <td style="padding:8px;border-bottom:1px solid #eee"><a href="${item.link}">Ver edital</a></td>
          <td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;color:${color}">${item.parecer}</td>
        </tr>`;
    }).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:20px">
  <h1 style="color:#6D4AFF">🎯 Radar Editais — Walletz Agent Studio</h1>
  <p><strong>Data/hora:</strong> ${now}</p>
  <p><strong>Editais coletados no PNCP (últimos 30 dias):</strong> ${totalColetados}</p>
  <p><strong>Oportunidades aderentes (GO/CONDICIONAL):</strong> ${opportunities.length}</p>
  <p><strong>Fonte:</strong> PNCP — Portal Nacional de Contratações Públicas</p>
  <hr>
  ${opportunities.length === 0 ? '<p style="color:#666">Nenhuma oportunidade compatível encontrada neste ciclo de teste.</p>' : `
  <h2>Oportunidades Analisadas</h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead>
      <tr style="background:#f5f5f5">
        <th style="padding:8px;text-align:left">Órgão</th>
        <th style="padding:8px;text-align:left">Objeto</th>
        <th style="padding:8px;text-align:left">Valor</th>
        <th style="padding:8px;text-align:left">Data Limite</th>
        <th style="padding:8px;text-align:left">Modalidade</th>
        <th style="padding:8px;text-align:left">UF</th>
        <th style="padding:8px;text-align:left">Link</th>
        <th style="padding:8px;text-align:left">Parecer</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="font-size:11px;color:#888;margin-top:20px">
    Critérios de classificação: GO = alta aderência ao portfólio Walletz | CONDICIONAL = aderência parcial | NO GO = sem aderência.<br>
    Esta análise foi gerada automaticamente pelo Radar Editais Walletz. Verificação humana recomendada antes de qualquer ação.
  </p>
  `}
  <hr>
  <p style="font-size:11px;color:#aaa">Walletz Agent Studio — ia@walletzcorp.com</p>
</body>
</html>`;
}

// ─── Seed agents ──────────────────────────────────────────────────────────────

async function seedAgents(client, tenantId, userId) {
  console.log('\n🤖  Criando equipe digital (10 agentes)…');

  const results = [];

  for (const agent of AGENTS) {
    // Check if already exists
    const existing = await client.query(
      `SELECT id FROM agents WHERE tenant_id = $1 AND name = $2 AND deleted_at IS NULL LIMIT 1`,
      [tenantId, agent.name],
    );

    if (existing.rows.length > 0) {
      console.log(`  ↩️  "${agent.name}" já existe (${existing.rows[0].id})`);
      results.push({ ...agent, id: existing.rows[0].id, action: 'existing' });
      continue;
    }

    const id = createId();
    await client.query(
      `INSERT INTO agents (id, tenant_id, name, title, status, template, objective, persona, tone, language, channels, working_hours, handoff_criteria, created_by_user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'testing', $5, $6, $7::jsonb, $8, 'pt-BR', $9::jsonb, '{}'::jsonb, $10::jsonb, $11, now(), now())`,
      [
        id, tenantId, agent.name, agent.title, agent.template,
        agent.objective, JSON.stringify(agent.persona), agent.tone,
        JSON.stringify(agent.channels), JSON.stringify(agent.handoffCriteria), userId,
      ],
    );
    console.log(`  ✅  "${agent.name}" criado (${id})`);
    results.push({ ...agent, id, action: 'created' });
  }

  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀  Walletz Digital Team Setup\n' + '═'.repeat(50));

  // 1. DB
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  // Get tenant
  const tenantRow = await client.query(`SELECT id FROM tenants WHERE slug = 'walletz-demo' LIMIT 1`);
  if (!tenantRow.rows.length) {
    console.error('❌  Tenant "walletz-demo" não encontrado. Execute seed-dev-user.mjs primeiro.');
    await client.end(); process.exit(1);
  }
  const tenantId = tenantRow.rows[0].id;

  const userRow = await client.query(`SELECT id FROM users WHERE email = 'demo@walletz.local' LIMIT 1`);
  const userId = userRow.rows[0]?.id ?? null;

  console.log(`🏢  Tenant: ${tenantId}`);

  // 2. Seed agents
  const agentResults = await seedAgents(client, tenantId, userId);
  await client.end();

  // 3. PNCP
  const { results: opportunities, totalColetados } = await queryPNCP();

  // 4. Build report
  const emailHtml = buildEmailHtml(opportunities, totalColetados);
  const reportPath = join(ROOT, 'apps', 'api', '.radar-editais-report.html');
  writeFileSync(reportPath, emailHtml, 'utf8');
  console.log(`\n💾  Relatório HTML salvo: apps/api/.radar-editais-report.html`);

  // 5. Try email via Microsoft Graph
  console.log('\n📧  Tentando envio via Microsoft Graph API…');
  const msToken = await getMsGraphToken();
  let emailStatus = 'SKIPPED';
  let emailDetails = '';

  if (msToken) {
    console.log('  ✅  Token Microsoft obtido');
    const emailResp = await sendEmailViaGraph(
      msToken,
      'emmanuel@walletzcorp.com',
      'testesEditais',
      emailHtml,
    );
    if (emailResp.status === 202) {
      emailStatus = 'SENT';
      emailDetails = 'HTTP 202 Accepted — Microsoft Graph';
      console.log('  ✅  Email enviado! Status 202');
    } else {
      emailStatus = `FAILED (HTTP ${emailResp.status})`;
      const errMsg = emailResp.body?.error?.message || emailResp.body?.error?.code || 'erro desconhecido';
      emailDetails = `${errMsg}`;
      console.log(`  ⚠️  Falhou: HTTP ${emailResp.status} — ${errMsg}`);
      if (emailResp.status === 403) {
        console.log('  💡  O app Microsoft precisa da permissão Mail.Send (Application) com admin consent.');
        console.log('  💡  Ação: portal.azure.com → App registrations → Walletz → API permissions → Add Mail.Send (Application) → Grant admin consent');
      }
    }
  } else {
    emailStatus = 'SKIPPED (sem token MS Graph)';
    console.log('  ⚠️  Sem credenciais Microsoft configuradas — email não enviado');
  }

  // 6. Summary
  console.log('\n' + '═'.repeat(50));
  console.log('📊  RESULTADO FINAL');
  console.log('═'.repeat(50));
  console.log(`\n🤖  Agentes criados: ${agentResults.filter(a => a.action === 'created').length}/${AGENTS.length}`);
  console.log(`🔁  Já existiam: ${agentResults.filter(a => a.action === 'existing').length}`);
  console.log(`\n📋  Categorias:`);

  const byCategory = {};
  for (const a of agentResults) {
    if (!byCategory[a.category]) byCategory[a.category] = [];
    byCategory[a.category].push(a.name);
  }
  for (const [cat, names] of Object.entries(byCategory)) {
    console.log(`  ${cat}: ${names.join(', ')}`);
  }

  console.log(`\n📡  PNCP: ${totalColetados} coletados, ${opportunities.length} aderentes (GO/CONDICIONAL)`);
  console.log(`📧  Email testesEditais: ${emailStatus}`);
  if (emailDetails) console.log(`    Detalhes: ${emailDetails}`);
  console.log(`📄  Relatório: apps/api/.radar-editais-report.html`);
  console.log('\n' + '═'.repeat(50) + '\n');

  // Save JSON report
  const jsonReport = {
    runAt: new Date().toISOString(),
    tenantId,
    agents: agentResults.map(a => ({ id: a.id, name: a.name, template: a.template, category: a.category, action: a.action })),
    pncp: { totalColetados, aderentes: opportunities.length, items: opportunities },
    email: { status: emailStatus, to: 'emmanuel@walletzcorp.com', subject: 'testesEditais', details: emailDetails },
  };

  const jsonPath = join(ROOT, 'apps', 'api', '.seed-report.json');
  writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2), 'utf8');
  console.log(`💾  JSON report: apps/api/.seed-report.json\n`);
}

main().catch(e => {
  console.error('❌  Fatal:', e.message);
  process.exit(1);
});
