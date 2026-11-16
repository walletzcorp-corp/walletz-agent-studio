import type { Metadata } from 'next';
import { Code, DocTitle, H2, H3, List, Note, P, Pre, Steps, Table, Toc } from '../_components';

export const metadata: Metadata = { title: 'Webhooks de saída' };

export default function WebhooksGuide() {
  return (
    <>
      <DocTitle
        title="Webhooks de saída"
        intro="Receba no seu sistema (CRM, ERP, automações) os eventos das conversas e reuniões dos seus agentes, em tempo real e com assinatura para validar a origem."
      />

      <Toc
        items={[
          ['configurar', '1. Configurar no painel'],
          ['formato', '2. Formato da requisição'],
          ['eventos', '3. Eventos'],
          ['assinatura', '4. Validar a assinatura'],
          ['entrega', '5. Entrega e novas tentativas'],
        ]}
      />

      <H2 id="configurar">1. Configurar no painel</H2>
      <Steps>
        <li>Disponível nos planos Pro (1 webhook), Business e Agency (5).</li>
        <li>No painel: <strong>Integrações → Webhooks de saída → Novo webhook</strong>.</li>
        <li>Informe a URL do seu sistema (precisa ser <Code>https://</Code> e acessível pela internet) e marque os eventos.</li>
        <li>Guarde o <strong>segredo de assinatura</strong> (<Code>whsec_…</Code>): ele aparece uma única vez. Se perder, gere outro em “Novo segredo”.</li>
        <li>Use <strong>Enviar teste</strong> para receber um evento <Code>webhook.test</Code>.</li>
      </Steps>

      <H2 id="formato">2. Formato da requisição</H2>
      <P>Cada evento é um <Code>POST</Code> com corpo JSON:</P>
      <Pre title="Cabeçalhos">{`Content-Type: application/json
User-Agent: Walletz-Webhooks/1.0
X-Walletz-Event: message.received
X-Walletz-Delivery: 7c1d2f8e-5a0b-4c55-9a7e-1b2c3d4e5f60
X-Walletz-Timestamp: 1794861824
X-Walletz-Signature: sha256=5d41402abc4b2a76b9719d911017c592...`}</Pre>
      <Pre title="Corpo">{`{
  "id": "7c1d2f8e-5a0b-4c55-9a7e-1b2c3d4e5f60",
  "event": "message.received",
  "tenantId": "01a1…",
  "data": {
    "conversationId": "01a1…",
    "channel": "webchat",
    "messageId": "01a1…",
    "text": "Vocês abrem aos sábados?",
    "occurredAt": "2026-11-16T20:15:03.120Z"
  }
}`}</Pre>
      <P>O <Code>id</Code> (igual a <Code>X-Walletz-Delivery</Code>) é único por entrega: use-o para não processar o mesmo evento duas vezes.</P>

      <H2 id="eventos">3. Eventos</H2>
      <Table
        head={['Evento', 'Quando', 'Campos em data']}
        rows={[
          [<Code key="a">conversation.created</Code>, 'Nova conversa (webchat ou WhatsApp)', 'conversationId, channel, agentId/contactId, widgetId (webchat)'],
          [<Code key="b">message.received</Code>, 'Mensagem de um contato', 'conversationId, channel, messageId, text'],
          [<Code key="c">message.replied</Code>, 'Resposta enviada pelo agente de IA', 'conversationId, channel, agentId, text'],
          [<Code key="d">conversation.handoff</Code>, 'Atendente humano assumiu a conversa', 'conversationId, assignedToUserId'],
          [<Code key="e">conversation.resolved</Code>, 'Conversa encerrada', 'conversationId'],
          [<Code key="f">meeting.created</Code>, 'Reunião criada na agenda', 'meetingId, title, startAt, endAt, conversationId'],
          [<Code key="g">meeting.canceled</Code>, 'Reunião cancelada', 'meetingId, reason'],
        ]}
      />

      <H2 id="assinatura">4. Validar a assinatura</H2>
      <P>
        Calcule HMAC-SHA256 com o seu segredo sobre <Code>{'{X-Walletz-Timestamp}.{corpo bruto}'}</Code> e compare com o valor de{' '}
        <Code>X-Walletz-Signature</Code>. Use o corpo <strong>exatamente como chegou</strong> (antes de converter o JSON) e rejeite timestamps com
        mais de 5 minutos.
      </P>
      <H3>Node.js (Express)</H3>
      <Pre title="server.js">{`const express = require('express');
const crypto = require('crypto');
const app = express();
const SECRET = process.env.WALLETZ_WEBHOOK_SECRET; // whsec_...

app.post('/walletz/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const ts = req.get('X-Walletz-Timestamp');
  const sig = req.get('X-Walletz-Signature') || '';
  const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(ts + '.' + req.body).digest('hex');

  const tooOld = Math.abs(Date.now() / 1000 - Number(ts)) > 300;
  const valid = sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (tooOld || !valid) return res.sendStatus(401);

  const event = JSON.parse(req.body);
  // processe event.event / event.data (de forma idempotente pelo event.id)
  res.sendStatus(200);
});

app.listen(3000);`}</Pre>
      <H3>PHP</H3>
      <Pre title="webhook.php">{`<?php
$secret = getenv('WALLETZ_WEBHOOK_SECRET');
$body = file_get_contents('php://input');
$ts = $_SERVER['HTTP_X_WALLETZ_TIMESTAMP'] ?? '';
$sig = $_SERVER['HTTP_X_WALLETZ_SIGNATURE'] ?? '';
$expected = 'sha256=' . hash_hmac('sha256', $ts . '.' . $body, $secret);

if (abs(time() - (int) $ts) > 300 || !hash_equals($expected, $sig)) {
  http_response_code(401);
  exit;
}
$event = json_decode($body, true);
// processe $event['event'] / $event['data']
http_response_code(200);`}</Pre>
      <H3>Python (Flask)</H3>
      <Pre title="app.py">{`import hmac, hashlib, os, time
from flask import Flask, request, abort

app = Flask(__name__)
SECRET = os.environ["WALLETZ_WEBHOOK_SECRET"].encode()

@app.post("/walletz/webhook")
def webhook():
    ts = request.headers.get("X-Walletz-Timestamp", "")
    sig = request.headers.get("X-Walletz-Signature", "")
    body = request.get_data()
    expected = "sha256=" + hmac.new(SECRET, ts.encode() + b"." + body, hashlib.sha256).hexdigest()
    if abs(time.time() - int(ts or 0)) > 300 or not hmac.compare_digest(sig, expected):
        abort(401)
    event = request.get_json()
    # processe event["event"] / event["data"]
    return "", 200`}</Pre>

      <H2 id="entrega">5. Entrega e novas tentativas</H2>
      <List>
        <li>Responda com status <strong>2xx em até 10 segundos</strong>. Faça o processamento pesado depois (fila), não durante a requisição.</li>
        <li>Falhas (timeout, erro de rede ou status fora de 2xx) são repetidas até <strong>6 vezes</strong>, com espera crescente (30s, 1 min, 2 min, 4 min, 8 min).</li>
        <li>Redirecionamentos (3xx) não são seguidos: informe a URL final.</li>
        <li>Após 50 falhas seguidas, o webhook é pausado. Corrija o endpoint e reative no painel.</li>
        <li>A URL não pode apontar para rede interna (localhost, 10.x, 192.168.x etc.).</li>
      </List>
      <Note>A ordem de chegada não é garantida. Use <Code>data.occurredAt</Code> para ordenar e o <Code>id</Code> para descartar repetições.</Note>
    </>
  );
}
