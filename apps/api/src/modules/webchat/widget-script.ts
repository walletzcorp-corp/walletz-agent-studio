/**
 * Script do widget de webchat, servido em GET /api/v1/public/webchat/widget.js.
 * Uso no site do cliente:
 *   <script src="https://…/api/v1/public/webchat/widget.js" data-key="wc_…" async></script>
 *
 * Vanilla JS + Shadow DOM (não interfere no CSS do site). Todo texto entra via
 * textContent — nunca innerHTML com conteúdo de mensagem.
 */
export const WIDGET_SCRIPT = String.raw`(function () {
  'use strict';
  var script = document.currentScript;
  if (!script) return;
  var src = script.getAttribute('src') || '';
  var key = script.getAttribute('data-key') || (src.split('key=')[1] || '').split('&')[0];
  if (!key || window['__walletzWebchat_' + key]) return;
  window['__walletzWebchat_' + key] = true;
  var base = src.replace(/\/widget\.js.*$/, '') + '/' + encodeURIComponent(key);
  var storeKey = 'walletz-webchat:' + key;
  var session = null;
  try { session = localStorage.getItem(storeKey); } catch (e) {}
  var lastAt = null, seen = {}, pollTimer = null, cfg = null, busy = false;

  function api(method, path, body) {
    var headers = { 'Content-Type': 'application/json' };
    if (session) headers['X-Webchat-Session'] = session;
    return fetch(base + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (data) {
          if (!r.ok) { var err = new Error((data && data.message) || ('HTTP ' + r.status)); err.status = r.status; throw err; }
          return data;
        });
      });
  }

  var host = document.createElement('div');
  host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483000;';
  var root = host.attachShadow({ mode: 'open' });
  var style = document.createElement('style');
  style.textContent = [
    ':host{all:initial}',
    '*{box-sizing:border-box;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}',
    '.btn{width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.2);font-size:24px;display:flex;align-items:center;justify-content:center}',
    '.panel{position:absolute;right:0;bottom:68px;width:min(360px,calc(100vw - 32px));height:min(520px,calc(100vh - 100px));background:#fff;color:#111;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden}',
    '.panel.open{display:flex}',
    '.head{padding:14px 16px;color:#fff;font-weight:600;font-size:15px;display:flex;justify-content:space-between;align-items:center}',
    '.head small{display:block;font-weight:400;opacity:.85;font-size:12px}',
    '.close{background:transparent;border:0;color:#fff;font-size:20px;cursor:pointer}',
    '.list{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f6f7f9}',
    '.msg{max-width:80%;padding:8px 12px;border-radius:12px;font-size:14px;line-height:1.4;white-space:pre-wrap;word-wrap:break-word}',
    '.visitor{align-self:flex-end;color:#fff;border-bottom-right-radius:4px}',
    '.agent,.human{align-self:flex-start;background:#fff;border:1px solid #e5e7eb;border-bottom-left-radius:4px}',
    '.typing{align-self:flex-start;font-size:12px;color:#6b7280}',
    'form{display:flex;gap:8px;padding:10px;border-top:1px solid #e5e7eb;background:#fff}',
    'textarea{flex:1;resize:none;border:1px solid #d1d5db;border-radius:10px;padding:8px 10px;font-size:14px;height:40px;max-height:96px;color:#111;background:#fff}',
    'button.send{border:0;border-radius:10px;padding:0 14px;color:#fff;cursor:pointer;font-size:14px}',
    'button:disabled{opacity:.5;cursor:default}',
    '.err{font-size:12px;color:#b91c1c;padding:0 12px 8px}',
    '.foot{font-size:10px;color:#9ca3af;text-align:center;padding:0 0 6px}'
  ].join('');
  root.appendChild(style);

  var panel = document.createElement('div'); panel.className = 'panel';
  var head = document.createElement('div'); head.className = 'head';
  var titleBox = document.createElement('div');
  var titleEl = document.createElement('div'); titleEl.textContent = 'Atendimento';
  var subEl = document.createElement('small');
  titleBox.appendChild(titleEl); titleBox.appendChild(subEl);
  var closeBtn = document.createElement('button'); closeBtn.className = 'close'; closeBtn.setAttribute('aria-label', 'Fechar'); closeBtn.textContent = '×';
  head.appendChild(titleBox); head.appendChild(closeBtn);
  var list = document.createElement('div'); list.className = 'list'; list.setAttribute('role', 'log'); list.setAttribute('aria-live', 'polite');
  var errEl = document.createElement('div'); errEl.className = 'err';
  var form = document.createElement('form');
  var input = document.createElement('textarea'); input.placeholder = 'Digite sua mensagem…'; input.maxLength = 2000; input.setAttribute('aria-label', 'Mensagem');
  var send = document.createElement('button'); send.className = 'send'; send.type = 'submit'; send.textContent = 'Enviar';
  form.appendChild(input); form.appendChild(send);
  var foot = document.createElement('div'); foot.className = 'foot'; foot.textContent = 'Assistente com IA · Walletz Studio';
  panel.appendChild(head); panel.appendChild(list); panel.appendChild(errEl); panel.appendChild(form); panel.appendChild(foot);
  var btn = document.createElement('button'); btn.className = 'btn'; btn.setAttribute('aria-label', 'Abrir chat'); btn.textContent = '💬';
  root.appendChild(panel); root.appendChild(btn);

  function color(c) {
    var ok = /^#[0-9a-fA-F]{3,8}$/.test(c || '') ? c : '#0f766e';
    btn.style.background = ok; head.style.background = ok; send.style.background = ok;
    return ok;
  }
  var accent = color('#0f766e');

  function add(m) {
    if (m.id && seen[m.id]) return;
    if (m.id) seen[m.id] = true;
    var el = document.createElement('div');
    el.className = 'msg ' + (m.from || 'agent');
    if (m.from === 'visitor') el.style.background = accent;
    el.textContent = m.text || '';
    list.appendChild(el);
    list.scrollTop = list.scrollHeight;
    if (m.createdAt && (!lastAt || m.createdAt > lastAt)) lastAt = m.createdAt;
  }

  function poll() {
    if (!session) return;
    api('GET', '/messages' + (lastAt ? '?after=' + encodeURIComponent(lastAt) : ''))
      .then(function (msgs) { (msgs || []).forEach(add); })
      .catch(function (e) { if (e.status === 401) { session = null; try { localStorage.removeItem(storeKey); } catch (x) {} } });
  }

  function ensureSession() {
    if (session) return Promise.resolve();
    return api('POST', '/sessions', {}).then(function (r) {
      session = r.session;
      try { localStorage.setItem(storeKey, session); } catch (e) {}
    });
  }

  function open() {
    panel.classList.add('open');
    input.focus();
    if (!pollTimer) { poll(); pollTimer = setInterval(poll, 5000); }
  }
  function close() {
    panel.classList.remove('open');
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }
  btn.addEventListener('click', function () { panel.classList.contains('open') ? close() : open(); });
  closeBtn.addEventListener('click', close);

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit')); }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text || busy) return;
    busy = true; send.disabled = true; errEl.textContent = '';
    var typing = document.createElement('div'); typing.className = 'typing'; typing.textContent = 'digitando…';
    ensureSession()
      .then(function () {
        input.value = '';
        add({ from: 'visitor', text: text });
        list.appendChild(typing); list.scrollTop = list.scrollHeight;
        return api('POST', '/messages', { message: text });
      })
      .then(function (r) {
        (r.messages || []).forEach(function (m) { if (m.from !== 'visitor') add(m); else { seen[m.id] = true; if (!lastAt || m.createdAt > lastAt) lastAt = m.createdAt; } });
      })
      .catch(function (err) {
        if (err.status === 401) { session = null; try { localStorage.removeItem(storeKey); } catch (x) {} }
        errEl.textContent = err.message || 'Não foi possível enviar. Tente novamente.';
      })
      .then(function () { if (typing.parentNode) typing.parentNode.removeChild(typing); busy = false; send.disabled = false; });
  });

  api('GET', '/config').then(function (c) {
    cfg = c;
    titleEl.textContent = c.title || 'Atendimento';
    subEl.textContent = c.agentName ? c.agentName : '';
    accent = color(c.primaryColor);
    if (c.welcomeMessage) add({ id: 'welcome', from: 'agent', text: c.welcomeMessage });
    (document.body || document.documentElement).appendChild(host);
  }).catch(function () { /* widget desativado ou site não autorizado: não aparece */ });
})();`;
