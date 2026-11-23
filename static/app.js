/* Cajuína Dona Júlia — sistema da equipe */
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = v => 'R$ ' + (Number(v) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const num = v => { const s = String(v ?? '').trim(); if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s); const n = parseFloat(s.replace(/\./g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
const r2 = v => Math.round((Number(v) || 0) * 100) / 100;
const dbr = s => s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '';
const dm = s => s ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : '';
const hm = s => s ? s.slice(11, 16) : '';
const tel = t => { t = String(t || '').replace(/\D/g, ''); return t.length === 11 ? `(${t.slice(0, 2)}) ${t.slice(2, 7)}-${t.slice(7)}` : t.length === 10 ? `(${t.slice(0, 2)}) ${t.slice(2, 6)}-${t.slice(6)}` : t; };
const inteiro = v => (Number(v) || 0).toLocaleString('pt-BR');

const STATUS = { novo: 'Novo', separando: 'Separando', em_rota: 'Em rota', entregue: 'Entregue', cancelado: 'Cancelado' };
const CANAL_PILL = { revenda: 'p-rev', encomenda: 'p-enc', online: 'p-onl', whatsapp: 'p-wa', feira: 'p-fei', balcao: 'p-bal' };
const FORMAS = { pix: 'Pix', dinheiro: 'Dinheiro', boleto: 'Boleto', credito: 'Crédito', debito: 'Débito', transferencia: 'Transferência' };
const MENU = [
  ['painel', 'Painel', 'relatorios'], ['pedidos', 'Pedidos', 'pedidos'], ['producao', 'Produção', 'producao'], ['estoque', 'Estoque', 'estoque'],
  ['clientes', 'Clientes', 'clientes'], ['rotas', 'Rotas & mapa', 'rotas'], ['entregas', 'Minhas entregas', 'entregas'], ['feira', 'Feira', 'feira'],
  ['financeiro', 'Financeiro', 'financeiro'], ['equipe', 'Equipe', 'equipe'], ['config', 'Configurações', 'config'],
];
const ICO = {
  painel: '<path d="M4 13h6V4H4zM14 20h6v-9h-6zM14 4v4h6V4zM4 20h6v-3H4z"/>',
  pedidos: '<path d="M9 4h6v3H9zM7 5H5v16h14V5h-2"/><path d="M8 12h8M8 16h5"/>',
  producao: '<path d="M10 2h4v4l2 3v12H8V9l2-3z"/><path d="M8 13h8"/>',
  estoque: '<path d="M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10"/>',
  clientes: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.7.8 2.7 2.5 3 5.2"/>',
  rotas: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14"/>',
  entregas: '<path d="M2 6h11v10H2zM13 9h4l4 4v3h-8z"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  feira: '<path d="M3 9l2-5h14l2 5M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0zM5 13v7h14v-7"/>',
  financeiro: '<circle cx="12" cy="12" r="9"/><path d="M15 9c-.5-1-1.6-1.5-3-1.5-1.8 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.3 2.2-3 2.2-1.5 0-2.6-.6-3-1.6M12 6v1.5M12 16.5V18"/>',
  equipe: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6"/>',
  config: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  mais: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
};
const estqTxt = (p, q) => { const cx = p.un_caixa || 1; return cx > 1 && q >= cx ? `${inteiro(Math.floor(q / cx))} cx${q % cx ? ' + ' + (q % cx) : ''} (${inteiro(q)} un)` : `${inteiro(q)} un`; };
const ico = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICO[k] || ''}</svg>`;
const S = { me: null, b: null, poll: null };

// ---------------------------------------------------------------- rede e modo offline
// GET: guarda a última resposta no aparelho e usa ela quando não tem internet.
// POST/PUT: sem internet, a ação vai para uma fila (outbox) e é enviada sozinha quando a conexão volta.
// Cada ação leva um id único (X-Id-Local); se chegar repetida, o servidor devolve a resposta da primeira.
const NET = { on: navigator.onLine, sync: false };
const OUT = 'caju_outbox', FALHAS = 'caju_falhas', CK = 'caju_c:';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
const ls = { get: (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { limparCache(); try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { } } } };
function limparCache() { Object.keys(localStorage).filter(k => k.startsWith(CK)).forEach(k => localStorage.removeItem(k)); }
const fila = () => ls.get(OUT, []), falhas = () => ls.get(FALHAS, []);
const SEM_FILA = /\/api\/(login|logout|me$|demo|push|posicao|backup|feira\/venda|c\/)|whatsapp|codigo/;
function semRede(e) { return e instanceof TypeError || /Failed to fetch|NetworkError|Load failed/i.test(e?.message || ''); }
function setNet(on) { if (NET.on !== on) { NET.on = on; barraRede(); if (on) sincronizar(); } }
async function api(url, opts = {}) {
  const o = { method: opts.method || (opts.body !== undefined ? 'POST' : 'GET'), headers: {} };
  if (opts.body !== undefined) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(opts.body); }
  const get = o.method === 'GET', enfileira = !get && !SEM_FILA.test(url);
  if (enfileira) o.headers['X-Id-Local'] = opts.idLocal || uid();
  let r;
  try {
    if (!get && enfileira && fila().length) throw new TypeError('fila'); // mantém a ordem: se já tem fila, entra no fim dela
    r = await fetch(url, o);
  } catch (e) {
    setNet(e.message === 'fila' ? NET.on : false);
    if (get) { const c = ls.get(CK + url); if (c !== undefined) return c; throw new Error('Sem internet e esta tela ainda não foi aberta neste aparelho'); }
    if (enfileira) {
      const item = { id: o.headers['X-Id-Local'], url, method: o.method, body: opts.body, em: new Date().toISOString(), desc: opts.desc || descAcao(url, opts.body), resumo: opts.resumo || null };
      ls.set(OUT, [...fila(), item]); otimista(url, opts.body); barraRede();
      if (!NET.on || e.message === 'fila') setTimeout(sincronizar, 400);
      return { _offline: true, id: null, numero: '—' };
    }
    throw new Error('Sem conexão com a internet');
  }
  setNet(true);
  if (r.status === 401 && !url.includes('login')) { S.me = null; render(); throw new Error('Faça login novamente'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || 'Erro ' + r.status);
  if (get) ls.set(CK + url, j);
  return j;
}
function descAcao(url, b) {
  const st = { separando: 'separar', em_rota: 'saída para entrega', entregue: 'entrega', cancelado: 'cancelamento' };
  if (url === '/api/pedidos') return 'Novo pedido';
  let m = url.match(/\/api\/pedidos\/(\d+)\/status/); if (m) return `Pedido: ${st[b?.status] || b?.status}`;
  if (/\/receber$/.test(url)) return `Recebimento ${brl(b?.valor || 0)}`;
  if (/\/itens$/.test(url)) return 'Edição de pedido';
  if (/\/api\/lotes/.test(url)) return 'Lote de produção';
  if (/\/api\/cad\/(\w+)/.test(url)) return 'Cadastro: ' + url.match(/\/api\/cad\/(\w+)/)[1];
  if (/estoque/.test(url)) return 'Ajuste de estoque';
  if (/contas/.test(url)) return 'Conta paga';
  return 'Alteração';
}
// atualiza as cópias salvas para a tela já mostrar o efeito da ação feita offline
function otimista(url, b) {
  const m = url.match(/\/api\/pedidos\/(\d+)\/(status|receber)/); if (!m) return;
  const id = +m[1];
  Object.keys(localStorage).filter(k => k.startsWith(CK + '/api/pedidos')).forEach(k => {
    const v = ls.get(k); const ps = Array.isArray(v) ? v : v && v.id ? [v] : []; let mud = false;
    ps.forEach(p => { if (p.id !== id) return; mud = true;
      if (m[2] === 'status') { p.status = b.status; if (b.status === 'entregue' && b.receber) { p.pago = p.total; p.aberto = 0; } }
      else { p.pago = Math.min(p.total, (p.pago || 0) + (b.valor || 0)); p.aberto = Math.max(0, p.total - p.pago); } p._pend = true; });
    if (mud) ls.set(k, v);
  });
  if (S.ps) S.ps.forEach(p => { if (p.id === id && m[2] === 'status') p.status = b.status; });
}
async function sincronizar() {
  if (NET.sync || !fila().length) return barraRede();
  if (navigator.locks) return navigator.locks.request('caju-sync', { ifAvailable: true }, l => l ? sincronizarAgora() : null);
  return sincronizarAgora();
}
async function sincronizarAgora() {
  if (NET.sync || !fila().length) return barraRede();
  NET.sync = true; barraRede(); let enviados = 0, parou = false;
  while (fila().length) {
    const it = fila()[0];
    let r;
    try { r = await fetch(it.url, { method: it.method, headers: { 'Content-Type': 'application/json', 'X-Id-Local': it.id }, body: it.body === undefined ? undefined : JSON.stringify(it.body) }); }
    catch (e) { NET.on = false; parou = true; break; }
    NET.on = true;
    if (r.status === 401) { parou = true; if (S.credOff) { try { const lr = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(S.credOff) }); if (lr.ok) { S.credOff = null; continue; } } catch (e) { } } break; }
    const q = fila(); q.shift(); ls.set(OUT, q);
    if (r.ok) enviados++;
    else { const j = await r.json().catch(() => ({})); ls.set(FALHAS, [...falhas(), { ...it, erro: j.erro || 'Erro ' + r.status }]); toast(`Não deu pra enviar "${it.desc}": ${j.erro || r.status}`, 'err'); }
  }
  NET.sync = false; barraRede();
  if (enviados) {
    ok(`✓ ${enviados} ${enviados > 1 ? 'ações enviadas' : 'ação enviada'} — tudo sincronizado`);
    try { await carregar(); } catch (e) { }
    if (S.me && !document.querySelector('.mb-bg')) render();
  }
  void parou;
}
function barraRede() {
  let el = document.getElementById('net');
  if (!el) { el = document.createElement('div'); el.id = 'net'; document.body.prepend(el); }
  const n = fila().length, f = falhas().length;
  if (!NET.on) { el.className = 'net off'; el.innerHTML = `<i class="ic-off"></i>Sem internet · trabalhando offline${n ? ` · ${n} ${n > 1 ? 'ações' : 'ação'} aguardando envio` : ''}`; }
  else if (NET.sync || n) { el.className = 'net sync'; el.innerHTML = `⏳ Enviando ${n} ${n > 1 ? 'ações' : 'ação'} feitas sem internet…`; }
  else if (f) { el.className = 'net erro'; el.innerHTML = `⚠ ${f} ${f > 1 ? 'ações não foram aceitas' : 'ação não foi aceita'} pelo sistema <button id="vfal">ver</button>`; $('#vfal').onclick = verFalhas; }
  else { el.className = ''; el.innerHTML = ''; }
  if (n && !NET.on) el.innerHTML += ' <button id="vfila">ver</button>', $('#vfila').onclick = verFila;
}
function verFila() {
  modal({ title: 'Aguardando internet', body: `<p class="small mut mb">Estas ações foram feitas sem conexão. Assim que a internet voltar, o sistema envia sozinho, na ordem.</p>${fila().map(i => `<div class="l row" style="justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line)"><span><b>${esc(i.desc)}</b>${i.resumo ? `<div class="small mut">${esc(i.resumo.cliente || '')} · ${brl(i.resumo.total || 0)}</div>` : ''}</span><span class="small mut">${new Date(i.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></div>`).join('')}` });
}
function verFalhas() {
  const m = modal({ title: 'Ações não aceitas', body: `<p class="small mut mb">Foram feitas sem internet, mas o sistema recusou ao enviar (ex.: estoque já tinha acabado). Refaça se precisar.</p>${falhas().map(i => `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><b>${esc(i.desc)}</b>${i.resumo ? ` · ${esc(i.resumo.cliente || '')} · ${brl(i.resumo.total || 0)}` : ''}<div class="small red">${esc(i.erro)}</div></div>`).join('')}`, foot: '<button class="btn" id="lf">Entendi, limpar lista</button>' });
  $('#lf', m).onclick = () => { ls.set(FALHAS, []); m.close(); barraRede(); };
}
window.addEventListener('online', () => { NET.on = true; sincronizar(); barraRede(); });
window.addEventListener('offline', () => { NET.on = false; barraRede(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) sincronizar(); });
setInterval(() => { if (fila().length) sincronizar(); }, 15000);

// ---------------------------------------------------------------- tema claro/escuro
function aplicarTema() { const t = ls.get('caju_tema', 'claro'); document.documentElement.dataset.tema = t; document.querySelector('meta[name=theme-color]')?.setAttribute('content', t === 'escuro' ? '#211812' : '#FFFFFF'); }
function trocarTema() { ls.set('caju_tema', ls.get('caju_tema', 'claro') === 'escuro' ? 'claro' : 'escuro'); aplicarTema(); render(); }
aplicarTema();

// ---------------------------------------------------------------- notificações (Web Push)
const b64ToU8 = s => { const p = '='.repeat((4 - s.length % 4) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...r].map(c => c.charCodeAt(0))); };
async function pushSub() { if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null; const reg = await navigator.serviceWorker.ready; return reg.pushManager.getSubscription(); }
async function ativarPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window))
    throw new Error(/iphone|ipad/i.test(navigator.userAgent) ? 'No iPhone: abra no Safari, toque em Compartilhar › Adicionar à Tela de Início e ative pelo app instalado.' : 'Este navegador não suporta notificações.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notificações bloqueadas. Libere nas configurações do navegador para este site.');
  const reg = await navigator.serviceWorker.ready;
  const { chave } = await api('/api/push/chave');
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(chave) });
  await api('/api/push/assinar', { body: sub.toJSON() });
  return sub;
}
async function menuNotif() {
  const sub = await pushSub().catch(() => null);
  const eventos = [['pedidos', 'Pedido novo (inclusive pela área do cliente), entregue ou cancelado'], ['financeiro', 'Pagamento recebido'], ['entregas', 'Nova entrega na sua rota']].filter(([p]) => pode(p));
  const m = modal({ title: '🔔 Notificações', body: `<p class="small mb">${sub ? '<b class="grn">Ativadas neste aparelho.</b>' : 'Receba avisos no celular mesmo com o app fechado.'}</p>
    <p class="small mut mb">Você vai ser avisado de:</p><ul class="small" style="margin:0 0 10px 18px">${eventos.map(([, t]) => `<li>${t}</li>`).join('') || '<li>Avisos gerais</li>'}</ul>
    <p class="small mut">Cada pessoa ativa no próprio aparelho. Não avisa das ações que você mesmo fez.</p>`,
    foot: sub ? '<button class="btn ghost" id="pdes">Desativar</button><button class="btn k" id="ptes">Enviar teste</button>' : '<button class="btn k" id="pat">Ativar neste aparelho</button>' });
  $('#pat', m) && ($('#pat', m).onclick = async () => { try { await ativarPush(); m.close(); ok('Notificações ativadas!'); render(); } catch (e) { err(e); } });
  $('#ptes', m) && ($('#ptes', m).onclick = async () => { try { await api('/api/push/teste', { body: { endpoint: sub.endpoint } }); ok('Teste enviado — deve chegar em segundos'); } catch (e) { err(e); } });
  $('#pdes', m) && ($('#pdes', m).onclick = async () => { try { await api('/api/push/sair', { body: { endpoint: sub.endpoint } }); await sub.unsubscribe(); m.close(); ok('Notificações desativadas'); render(); } catch (e) { err(e); } });
}
const ICO2 = { sino: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0"/>', lua: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>', sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5"/>' };
const ico2 = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICO2[k]}</svg>`;
function toast(m, t = '') { const d = document.createElement('div'); d.className = t; d.textContent = m; $('#toast').append(d); setTimeout(() => d.remove(), 3300); }
const ok = m => toast(m, 'ok'), err = e => toast(e.message || e, 'err');
function modal({ title, body, foot = '', wide = false }) {
  const bg = document.createElement('div'); bg.className = 'mb-bg';
  bg.innerHTML = `<div class="modal ${wide ? 'wide' : ''}"><div class="mh"><h3>${title}</h3><button class="x" data-x>×</button></div><div class="mc">${body}</div>${foot ? `<div class="mf">${foot}</div>` : ''}</div>`;
  bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-x]')) bg.remove(); });
  $('#modal-root').append(bg); const m = $('.modal', bg); m.close = () => bg.remove(); return m;
}
const pode = p => S.me?.perms?.includes(p);
const cfg = k => S.b?.config?.[k];
const prod = id => S.b.produtos.find(p => p.id == id);

// ---------------------------------------------------------------- inicialização
async function start() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => { });
  try { S.me = await api('/api/me'); } catch (e) { }
  if (S.me) try { await carregar(); } catch (e) { S.me = null; }
  barraRede(); sincronizar();
  window.addEventListener('hashchange', render);
  window.addEventListener('online', () => feiraSync());
  render();
}
async function carregar() { S.b = await api('/api/base'); }
function viewPadrao() { const m = MENU.find(([, , p]) => pode(p)); return m ? m[0] : 'painel'; }
function render() {
  clearInterval(S.poll); S.poll = null; S.geoWatch && navigator.geolocation?.clearWatch(S.geoWatch);
  if (!S.me) return telaLogin();
  let v = location.hash.slice(1) || viewPadrao();
  const item = MENU.find(m => m[0] === v);
  if (!item || !pode(item[2])) v = viewPadrao();
  if (v === 'entregas' && (pode('pedidos') || pode('rotas')) && !location.hash) v = viewPadrao();
  S.view = v;
  const itens = MENU.filter(m => pode(m[2]) && !(m[0] === 'entregas' && pode('rotas')));
  const nb = itens.length > 5 ? itens.slice(0, 4) : itens, resto = itens.length > 5 ? itens.slice(4) : [];
  const titulo = (MENU.find(m => m[0] === v) || [])[1] || '';
  $('#app').innerHTML = `${cfg('demo') === '1' ? '<div class="demo">MODO DEMONSTRAÇÃO · dados fictícios</div>' : ''}
   <div class="top"><img src="/static/logo.png" alt="Cajuína Dona Júlia"><b class="ttl">${esc(titulo)}</b><nav class="nav">${itens.map(([k, n]) => `<a href="#${k}" class="${k === v ? 'on' : ''}">${n}</a>`).join('')}</nav>
   <div class="me"><span class="nm">${esc(S.me.nome)}</span><button class="icb" id="bnot" title="Notificações">${ico2('sino')}</button><button class="icb" id="btema" title="Modo claro/escuro">${ico2(ls.get('caju_tema', 'claro') === 'escuro' ? 'sol' : 'lua')}</button><button id="sair">Conta</button></div></div><main id="main"></main>
   <nav class="bnav">${nb.map(([k, n]) => `<a href="#${k}" class="${k === v ? 'on' : ''}">${ico(k)}<span>${n.split(' ')[0]}</span></a>`).join('')}${resto.length ? `<a href="#" id="mais" class="${resto.some(m => m[0] === v) ? 'on' : ''}">${ico('mais')}<span>Mais</span></a>` : ''}</nav>`;
  $('#mais') && ($('#mais').onclick = e => { e.preventDefault(); const m = modal({ title: 'Menu', body: `<div class="maisg">${resto.map(([k, n]) => `<a href="#${k}" class="${k === v ? 'on' : ''}">${ico(k)}<span>${n}</span></a>`).join('')}</div>` }); $$('a', m).forEach(a => a.onclick = () => m.close()); });
  $('#sair').onclick = menuConta;
  $('#btema').onclick = trocarTema;
  $('#bnot').onclick = menuNotif;
  pushSub().then(s => s && $('#bnot')?.classList.add('on')).catch(() => { });
  ({ painel: telaPainel, pedidos: telaPedidos, producao: telaProducao, estoque: telaEstoque, clientes: telaClientes, rotas: telaRotas,
     entregas: telaEntregas, feira: telaFeira, financeiro: telaFinanceiro, equipe: telaEquipe, config: telaConfig })[v]($('#main'));
}
const hashTxt = async t => { try { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('caju:' + t)); return [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, '0')).join(''); } catch (e) { return 'x' + t.length; } };
function telaLogin(passo = 'entrar', ident0 = '') {
  const lembrado = ls.get('caju_ultimo_usuario', '');
  const olho = `<button type="button" class="olho" tabindex="-1" aria-label="Mostrar senha">👁</button>`;
  const telas = {
    entrar: `<h3>Acesso da equipe</h3><p class="lsub">Entre com seu usuário, e-mail ou CPF</p>
      <form id="lf" autocomplete="on"><label>Usuário, e-mail ou CPF</label><input id="lu" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" value="${esc(ident0 || lembrado)}" placeholder="ex.: ana ou ana@email.com" required>
      <label class="mt">Senha</label><div class="pw"><input id="lp" type="password" name="password" autocomplete="current-password" placeholder="Sua senha" required>${olho}</div>
      <label class="lemb"><input type="checkbox" id="lr" ${lembrado ? 'checked' : ''}> Lembrar meu usuário neste aparelho</label>
      <button class="btn lg full" id="lb">Entrar</button></form>
      <p class="small" id="lerr"></p><button class="lnk" id="esq">Esqueci minha senha</button>`,
    esqueci: `<h3>Recuperar acesso</h3><p class="lsub">Vamos mandar um código para o e-mail ou WhatsApp cadastrado</p>
      <form id="lf"><label>Usuário, e-mail ou CPF</label><input id="lu" autocapitalize="none" value="${esc(ident0 || lembrado)}" required>
      <button class="btn lg full mt" id="lb">Enviar código</button></form><p class="small" id="lerr"></p><button class="lnk" id="volta">← Voltar</button>`,
    codigo: `<h3>Criar nova senha</h3><p class="lsub" id="onde">Digite o código que você recebeu</p>
      <form id="lf"><label>Código de 6 números</label><input id="lc" inputmode="numeric" autocomplete="one-time-code" maxlength="6" class="cod" placeholder="••••••" required>
      <label class="mt">Nova senha (mínimo 6)</label><div class="pw"><input id="lp" type="password" autocomplete="new-password" minlength="6" required>${olho}</div>
      <button class="btn lg full mt" id="lb">Salvar e entrar</button></form><p class="small" id="lerr"></p><button class="lnk" id="volta">← Voltar</button>`
  };
  $('#app').innerHTML = `<div class="login"><div class="box"><img src="/static/logo.png" alt="Cajuína Dona Júlia">${telas[passo]}
    <div class="lfoot"><a href="/cliente">Sou cliente → área do cliente</a></div></div></div>`;
  const erro = m => { $('#lerr').innerHTML = `<b class="red">${esc(m)}</b>`; $('#lb').disabled = false; };
  $$('.olho').forEach(b => b.onclick = () => { const i = b.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password'; });
  $('#esq') && ($('#esq').onclick = () => telaLogin('esqueci', $('#lu').value));
  $('#volta') && ($('#volta').onclick = () => telaLogin('entrar', ident0));
  setTimeout(() => ($('#lu') && !$('#lu').value ? $('#lu') : $('#lp') || $('#lc'))?.focus(), 50);
  $('#lf').onsubmit = async e => {
    e.preventDefault(); $('#lb').disabled = true; $('#lerr').innerHTML = '';
    if (passo === 'entrar') {
      const u = $('#lu').value.trim(), p = $('#lp').value, chave = await hashTxt(u.toLowerCase() + '|' + p);
      try {
        S.me = await api('/api/login', { body: { usuario: u, senha: p } });
        ls.set(CK + '/api/me', S.me); const c = ls.get('caju_cred', {}); c[chave] = S.me; ls.set('caju_cred', c);
        ls.set('caju_ultimo_usuario', $('#lr').checked ? u : '');
        await carregar(); location.hash = ''; render();
      } catch (er) {
        if (/conexão/i.test(er.message)) { const me = ls.get('caju_cred', {})[chave], b = ls.get(CK + '/api/base');
          if (me && b) { S.me = me; S.b = b; ls.set(CK + '/api/me', me); S.credOff = { usuario: u, senha: p }; location.hash = ''; render(); toast('Entrou sem internet — o que fizer será enviado quando a conexão voltar'); return; }
          return erro('Sem internet. Para entrar offline, você precisa ter entrado antes neste aparelho com internet.'); }
        erro(er.message);
      }
    } else if (passo === 'esqueci') {
      try {
        const r = await api('/api/senha/esqueci', { body: { usuario: $('#lu').value.trim() } });
        const id = $('#lu').value.trim(); telaLogin('codigo', id);
        $('#onde').innerHTML = r.canais.length ? `Enviamos o código para ${r.canais.map(esc).join(' e ')}.` : r.demo_codigo ? `<b>Modo demonstração:</b> seu código é <b class="codemo">${r.demo_codigo}</b>` : esc(r.aviso || '');
      } catch (er) { erro(er.message); }
    } else {
      try { S.me = await api('/api/senha/redefinir', { body: { usuario: ident0, codigo: $('#lc').value.trim(), senha: $('#lp').value } }); ls.set(CK + '/api/me', S.me); await carregar(); location.hash = ''; render(); ok('Senha criada! Bem-vindo(a).'); }
      catch (er) { erro(er.message); }
    }
  };
}
function menuConta() {
  const m = modal({ title: 'Minha conta', body: `<p><b>${esc(S.me.nome)}</b></p><p class="small mut mb">função: ${esc(S.me.papel)}</p>
    <details><summary class="b">Trocar minha senha</summary><div class="mt"><label>Senha atual</label><input id="sa" type="password" autocomplete="current-password"><label class="mt">Nova senha (mínimo 6)</label><input id="sn" type="password" autocomplete="new-password"><button class="btn mt" id="ts">Salvar nova senha</button></div></details>`,
    foot: '<button class="btn ghost" id="sai" style="color:var(--red)">Sair do sistema</button>' });
  $('#ts', m).onclick = async () => { try { await api('/api/senha/trocar', { body: { atual: $('#sa', m).value, nova: $('#sn', m).value } }); m.close(); ok('Senha alterada'); } catch (e) { err(e); } };
  $('#sai', m).onclick = async () => { if (fila().length && !confirm('Ainda tem ações feitas sem internet esperando envio. Se sair agora, elas só vão quando alguém entrar de novo neste aparelho. Sair mesmo assim?')) return; m.close(); try { await api('/api/logout', { body: {} }); } catch (e) { } S.me = null; S.credOff = null; limparCache(); location.hash = ''; render(); };
}

// ---------------------------------------------------------------- painel
function periodoChips(id, cb, ini = 'mes') {
  const h = new Date(), iso = d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10), hoje = S.b.hoje;
  const P = { hoje: ['Hoje', hoje, hoje], sem: ['7 dias', iso(new Date(h - 6 * 864e5)), hoje], mes: ['Este mês', hoje.slice(0, 8) + '01', hoje],
    ant: ['Mês passado', iso(new Date(h.getFullYear(), h.getMonth() - 1, 1)), iso(new Date(h.getFullYear(), h.getMonth(), 0))], d90: ['90 dias', iso(new Date(h - 89 * 864e5)), hoje] };
  const el = $(id); el.innerHTML = Object.entries(P).map(([k, [n]]) => `<button data-p="${k}" class="${k === ini ? 'on' : ''}">${n}</button>`).join('');
  el.onclick = e => { const b = e.target.closest('[data-p]'); if (!b) return; $$('button', el).forEach(x => x.classList.toggle('on', x === b)); cb(P[b.dataset.p][1], P[b.dataset.p][2]); };
  cb(P[ini][1], P[ini][2]);
}
const hbars = (lst, lab, val, fmt = brl, cor) => { const mx = Math.max(1, ...lst.map(val)); return lst.map(x => `<div class="hb"><span>${esc(lab(x))}</span><div class="m"><i style="width:${val(x) / mx * 100}%${cor ? ';background:' + cor(x) : ''}"></i></div><b class="right">${fmt(val(x))}</b></div>`).join('') || '<p class="mut">Sem dados</p>'; };
function graficoLucro(ms) {
  const W = 560, H = 190, z = 100, top = 14, mx = Math.max(1, ...ms.map(m => Math.max(m.vendas, Math.abs(m.lucro)))), sc = v => v / mx * (z - top), bw = W / ms.length;
  const k = v => Math.abs(v) >= 1000 ? (v / 1000).toFixed(1).replace('.', ',') + 'k' : Math.round(v);
  const neg = Math.min(0, ...ms.map(m => m.lucro)), hneg = sc(-neg);
  const HH = Math.max(z + hneg + 34, z + 40);
  return `<svg viewBox="0 0 ${W} ${HH}" role="img" aria-label="Lucro ou prejuízo por mês">
    <line x1="0" y1="${z}" x2="${W}" y2="${z}" stroke="var(--dk2)" stroke-width="1.3"/>
    ${ms.map((m, i) => { const x = i * bw + bw / 2, hv = sc(m.vendas), hl = sc(Math.abs(m.lucro)), cor = m.lucro >= 0 ? '#3E8E2F' : '#D7261E';
      return `<g><title>${m.mes}: vendas ${brl(m.vendas)} · custos ${brl(m.custos)} · ${m.lucro >= 0 ? 'lucro' : 'prejuízo'} ${brl(m.lucro)}</title>
      <rect x="${x - 26}" y="${z - hv}" width="24" height="${hv}" rx="3" fill="#F6B400" opacity=".5"/>
      <rect x="${x + 2}" y="${m.lucro >= 0 ? z - hl : z}" width="24" height="${Math.max(hl, 1)}" rx="3" fill="${cor}"/>
      <text x="${x + 14}" y="${m.lucro >= 0 ? z - hl - 4 : z + hl + 12}" font-size="11" font-weight="800" text-anchor="middle" fill="${cor}">${k(m.lucro)}</text>
      <text x="${x}" y="${HH - 6}" font-size="11.5" text-anchor="middle" fill="var(--mut)">${m.mes}${m.parcial ? '*' : ''}</text></g>`; }).join('')}
  </svg>`;
}
function cardEquilibrio(e) {
  if (!e.configurado) return `<h3 class="mb">Ponto de equilíbrio</h3><p class="mut small mb">Descubra quantas cajuínas precisa vender para pagar o que foi investido. Ex.: produziu 2.000 garrafas gastando R$ 9.000.</p><button class="btn" id="pe-ed">Configurar</button>`;
  const cx = e.produto.un_caixa || 1, pct = e.precisa ? Math.min(100, e.vendidas / e.precisa * 100) : 0, cxt = n => cx > 1 ? ` <span class="small mut">(${inteiro(Math.ceil(n / cx))} cx)</span>` : '';
  return `<div class="row"><h3 class="sp">Ponto de equilíbrio</h3><button class="btn sm ghost" id="pe-ed">Ajustar</button></div>
    <p class="small mut">${esc(e.produto.nome)} · ${inteiro(e.qtd)} un · investimento ${brl(e.invest)} (${brl(e.custo_un)}/un)</p>
    ${e.pago ? `<big class="grn">✓ Investimento pago!</big><p class="small">E já sobrou <b class="grn">${brl(e.lucro_ate_agora)}</b> de lucro bruto.</p>`
      : `<big>Faltam ${inteiro(e.faltam)}</big><p class="small">${e.faltam === 1 ? 'unidade' : 'unidades'} para empatar o investimento${cxt(e.faltam)}</p>`}
    <div class="pb ${e.pago ? 'full' : ''}"><i style="width:${pct}%"></i></div>
    <div class="small mut mb">${inteiro(e.vendidas)} de ${inteiro(e.precisa)} vendidas desde ${dbr(e.desde)} (${Math.round(pct)}%)</div>
    <div class="lin"><span>Precisa vender para empatar</span><b>${inteiro(e.precisa)} un${cxt(e.precisa)}</b></div>
    <div class="lin"><span>Preço ${e.preco_manual ? 'definido' : 'médio real'} de venda</span><b>${brl(e.preco)}/un</b></div>
    ${!e.cabe ? `<div class="lin red"><span>⚠ A esse preço, nem vendendo todas paga o investimento</span></div>` : ''}
    <div class="lin"><span>Vendendo todas as ${inteiro(e.qtd)}</span><b class="${e.lucro_tudo >= 0 ? 'grn' : 'red'}">${e.lucro_tudo >= 0 ? 'lucro' : 'prejuízo'} de ${brl(Math.abs(e.lucro_tudo))}</b></div>`;
}
async function editarEquilibrio() {
  const e = await api('/api/equilibrio'), c = S.b.config;
  const m = modal({ title: 'Ponto de equilíbrio', body: `<p class="small mut mb">Informe quanto foi gasto para produzir um lote de cajuína. O sistema conta as vendas a partir da data de início e mostra quantas faltam para pagar o investimento.</p>
    ${e.lotes.length ? `<label>Usar um lote produzido (opcional)</label><select id="pl"><option value="">— digitar manualmente —</option>${e.lotes.map(l => `<option value="${l.id}" data-q="${l.qtd}" data-c="${l.custo_total}" data-p="${l.produto_id}" data-d="${l.data_fab}">${esc(l.codigo)} · ${esc(prod(l.produto_id)?.nome || '')} · ${inteiro(l.qtd)} un · custo ${brl(l.custo_total)}</option>`).join('')}</select>` : ''}
    <div class="g2 mt"><div><label>Produto</label><select id="pp">${S.b.produtos.map(p => `<option value="${p.id}" ${p.id == (c.pe_produto || 1) ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select></div>
    <div><label>Quantidade produzida (unidades)</label><input id="pq" inputmode="numeric" value="${esc(c.pe_qtd || '2000')}"></div>
    <div><label>Investimento total (R$)</label><input id="pi" inputmode="decimal" value="${esc((c.pe_invest || '').replace('.', ','))}" placeholder="caju, açúcar, garrafas, rótulos, mão de obra…"></div>
    <div><label>Contar vendas a partir de</label><input id="pd" type="date" value="${esc(c.pe_desde || S.b.hoje.slice(0, 8) + '01')}"></div>
    <div><label>Preço de venda por unidade (vazio = média real)</label><input id="pr" inputmode="decimal" value="${esc((c.pe_preco || '').replace('.', ','))}" placeholder="${e.preco_medio ? 'média atual ' + brl(e.preco_medio) : ''}"></div></div>
    <div class="banner mt" id="sim"></div>`, foot: '<button class="btn" id="ok">Salvar</button>' });
  const sim = () => { const q = num($('#pq', m).value), inv = num($('#pi', m).value), pr = num($('#pr', m).value) || e.preco_medio || e.preco;
    $('#sim', m).innerHTML = inv && pr ? `Custo por unidade: <b>${brl(inv / (q || 1))}</b> · Precisa vender <b>${inteiro(Math.ceil(inv / pr))}</b> de ${inteiro(q)} a ${brl(pr)} · Vendendo todas: <b>${brl(q * pr - inv)}</b>` : 'Preencha o investimento para simular.'; };
  $$('input', m).forEach(i => i.oninput = sim); sim();
  $('#pl', m) && ($('#pl', m).onchange = e2 => { const o = e2.target.selectedOptions[0]; if (!o.value) return; $('#pq', m).value = o.dataset.q; $('#pi', m).value = String(o.dataset.c).replace('.', ','); $('#pp', m).value = o.dataset.p; $('#pd', m).value = o.dataset.d; sim(); });
  $('#ok', m).onclick = async () => { try { await api('/api/config', { method: 'PUT', body: { pe_produto: $('#pp', m).value, pe_qtd: String(parseInt($('#pq', m).value) || 0), pe_invest: String(num($('#pi', m).value) || ''), pe_desde: $('#pd', m).value, pe_preco: $('#pr', m).value.trim() ? String(num($('#pr', m).value)) : '' } }); m.close(); await carregar(); render(); ok('Ponto de equilíbrio atualizado'); } catch (er) { err(er); } };
}
function telaPainel(main) {
  const h = new Date().getHours(), saud = h < 12 ? 'BOM DIA' : h < 18 ? 'BOA TARDE' : 'BOA NOITE';
  main.innerHTML = `<div class="hero"><div class="t"><small>${saud}, ${esc(S.me.nome.split(' ')[0].toUpperCase())}</small><h1>${esc(cfg('slogan') || 'Sabor que é Piauí!')}</h1><p id="hero-p">Carregando…</p>
    <span class="seal">● ${esc(cfg('selo'))}</span></div><img src="/static/fotos/estande.jpg" alt=""></div>
    <div class="row wrap mb"><div class="chips" id="per"></div><span class="sp"></span><a class="btn ghost sm" id="csv">⬇ Planilha</a><a class="btn ghost sm" id="pdf" target="_blank">📄 Relatório PDF</a>${pode('pedidos') ? '<a class="btn" href="#pedidos" id="np">+ Novo pedido</a>' : ''}</div>
    <div id="pn"></div>`;
  $('#np') && ($('#np').onclick = e => { e.preventDefault(); location.hash = 'pedidos'; setTimeout(novoPedido, 150); });
  periodoChips('#per', async (de, ate) => {
    $('#csv').href = `/api/relatorio.csv?de=${de}&ate=${ate}`; $('#pdf').href = `/relatorio?de=${de}&ate=${ate}`;
    const p = await api(`/api/painel?de=${de}&ate=${ate}`);
    const garrafas = p.produto.filter(x => /cajuína/i.test(x.nome)).reduce((a, x) => a + x.qtd, 0);
    $('#hero-p').textContent = `${dbr(de)} a ${dbr(ate)}: ${inteiro(garrafas)} garrafas vendidas, ${p.a_entregar} pedido(s) para entregar e ${brl(p.receber.total)} a receber.`;
    const mxd = Math.max(1, ...p.dia.map(x => x.total));
    $('#pn').innerHTML = `<div class="kpis">
      <div class="kpi"><small>Vendido no período</small><b>${brl(p.vendas)}</b>${p.variacao != null ? `<em class="${p.variacao >= 0 ? 'grn' : 'red'}">${p.variacao >= 0 ? '▲' : '▼'} ${Math.abs(p.variacao)}% vs período anterior</em>` : ''}</div>
      <div class="kpi k"><small>Pedidos · ticket médio</small><b>${p.pedidos}</b><em>${brl(p.ticket)} por pedido</em></div>
      <div class="kpi k"><small>Unidades vendidas</small><b>${inteiro(p.unidades)}</b><em>garrafas e potes</em></div>
      <div class="kpi g"><small>Margem bruta</small><b>${p.vendas ? Math.round((1 - p.cmv / p.vendas) * 100) : 0}%</b><em>custo dos produtos ${brl(p.cmv)}</em></div>
      <div class="kpi r"><small>A receber (total)</small><b class="red">${brl(p.receber.total)}</b><em class="red">${brl(p.receber.vencido)} vencido · ${p.receber.n_vencidos} pendência(s)</em></div></div>
      ${p.meses ? `<div class="res"><div class="card"><div class="row"><h3 class="sp">Lucro ou prejuízo</h3><span class="small mut">${dbr(de)} a ${dbr(ate)}</span></div>
        <div class="dre3"><div><small>Vendas</small><b>${brl(p.resultado.vendas)}</b></div><div><small>Custos</small><b>${brl(p.resultado.custos)}</b></div>
        <div class="${p.resultado.lucro >= 0 ? 'lp' : 'lr'}"><small>${p.resultado.lucro >= 0 ? 'Lucro' : 'Prejuízo'}</small><b>${brl(p.resultado.lucro)}</b></div></div>
        <div class="gl">${graficoLucro(p.meses)}</div>
        <div class="leg"><span><i style="background:#F6B40088"></i>vendas</span><span><i style="background:#3E8E2F"></i>lucro</span><span><i style="background:#D7261E"></i>prejuízo</span><span>· custos = produto vendido + perdas + contas do mês · * mês em andamento</span></div></div>
        <div class="card pe" id="pe">${cardEquilibrio(p.equilibrio)}</div></div>` : ''}
      <div class="g3 gA">
       <div class="card"><h3 class="mb">Vendas por dia</h3><div class="bars">${p.dia.map(x => `<i style="height:${x.total / mxd * 100}%" title="${dm(x.dia)} · ${brl(x.total)}"></i>`).join('')}</div>
         <h3 class="mb mt">Por canal</h3>${hbars(p.canal, x => S.b.canais[x.canal] || x.canal, x => x.total)}</div>
       <div class="card"><h3 class="mb">⚠ Atenção</h3>${p.alertas.map(a => `<div class="alert"><i class="${a.nivel}"></i><span class="sp">${esc(a.texto)}</span><span class="pill ${a.nivel === 'bad' ? 'p-bad' : 'p-warn'}">${esc(a.extra)}</span></div>`).join('') || '<p class="mut">Tudo em ordem 🎉</p>'}
         <h3 class="mb mt">Estoque</h3><table>${p.estoque.map(e => `<tr><td>${esc(e.nome)}</td><td class="n b ${e.minimo && e.saldo <= e.minimo ? 'red' : ''}">${inteiro(e.saldo)}</td><td class="n small mut">${e.dias ? '~' + e.dias + ' dias' : ''}</td></tr>`).join('')}</table></div>
       <div class="card"><h3 class="mb">Melhores clientes</h3>${hbars(p.clientes, x => x.nome, x => x.total)}
         <h3 class="mb mt">Por rota</h3>${hbars(p.rota, x => x.nome, x => x.total)}
         <h3 class="mb mt">Por produto</h3>${hbars(p.produto, x => x.nome, x => x.qtd, v => inteiro(v) + ' un')}</div></div>`;
    $('#pe-ed') && ($('#pe-ed').onclick = editarEquilibrio);
  });
}

// ---------------------------------------------------------------- pedidos
function pillCanal(p) { return `<span class="pill ${CANAL_PILL[p.canal] || ''}">${esc(S.b.canais[p.canal] || p.canal)}</span>`; }
function itensTxt(p) { return p.itens.map(i => { const cx = prod(i.produto_id)?.un_caixa || 1; return `<li>${cx > 1 && i.qtd >= cx ? Math.floor(i.qtd / cx) + ' cx' + (i.qtd % cx ? ' + ' + (i.qtd % cx) + ' un' : '') + ' ·' : i.qtd + ' un ·'} ${esc(i.descricao)}</li>`; }).join(''); }
function pagPill(p) { return p.status === 'cancelado' ? '<span class="pill p-off">cancelado</span>' : p.aberto <= 0.009 ? '<span class="pill p-ok">pago</span>' : p.vencido ? `<span class="pill p-bad">vencido ${dm(p.vencimento)}</span>` : p.condicao === 'prazo' ? `<span class="pill p-warn">a prazo · ${dm(p.vencimento)}</span>` : `<span class="pill p-warn">a receber</span>`; }
function telaPedidos(main) {
  let filtro = 'todos';
  S.kbTab = S.kbTab || 'novo';
  main.innerHTML = `<div class="ptool"><h2 class="sp hide-m">Pedidos e encomendas</h2>
    <div class="busca"><input id="busca" placeholder="Buscar nº ou cliente" enterkeyhint="search"><button class="btn" id="np">+ Novo pedido</button></div>
    <div class="chips scroll" id="pf">${[['todos', 'Todos'], ['revenda', 'Revendedores'], ['consumidor', 'Consumidores'], ['online', 'Área do cliente']].map(([k, n]) => `<button data-f="${k}" class="${k === filtro ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    <div class="kbtabs" id="kt"></div><div class="kb" id="kb"></div>`;
  $('#np').onclick = () => novoPedido();
  $('#pf').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; filtro = b.dataset.f; $$('#pf button').forEach(x => x.classList.toggle('on', x === b)); draw(S.ps || []); };
  $('#busca').onkeydown = async e => { if (e.key !== 'Enter') return; const r = await api('/api/pedidos?q=' + encodeURIComponent(e.target.value)); if (r[0]) detalhePedido(r[0].id); else toast('Nada encontrado', 'err'); };
  $('#kt').onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; S.kbTab = b.dataset.t; draw(S.ps || []); };
  const f = p => filtro === 'todos' || (filtro === 'revenda' ? p.cliente_tipo === 'revenda' : filtro === 'online' ? p.canal === 'online' : p.cliente_tipo !== 'revenda');
  const draw = ps => {
    S.ps = ps;
    const cols = [['novo', 'Novos'], ['separando', 'Separando'], ['em_rota', 'Em rota'], ['entregue', 'Entregues']];
    const n = st => ps.filter(p => p.status === st && f(p)).length;
    $('#kt').innerHTML = cols.map(([st, nm]) => `<button data-t="${st}" class="${st === S.kbTab ? 'on' : ''}">${nm}<em>${n(st)}</em></button>`).join('');
    const pend = fila().filter(i => i.url === '/api/pedidos' && i.resumo).map(i => `<div class="kc pend"><div class="h"><b>⏳ ${esc(i.resumo.cliente)}</b></div><div class="small mut">aguardando internet para entrar no sistema</div><ul>${(i.resumo.itens || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul><div class="f"><b class="tv">${brl(i.resumo.total)}</b><span class="pill p-warn">offline</span></div></div>`).join('');
    $('#kb').innerHTML = cols.map(([st, nm]) => { const l = ps.filter(p => p.status === st && f(p)); if (st === 'novo' && pend) return `<div class="kcol ${st === S.kbTab ? 'on' : ''}"><h4>${nm}<em>${l.length}</em></h4>${pend}${l.map(cardPed).join('')}</div>`; return `<div class="kcol ${st === S.kbTab ? 'on' : ''}"><h4>${nm}${st === 'entregue' ? ' (3 dias)' : ''}<em>${l.length}</em></h4>${l.map(cardPed).join('') || '<div class="empty small">Nenhum pedido aqui</div>'}</div>`; }).join('');
  };
  $('#kb').onclick = e => { const a = e.target.closest('[data-act]'); if (a) { e.stopPropagation(); return acao(+a.dataset.id, a.dataset.act); } const c = e.target.closest('[data-pid]'); if (c) detalhePedido(+c.dataset.pid); };
  const load = async () => { try { draw(await api('/api/pedidos?ativos=1')); } catch (e) { } };
  load(); S.poll = setInterval(load, 15000);
}
function cardPed(p) {
  const prox = { novo: ['separando', 'Separar'], separando: ['em_rota', 'Saiu p/ entrega'], em_rota: ['entregue', 'Entregue'] }[p.status];
  return `<div class="kc ${p.vencido ? 'venc' : p.cliente_tipo === 'revenda' ? 'rev' : p.canal === 'online' ? 'onl' : ''}" data-pid="${p.id}">
    <div class="h"><b>#${p.numero} · ${esc(p.cliente || 'Feira/balcão')}</b></div><div class="row" style="gap:4px;margin-top:3px">${pillCanal(p)}${p.rota ? `<span class="pill p-bal">${esc(p.rota)}</span>` : ''}</div>
    <ul>${itensTxt(p)}</ul><div class="f"><b class="tv">${brl(p.total)}</b>${pagPill(p)}</div>
    ${p.entregador ? `<div class="small mut">🚚 ${esc(p.entregador)}${p.status === 'entregue' ? (p.comprovante ? ' · <span class="grn b">📎 assinado</span>' : ' · <span class="red b">sem assinatura</span>') : ''}</div>` : p.status === 'entregue' && p.comprovante ? '<div class="small grn b">📎 espelho assinado</div>' : ''}
    ${prox && (pode('pedidos') || pode('rotas')) ? `<div class="acts"><button class="btn sm ghost" data-act="espelho" data-id="${p.id}">Espelho</button><button class="btn sm ${p.status === 'em_rota' ? 'g' : 'k'}" data-act="${prox[0]}" data-id="${p.id}">${prox[1]}</button></div>` : ''}</div>`;
}
async function acao(id, act) {
  try {
    if (act === 'espelho') return window.open('/espelho/' + id, '_blank');
    if (act === 'em_rota') return despachar([id]);
    if (act === 'entregue') return entregar(await api('/api/pedidos/' + id).catch(e => { const x = (S.ps || []).find(p => p.id === id); if (x) return x; throw e; }));
    await api(`/api/pedidos/${id}/status`, { body: { status: act } }); ok(act === 'separando' ? 'Em separação' : 'Atualizado'); render();
  } catch (e) { err(e); }
}
function despachar(ids) {
  const m = modal({ title: `Saída para entrega (${ids.length})`, body: `<label>Entregador</label><div class="chips" id="ents">${S.b.entregadores.map(e => `<button data-e="${e.id}">${esc(e.nome)}</button>`).join('')}<button data-e="">Retirada / outro</button></div>` });
  $('#ents', m).onclick = async e => {
    const b = e.target.closest('[data-e]'); if (!b) return;
    try { for (const id of ids) await api(`/api/pedidos/${id}/status`, { body: { status: 'em_rota', entregador_id: b.dataset.e || null } }); m.close(); ok('Saiu para entrega'); render(); } catch (er) { err(er); }
  };
}
function entregar(p, aposOk) {
  let foto = '';
  const exige = cfg('exigir_comprovante') === '1';
  const m = modal({
    title: `Entregar #${p.numero} · ${esc(p.cliente || '')}`, body: `${p.aberto > 0.009 ? (p.condicao === 'vista' ? `<div class="banner">💰 Cobrar <b>${brl(p.aberto)}</b> na entrega</div>` : `<p class="mb">A prazo · vence <b>${dbr(p.vencimento)}</b> (${brl(p.aberto)})</p>`) : '<p class="mb grn b">✓ Já está pago</p>'}
    ${p.aberto > 0.009 ? `<label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="rec" style="width:auto" ${p.condicao === 'vista' ? 'checked' : ''}> Recebi o pagamento agora</label>
    <div class="chips mt" id="fr">${['pix', 'dinheiro', 'credito', 'debito'].map(f => `<button data-f="${f}" class="${f === (p.forma || 'pix') ? 'on' : ''}">${FORMAS[f]}</button>`).join('')}</div>` : ''}
    <label class="mt">Comprovante de entrega${exige ? '' : ' (opcional)'}</label>
    <label class="foto-btn" id="fb"><input type="file" accept="image/*" capture="environment" id="ft" hidden><span>📷</span><b>Fotografar o espelho assinado</b><small>Peça para o cliente assinar o espelho impresso e tire a foto inteira, com boa luz</small></label>
    <img id="prev" class="foto-prev">
    <label class="mt">Nome de quem recebeu</label><input id="rpor" placeholder="ex.: Maria (gerente)" value="${esc(p.contato || '')}">
    ${exige ? `<p class="small mt"><a href="#" id="semass">O cliente não assinou?</a></p><div id="semd" style="display:none"><label>Por que não tem assinatura?</label><input id="semm" placeholder="ex.: deixado com o porteiro, cliente ausente"></div>` : ''}`,
    foot: `<button class="btn g lg" id="ok" ${exige ? 'disabled' : ''}>✓ Confirmar entrega</button>`
  });
  let forma = p.forma || 'pix';
  const libera = () => { $('#ok', m).disabled = exige && !foto && !($('#semm', m)?.value.trim()); };
  $('#fr', m) && ($('#fr', m).onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; forma = b.dataset.f; $$('#fr button', m).forEach(x => x.classList.toggle('on', x === b)); });
  $('#ft', m).onchange = async e => { if (!e.target.files[0]) return; foto = await reduzir(e.target.files[0], 1500, .62); $('#prev', m).src = foto; $('#prev', m).style.display = 'block'; $('#fb', m).classList.add('ok'); $('#fb b', m).textContent = '✓ Foto do espelho anexada (toque para refazer)'; libera(); };
  $('#semass', m) && ($('#semass', m).onclick = e => { e.preventDefault(); $('#semd', m).style.display = 'block'; $('#semm', m).focus(); });
  $('#semm', m) && ($('#semm', m).oninput = libera);
  $('#ok', m).onclick = async () => {
    $('#ok', m).disabled = true;
    try {
      const r = await api(`/api/pedidos/${p.id}/status`, { body: { status: 'entregue', canhoto: foto, recebido_por: $('#rpor', m).value.trim(), sem_comprovante: $('#semm', m)?.value.trim() || '', receber: $('#rec', m)?.checked, forma } });
      m.close(); r._offline ? toast('Sem internet: entrega e foto salvas no aparelho, vão sozinhas quando a conexão voltar') : ok('Entrega confirmada'); aposOk ? aposOk() : render();
    } catch (e) { err(e); libera(); }
  };
}
function anexarComprovante(p) {
  const m = modal({ title: `Espelho assinado · #${p.numero}`, body: `<label class="foto-btn" id="fb"><input type="file" accept="image/*" capture="environment" id="ft" hidden><span>📷</span><b>Fotografar o espelho assinado</b><small>Ou escolha uma foto da galeria</small></label><img id="prev" class="foto-prev">
    <label class="mt">Nome de quem recebeu</label><input id="rpor" value="${esc(p.recebido_por || '')}">`, foot: '<button class="btn g" id="ok" disabled>Salvar comprovante</button>' });
  let foto = '';
  $('#ft', m).onchange = async e => { if (!e.target.files[0]) return; foto = await reduzir(e.target.files[0], 1500, .62); $('#prev', m).src = foto; $('#prev', m).style.display = 'block'; $('#fb', m).classList.add('ok'); $('#ok', m).disabled = false; };
  $('#ok', m).onclick = async () => { try { const r = await api(`/api/pedidos/${p.id}/comprovante`, { body: { foto, recebido_por: $('#rpor', m).value.trim() } }); m.close(); r._offline ? toast('Sem internet: foto salva no aparelho, envia quando voltar a internet') : ok('Comprovante salvo'); if (!r._offline) detalhePedido(p.id); } catch (e) { err(e); } };
}
function reduzir(arq, max = 900, q = .7) {
  return new Promise((res, rej) => { const fr = new FileReader(), img = new Image(); fr.onload = () => img.src = fr.result; img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)); const cv = document.createElement('canvas'); cv.width = img.width * s; cv.height = img.height * s; cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); res(cv.toDataURL('image/jpeg', q)); }; img.onerror = rej; fr.readAsDataURL(arq); });
}
async function detalhePedido(id) {
  const p = await api('/api/pedidos/' + id);
  const m = modal({
    title: `Pedido #${p.numero}`, wide: true, body: `<div class="g3 mb"><div><label>Cliente</label><b>${esc(p.cliente || 'Feira/balcão')}</b><div class="small mut">${esc(p.endereco || '')} ${esc(p.cidade || '')}<br>${tel(p.telefone)}</div></div>
      <div><label>Situação</label><b>${STATUS[p.status]}</b> ${pillCanal(p)}<div class="small mut">criado ${dbr(p.criado_em)} ${hm(p.criado_em)} por ${esc(p.usuario)}${p.entregador ? '<br>entregador: ' + esc(p.entregador) : ''}</div></div>
      <div><label>Pagamento</label>${pagPill(p)}<div class="small mut">${FORMAS[p.forma] || p.forma} · ${p.condicao === 'prazo' ? 'a prazo' : 'à vista'} · vence ${dbr(p.vencimento)}<br>tabela ${esc(p.tabela || '')}${p.rota ? ' · rota ' + esc(p.rota) : ''}</div></div></div>
      <table><tr><th>Produto</th><th>Lote (validade)</th><th class="n">Qtd</th><th class="n">Unit.</th><th class="n">Total</th></tr>
      ${p.itens.map(i => `<tr><td><b>${esc(i.descricao)}</b></td><td class="small">${i.lotes.map(l => `${esc(l.codigo)} <span class="mut">(${dm(l.validade)}/${l.validade.slice(2, 4)})</span>${i.lotes.length > 1 ? ' ×' + l.qtd : ''}`).join('<br>')}</td><td class="n">${(i.un_caixa || 1) > 1 && i.qtd >= i.un_caixa ? `<b>${Math.floor(i.qtd / i.un_caixa)} cx</b>${i.qtd % i.un_caixa ? ' + ' + i.qtd % i.un_caixa : ''}<div class="small mut">${i.qtd} un</div>` : i.qtd + ' un'}</td><td class="n">${(i.un_caixa || 1) > 1 ? `${brl(i.unit * i.un_caixa)}<span class="small mut">/cx</span><div class="small mut">${brl(i.unit)}/un</div>` : brl(i.unit)}</td><td class="n">${brl(i.total)}</td></tr>`).join('')}
      <tr><td colspan="4">Subtotal</td><td class="n">${brl(p.subtotal)}</td></tr><tr><td colspan="4">Frete</td><td class="n">${p.frete ? brl(p.frete) : 'grátis'}</td></tr>${p.desconto ? `<tr><td colspan="4">Desconto</td><td class="n">−${brl(p.desconto)}</td></tr>` : ''}
      <tr><td colspan="4"><b>Total</b></td><td class="n"><b>${brl(p.total)}</b></td></tr>${p.pago ? `<tr><td colspan="4">Recebido</td><td class="n grn">${brl(p.pago)}</td></tr>` : ''}</table>
      ${p.recebimentos.length ? `<p class="small mut mt">${p.recebimentos.map(r => `${dbr(r.data)} · ${FORMAS[r.forma] || r.forma} · ${brl(r.valor)} (${esc(r.usuario)})`).join('<br>')}</p>` : ''}
      ${p.obs ? `<p class="mt"><b>Obs:</b> ${esc(p.obs)}</p>` : ''}${p.cancel_motivo ? `<p class="mt red"><b>Cancelado:</b> ${esc(p.cancel_motivo)}</p>` : ''}
      ${p.status === 'entregue' ? `<div class="comp ${p.comprovante ? 'ok' : ''}">${p.comprovante ? `<a href="${p.comprovante_url}" target="_blank"><img src="${p.comprovante_url}" alt="Espelho assinado"></a>` : '<div class="semf">📄</div>'}
        <div><b>${p.comprovante ? '✓ Entrega comprovada com espelho assinado' : 'Entrega sem foto do espelho assinado'}</b>
        <div class="small mut">${p.recebido_por ? 'Recebido por <b>' + esc(p.recebido_por) + '</b> · ' : ''}${dbr(p.comprovante_em || p.entregue_em || '')} ${(p.comprovante_em || p.entregue_em || '').slice(11, 16)}${p.entregador ? ' · ' + esc(p.entregador) : ''}</div>
        ${p.comprovante_obs ? `<div class="small">Motivo: ${esc(p.comprovante_obs)}</div>` : ''}
        ${pode('pedidos') || pode('entregas') ? `<button class="btn sm ghost mt" id="anx">📷 ${p.comprovante ? 'Trocar foto' : 'Anexar espelho assinado'}</button>` : ''}</div></div>` : ''}
      <p class="small mut mt">Link do cliente: <a href="${esc(p.link)}" target="_blank">${esc(p.link)}</a></p>`,
    foot: `${p.status !== 'cancelado' && pode('pedidos_cancelar') ? '<button class="btn ghost" id="canc" style="color:var(--red)">Cancelar</button>' : ''}${['novo', 'separando'].includes(p.status) && pode('pedidos') ? '<button class="btn ghost" id="edt">✎ Editar itens e preços</button>' : ''}<span class="sp"></span>
      ${p.telefone ? `<button class="btn ghost" id="wa" style="color:#137a42">WhatsApp</button>${p.aberto > 0.009 ? '<button class="btn ghost" id="cob" style="color:var(--red)">Cobrar</button>' : ''}` : ''}
      ${p.aberto > 0.009 && p.status !== 'cancelado' && (pode('financeiro') || pode('pedidos')) ? '<button class="btn y" id="rec">Receber</button>' : ''}
      <a class="btn k" href="/espelho/${p.id}?imprimir=1" target="_blank">⬇ Espelho PDF</a>`
  });
  const wa = async t => { const r = await api(`/api/pedidos/${p.id}/whatsapp?tipo=${t}`); window.open(r.link, '_blank'); };
  $('#wa', m) && ($('#wa', m).onclick = () => wa('pedido')); $('#cob', m) && ($('#cob', m).onclick = () => wa('cobranca'));
  $('#rec', m) && ($('#rec', m).onclick = () => { m.close(); receberModal(p); });
  $('#edt', m) && ($('#edt', m).onclick = () => { m.close(); novoPedido(null, p); });
  $('#anx', m) && ($('#anx', m).onclick = () => { m.close(); anexarComprovante(p); });
  $('#canc', m) && ($('#canc', m).onclick = async () => {
    const mot = prompt('Motivo do cancelamento:'); if (mot === null) return;
    try { await api(`/api/pedidos/${p.id}/status`, { body: { status: 'cancelado', motivo: mot, estornar: p.pago > 0 && confirm('Este pedido tem pagamento registrado. Estornar e cancelar?') } }); m.close(); ok('Pedido cancelado e estoque devolvido'); render(); } catch (e) { err(e); }
  });
}
function receberModal(p, depois) {
  let forma = 'pix';
  const m = modal({ title: `Receber #${p.numero} · ${esc(p.cliente || '')}`, body: `<label>Valor</label><input id="v" inputmode="decimal" value="${p.aberto.toFixed(2).replace('.', ',')}" style="font-size:20px">
    <label class="mt">Forma</label><div class="chips" id="fr">${Object.entries(FORMAS).map(([k, n]) => `<button data-f="${k}" class="${k === forma ? 'on' : ''}">${n}</button>`).join('')}</div>
    <label class="mt">Data</label><input type="date" id="dt" value="${S.b.hoje}">`, foot: `<button class="btn g" id="ok">Confirmar recebimento</button>` });
  $('#fr', m).onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; forma = b.dataset.f; $$('#fr button', m).forEach(x => x.classList.toggle('on', x === b)); };
  $('#ok', m).onclick = async () => { try { await api(`/api/pedidos/${p.id}/receber`, { body: { valor: num($('#v', m).value), forma, data: $('#dt', m).value } }); m.close(); ok('Recebimento registrado'); depois ? depois() : render(); } catch (e) { err(e); } };
}

// ---------------------------------------------------------------- novo pedido
async function novoPedido(clienteId, ed) {
  const clientes = (await api('/api/clientes')).filter(c => c.ativo || (ed && c.id == ed.cliente_id));
  const st = { cliente_id: clienteId || '', tabela_id: '', rota_id: '', itens: {}, precos: {}, desconto: 0, frete: null, condicao: 'vista', prazo: 0, forma: 'pix', obs: '', data_entrega: '' };
  const jaNoPedido = {};
  if (ed) {
    Object.assign(st, { cliente_id: ed.cliente_id || '', tabela_id: ed.tabela_id, rota_id: ed.rota_id || '', desconto: ed.desconto || 0, frete: ed.frete, condicao: ed.condicao, forma: ed.forma });
    ed.itens.forEach(i => { st.itens[i.produto_id] = (st.itens[i.produto_id] || 0) + i.qtd; st.precos[i.produto_id] = i.unit; jaNoPedido[i.produto_id] = (jaNoPedido[i.produto_id] || 0) + i.qtd; });
  }
  const mexePreco = pode('precos') || S.me.desconto_max > 0;
  const m = modal({
    title: ed ? `Editar pedido #${ed.numero}` : 'Novo pedido', wide: true, body: `<div class="np"><div>
      <div class="g2"><div class="ac"><label>Cliente</label><input id="cb" autocomplete="off" placeholder="Nome do cliente (vazio = venda balcão)" ${ed ? 'disabled' : ''}><div class="acl" id="acl"></div></div>
      <div><label>Tabela de preço</label><select id="tb" ${ed ? 'disabled' : ''}>${S.b.tabelas.map(t => `<option value="${t.id}">${esc(t.nome)}</option>`).join('')}</select></div></div>
      <div class="small mt" id="cinfo"></div>
      ${mexePreco ? '<p class="small mut mt">Toque no preço de um produto para mudar o valor da caixa ou da unidade só neste pedido.</p>' : ''}
      <div class="mt" id="prods"></div>
      <div class="g2 mt"><div><label>Observação</label><input id="obs" placeholder="ex.: entregar gelada, nota fiscal…" value="${esc(ed?.obs || '')}"></div><div><label>Entrega prevista</label><input type="date" id="de" value="${esc(ed?.data_entrega || '')}"></div></div></div>
      <div><div class="resumo" id="res"></div></div></div><div class="npbar" id="npb"></div>`
  });
  const cli = () => clientes.find(c => c.id == st.cliente_id);
  const norm = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const precoTab = pid => prod(pid).precos[st.tabela_id] ?? prod(pid).precos[cfg('tabela_padrao') || 1] ?? 0;
  const precoDe = pid => st.precos[pid] ?? precoTab(pid);
  const mudou = pid => st.precos[pid] !== undefined && Math.abs(st.precos[pid] - precoTab(pid)) > 0.004;
  const sub = () => r2(Object.entries(st.itens).reduce((a, [pid, q]) => a + q * precoDe(pid), 0));
  const rota = () => S.b.rotas.find(r => r.id == st.rota_id);
  const frete = () => st.frete !== null ? st.frete : rota() ? (rota().frete_gratis_acima && sub() >= rota().frete_gratis_acima ? 0 : rota().frete) : 0;
  const total = () => r2(Math.max(0, sub() + frete() - st.desconto));
  const qtdTxt = (pid, q) => { const cx = prod(pid).un_caixa || 1; if (cx === 1 || q < cx) return `${q} un ·`; return `${Math.floor(q / cx)} cx${q % cx ? ' + ' + (q % cx) + ' un' : ''} ·`; };
  const setCli = c => {
    if (!ed && ((c?.id || '') != st.cliente_id || !st.tabela_id)) {
      st.cliente_id = c ? c.id : ''; st.tabela_id = c?.tabela_id || cfg('tabela_padrao') || 1; st.rota_id = c?.rota_id || '';
      st.condicao = c?.prazo_dias ? 'prazo' : 'vista'; st.prazo = c?.prazo_dias || 0; st.frete = null; st.precos = {};
    }
    $('#tb', m).value = st.tabela_id;
    $('#cinfo', m).innerHTML = c ? `${c.tipo === 'revenda' ? '<span class="pill p-rev">REVENDEDOR</span>' : '<span class="pill p-enc">consumidor</span>'} ${esc(c.cidade)} · rota <b>${esc(c.rota || '—')}</b> · prazo <b>${c.prazo_dias || 0} dias</b>
      ${c.limite ? ` · limite ${brl(c.limite)}` : ''}
      ${c.aberto > 0.009 ? `<div class="devendo">⚠ Este cliente já deve <b>${brl(c.aberto)}</b>${c.pendencias ? ` (inclui ${brl(c.pendencias)} em pendências)` : ''}${c.vencido > 0 ? ` · <b>${brl(c.vencido)} vencido</b>` : ''}.</div>` : ''}
      ${pode('financeiro') || pode('clientes') ? `<button class="btn sm ghost mt" id="addpend">+ Lançar pendência / saldo devedor</button>` : ''}`
      : st.nome_novo ? `<div class="novocli"><span class="pill p-ok">CLIENTE NOVO</span> <b>${esc(st.nome_novo)}</b> será cadastrado junto com o pedido.<div class="g2 mt"><input id="ntel" inputmode="tel" placeholder="WhatsApp (opcional)" value="${esc(st.tel_novo || '')}"><input id="ncid" placeholder="Cidade (opcional)" value="${esc(st.cid_novo || '')}"></div></div>`
      : '<span class="mut">Venda sem cliente (balcão / fazenda)</span>';
    $('#addpend', m) && ($('#addpend', m).onclick = () => novaPendencia(c, async () => { const nv = (await api('/api/clientes')).find(x => x.id === c.id); if (nv) { Object.assign(c, nv); setCli(c); } }));
    $('#ntel', m) && ($('#ntel', m).oninput = e => st.tel_novo = e.target.value);
    $('#ncid', m) && ($('#ncid', m).oninput = e => st.cid_novo = e.target.value);
    drawProds(); drawRes();
  };
  const drawProds = () => {
    $('#prods', m).innerHTML = S.b.produtos.filter(p => p.ativo || st.itens[p.id]).map(p => { const cx = p.un_caixa || 1, u = precoDe(p.id);
      return `<div class="prodline"><img src="${esc(p.foto)}" alt=""><div class="i"><b>${esc(p.nome)}</b>
      <button class="ptag ${mudou(p.id) ? 'mod' : ''}" data-pr="${p.id}" ${mexePreco ? '' : 'disabled'}>${cx > 1 ? `${brl(u * cx)}<small>/cx</small> · ${brl(u)}<small>/un</small>` : `${brl(u)}<small>/un</small>`}${mexePreco ? ' <i>✎</i>' : ''}</button>
      <small>estoque ${estqTxt(p, p.saldo + (jaNoPedido[p.id] || 0))}${mudou(p.id) ? ` · tabela ${brl(precoTab(p.id) * cx)}${cx > 1 ? '/cx' : ''}` : ''}</small></div>
      ${qtyCtl(p)}</div>`; }).join('');
  };
  const qtyCtl = p => {
    const cx = p.un_caixa || 1, q = st.itens[p.id] || 0;
    const step = (k, lbl, v) => `<div class="stp"><small>${lbl}</small><div><button data-m="${p.id}" data-k="${k}">−</button><input data-q="${p.id}" data-k="${k}" inputmode="numeric" value="${v || ''}" placeholder="0"><button data-p="${p.id}" data-k="${k}">+</button></div></div>`;
    return `<div class="qty2">${cx > 1 ? step('cx', `Caixas (${cx} un)`, Math.floor(q / cx)) + step('un', 'Avulsas', q % cx) : step('un', 'Unidades', q)}</div>`;
  };
  const setQtd = (pid, cxs, avs) => { const cx = prod(pid).un_caixa || 1; st.itens[pid] = Math.max(0, (cx > 1 ? cxs * cx : 0) + avs); };
  const editarPreco = pid => {
    const p = prod(pid), cx = p.un_caixa || 1, f2 = v => r2(v).toFixed(2).replace('.', ',');
    const mp = modal({ title: `Preço · ${esc(p.nome)}`, body: `<p class="small mut mb">Vale só para este pedido. Tabela <b>${esc((S.b.tabelas.find(t => t.id == st.tabela_id) || {}).nome || '')}</b>: ${brl(precoTab(pid))}/un${cx > 1 ? ` · ${brl(precoTab(pid) * cx)}/cx` : ''}.</p>
      <div class="g2">${cx > 1 ? `<div><label>Caixa com ${cx}</label><input id="pcx" inputmode="decimal" value="${f2(precoDe(pid) * cx)}" style="font-size:20px;font-weight:800"></div>` : ''}
      <div><label>Unidade</label><input id="pun" inputmode="decimal" value="${f2(precoDe(pid))}" style="font-size:20px;font-weight:800"></div></div>
      ${!pode('precos') ? `<p class="small mut mt">Você pode dar até ${S.me.desconto_max}% de desconto no pedido.</p>` : ''}`,
      foot: `<button class="btn ghost" id="vt">Voltar à tabela</button><button class="btn k" id="okp">Aplicar</button>` });
    const pcx = $('#pcx', mp), pun = $('#pun', mp);
    pcx && (pcx.oninput = () => pun.value = f2(num(pcx.value) / cx));
    pun.oninput = () => pcx && (pcx.value = f2(num(pun.value) * cx));
    setTimeout(() => (pcx || pun).select(), 80);
    $('#vt', mp).onclick = () => { delete st.precos[pid]; mp.close(); drawProds(); drawRes(); };
    $('#okp', mp).onclick = () => { const u = pcx ? num(pcx.value) / cx : num(pun.value); st.precos[pid] = Math.round(u * 10000) / 10000; mp.close(); drawProds(); drawRes(); };
  };
  const drawRes = () => {
    const linhas = Object.entries(st.itens).filter(([, q]) => q > 0);
    $('#res', m).innerHTML = `<h3 class="mb">Resumo</h3>${linhas.map(([pid, q]) => `<div class="l small"><span>${qtdTxt(pid, q)} ${esc(prod(pid).nome)}${mudou(pid) ? ' <span class="pill p-warn">preço especial</span>' : ''}</span><span>${brl(q * precoDe(pid))}</span></div>`).join('') || '<p class="mut small">Nenhum item</p>'}
      <hr style="border:none;border-top:1px solid var(--line);margin:8px 0"><div class="l"><span>Subtotal</span><b>${brl(sub())}</b></div>
      <div class="l"><span>Rota</span><select id="rt" style="width:150px;padding:4px 6px" ${ed ? 'disabled' : ''}><option value="">Retirada</option>${S.b.rotas.map(r => `<option value="${r.id}" ${r.id == st.rota_id ? 'selected' : ''}>${esc(r.nome)}</option>`).join('')}</select></div>
      <div class="l"><span>Frete</span><input id="fr" style="width:90px;text-align:right;padding:4px 6px" value="${frete().toFixed(2).replace('.', ',')}"></div>
      <div class="l"><span>Desconto${!pode('precos') && S.me.desconto_max ? ` (até ${S.me.desconto_max}%)` : ''}</span><input id="ds" style="width:90px;text-align:right;padding:4px 6px" value="${st.desconto ? st.desconto.toFixed(2).replace('.', ',') : ''}" placeholder="0,00" ${!mexePreco ? 'disabled' : ''}></div>
      <div class="l big"><span>Total</span><span>${brl(total())}</span></div>
      ${ed ? (ed.pago ? `<p class="small mut">Já recebido: ${brl(ed.pago)}</p>` : '') + `<button class="btn lg full mt" id="ok" ${linhas.length ? '' : 'disabled'}>Salvar alterações</button>` : `
      <label class="mt">Pagamento</label><div class="seg" id="cd"><button data-c="vista" class="${st.condicao === 'vista' ? 'on' : ''}">À vista</button><button data-c="prazo" class="${st.condicao === 'prazo' ? 'on' : ''}">A prazo</button></div>
      ${st.condicao === 'prazo' ? `<div class="l mt"><span>Prazo (dias)</span><input id="pz" style="width:70px;text-align:right;padding:4px 6px" value="${st.prazo}"></div>` : ''}
      <div class="chips mt" id="fm">${['pix', 'dinheiro', 'boleto', 'credito', 'transferencia'].map(f => `<button data-f="${f}" class="${f === st.forma ? 'on' : ''}" style="padding:5px 10px;font-size:12px">${FORMAS[f]}</button>`).join('')}</div>
      ${st.condicao === 'vista' ? `<label class="mt" style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="pg" style="width:auto" ${st.pago ? 'checked' : ''}> Já recebi o pagamento</label>
        ${st.pago ? `<div class="l"><span>Valor recebido agora</span><input id="vp" inputmode="decimal" style="width:110px;text-align:right;padding:4px 6px" value="${(st.vp ?? total()).toFixed(2).replace('.', ',')}"></div>
        ${st.vp != null && st.vp < total() - 0.009 ? `<div class="devendo">Cliente fica devendo <b>${brl(total() - st.vp)}</b> deste pedido${cli() ? '' : ' — <b>escolha ou cadastre o cliente</b> para registrar a dívida'}.</div>` : ''}` : ''}` : ''}
      <button class="btn lg full mt" id="ok" ${linhas.length ? '' : 'disabled'}>Criar pedido · ${brl(total())}</button>`}`;
    const nIt = linhas.reduce((a, [, q]) => a + q, 0);
    $('#npb', m).innerHTML = nIt ? `<span><small>${inteiro(nIt)} un</small><b>${brl(total())}</b></span><button class="btn k" id="vres">Revisar e ${ed ? 'salvar' : 'fechar'} ↓</button>` : '';
    $('#vres', m) && ($('#vres', m).onclick = () => $('#res', m).scrollIntoView({ behavior: 'smooth' }));
    $('#rt', m).onchange = e => { st.rota_id = e.target.value; st.frete = null; drawRes(); };
    $('#fr', m).onchange = e => { st.frete = num(e.target.value); drawRes(); };
    $('#ds', m).onchange = e => { st.desconto = num(e.target.value); drawRes(); };
    $('#pz', m) && ($('#pz', m).onchange = e => st.prazo = parseInt(e.target.value) || 0);
    $('#pg', m) && ($('#pg', m).onchange = e => { st.pago = e.target.checked; st.vp = null; drawRes(); });
    $('#vp', m) && ($('#vp', m).onchange = e => { st.vp = Math.min(total(), Math.max(0, num(e.target.value))); drawRes(); });
    $('#cd', m) && ($('#cd', m).onclick = e => { const b = e.target.closest('[data-c]'); if (b) { st.condicao = b.dataset.c; if (st.condicao === 'prazo' && !st.prazo) st.prazo = 14; drawRes(); } });
    $('#fm', m) && ($('#fm', m).onclick = e => { const b = e.target.closest('[data-f]'); if (b) { st.forma = b.dataset.f; drawRes(); } });
    $('#ok', m).onclick = salvar;
  };
  const itensBody = () => Object.entries(st.itens).filter(([, q]) => q > 0).map(([produto_id, qtd]) => ({ produto_id, qtd, ...(mudou(produto_id) || ed ? { unit: r2(precoDe(produto_id) * 10000) / 10000 } : {}) }));
  const salvar = async () => {
    const b = $('#ok', m);
    if (!ed && !st.cliente_id && st.nome_novo) {
      const par = clientes.filter(c => norm(c.nome).includes(norm(st.nome_novo)) || norm(st.nome_novo).includes(norm(c.nome)));
      if (par.length && !confirm(`Cadastrar "${st.nome_novo}" como cliente NOVO?\n\nJá existe parecido: ${par.slice(0, 3).map(c => c.nome).join(', ')}.\nSe for um deles, toque em Cancelar e escolha na lista.`)) return;
    }
    b.disabled = true;
    try {
      if (ed) {
        const p = await api(`/api/pedidos/${ed.id}/itens`, { method: 'PUT', body: { itens: itensBody(), frete: frete(), desconto: st.desconto, obs: $('#obs', m).value, data_entrega: $('#de', m).value } });
        if (p._offline) { m.close(); toast('Sem internet: alteração salva no aparelho, vai ser enviada sozinha'); render(); return; }
        m.close(); ok(`Pedido #${p.numero} atualizado`); await carregar(); render(); setTimeout(() => detalhePedido(p.id), 250); return;
      }
      const p = await api('/api/pedidos', { body: { cliente_id: st.cliente_id || null, tabela_id: st.tabela_id, rota_id: st.rota_id || null, frete: frete(), desconto: st.desconto,
        condicao: st.condicao, prazo_dias: st.prazo, forma: st.forma, pago_agora: st.condicao === 'vista' && !!st.pago, valor_pago: st.pago && st.vp != null ? st.vp : null, obs: $('#obs', m).value, data_entrega: $('#de', m).value,
        cliente_nome: !st.cliente_id ? st.nome_novo || '' : '', cliente_tel: st.tel_novo || '', cliente_cidade: st.cid_novo || '',
        canal: cli() ? (cli().tipo === 'revenda' ? 'revenda' : 'encomenda') : st.nome_novo ? 'encomenda' : 'balcao', itens: itensBody() },
        resumo: { cliente: cli()?.nome || st.nome_novo || 'Balcão', total: total(), itens: Object.entries(st.itens).filter(([, q]) => q > 0).map(([pid, q]) => `${qtdTxt(pid, q)} ${prod(pid).nome}`) } });
      if (p._offline) { m.close(); toast('Sem internet: pedido salvo no aparelho. Ele entra no sistema sozinho quando a conexão voltar.'); render(); return; }
      m.close(); ok(`Pedido #${p.numero} criado`); await carregar(); render(); setTimeout(() => detalhePedido(p.id), 250);
    } catch (e) { err(e); b.disabled = false; }
  };
  const acl = $('#acl', m);
  const escolher = c => { st.nome_novo = ''; $('#cb', m).value = c.nome; acl.innerHTML = ''; setCli(c); };
  $('#cb', m).oninput = e => {
    const t = norm(e.target.value);
    const achados = t ? clientes.filter(c => norm(c.nome).includes(t) || String(c.telefone || '').includes(t.replace(/\D/g, '') || '#')).slice(0, 7) : [];
    acl.innerHTML = achados.map(c => `<button type="button" data-ci="${c.id}"><b>${esc(c.nome)}</b><small>${c.tipo === 'revenda' ? 'revenda · ' : ''}${esc(c.cidade || '')} ${tel(c.telefone)}</small></button>`).join('')
      + (t && !clientes.some(c => norm(c.nome) === t) ? `<button type="button" data-novo="1" class="nv">+ Cadastrar <b>${esc(e.target.value.trim())}</b> como cliente novo</button>` : '');
    const exato = clientes.find(c => norm(c.nome) === t);
    if (exato) { if (exato.id != st.cliente_id) { st.nome_novo = ''; setCli(exato); } }
    else { const v = t ? e.target.value.trim() : '', tinha = !!st.nome_novo || !!st.cliente_id; st.nome_novo = v;
      if (st.cliente_id || tinha !== !!v) setCli(null); else if (v && $('.novocli b', m)) $('.novocli b', m).textContent = v; }
  };
  acl.onmousedown = e => e.preventDefault();
  acl.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.ci) return escolher(clientes.find(c => c.id == b.dataset.ci));
    st.nome_novo = $('#cb', m).value.trim(); acl.innerHTML = ''; setCli(null);
  };
  $('#cb', m).onblur = () => setTimeout(() => { acl.innerHTML = ''; const v = $('#cb', m).value.trim(); if (v && !st.cliente_id && !st.nome_novo) { st.nome_novo = v; setCli(null); } }, 150);
  $('#tb', m).onchange = e => { st.tabela_id = e.target.value; st.precos = {}; drawProds(); drawRes(); };
  $('#prods', m).onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.pr) return editarPreco(b.dataset.pr);
    const id = b.dataset.p || b.dataset.m; if (!id) return;
    const cx = prod(id).un_caixa || 1, q = st.itens[id] || 0, d = b.dataset.p ? 1 : -1;
    let c = cx > 1 ? Math.floor(q / cx) : 0, u = cx > 1 ? q % cx : q;
    if (b.dataset.k === 'cx') c = Math.max(0, c + d); else { u = u + d; if (cx > 1 && u >= cx) { c++; u = 0; } if (u < 0) { if (cx > 1 && c > 0) { c--; u = cx - 1; } else u = 0; } }
    setQtd(id, c, u); refreshQty(id); drawRes();
  };
  const refreshQty = id => { const box = $(`[data-q="${id}"]`, m)?.closest('.qty2'); if (box && box.isConnected) try { box.outerHTML = qtyCtl(prod(id)); } catch (e) { } };
  $('#prods', m).oninput = e => {
    const i = e.target.closest('[data-q]'); if (!i) return;
    const id = i.dataset.q, cx = prod(id).un_caixa || 1, v = parseInt(i.value) || 0, q = st.itens[id] || 0;
    if (cx === 1) setQtd(id, 0, v); else if (i.dataset.k === 'cx') setQtd(id, v, q % cx); else setQtd(id, Math.floor(q / cx), v);
    drawRes();
  };
  $('#prods', m).addEventListener('change', e => { const i = e.target.closest('[data-q]'); if (i) refreshQty(i.dataset.q); });
  setCli(clientes.find(c => c.id == st.cliente_id));
  if (st.cliente_id) $('#cb', m).value = cli()?.nome || '';
}

// ---------------------------------------------------------------- produção
async function telaProducao(main) {
  const ls = await api('/api/lotes');
  main.innerHTML = `<div class="row wrap mb"><h2 class="sp">Produção por lote</h2><button class="btn" id="nl">+ Registrar produção</button></div>
    <div class="banner">🏭 Cada lote registra data, validade e custo. As vendas tiram sempre do lote que vence primeiro, e dá pra saber pra quem cada lote foi vendido.</div>
    ${ls.map(l => { const tot = l.itens.reduce((a, i) => a + i.qtd, 0), sal = l.itens.reduce((a, i) => a + i.saldo, 0); const dv = l.dias_validade;
      return `<div class="lote"><div class="h"><b>${esc(l.codigo)}</b><span class="mut">fabricado ${dbr(l.data_fab)} · validade ${dbr(l.validade)}</span>
      ${sal === 0 ? '<span class="pill p-off">esgotado</span>' : dv < 0 ? '<span class="pill p-bad">VENCIDO</span>' : dv <= 30 ? `<span class="pill p-bad">vence em ${dv} dias</span>` : dv <= 60 ? `<span class="pill p-warn">vence em ${dv} dias</span>` : '<span class="pill p-ok">dentro da validade</span>'}
      <span class="sp"></span><span class="small mut">${l.caju_kg ? inteiro(l.caju_kg) + ' kg de caju · ' : ''}custo ${brl(l.custo_total)}</span><button class="btn sm ghost" data-r="${l.id}" data-c="${esc(l.codigo)}">Rastrear vendas</button></div>
      <div class="lbar"><i style="width:${tot ? sal / tot * 100 : 0}%;${dv <= 30 && sal ? 'background:var(--red)' : ''}"></i></div>
      <div class="row wrap small">${l.itens.map(i => `<span><b>${esc(i.produto)}</b>: ${inteiro(i.saldo)} de ${inteiro(i.qtd)} · ${brl(i.custo_unit)}/un</span>`).join(' · ')}</div></div>`; }).join('') || '<div class="empty">Nenhum lote ainda</div>'}`;
  $('#nl').onclick = novoLote;
  main.onclick = async e => {
    const b = e.target.closest('[data-r]'); if (!b) return;
    const r = await api(`/api/lotes/${b.dataset.r}/rastreio`);
    modal({ title: `Rastreio do lote ${esc(b.dataset.c)}`, wide: true, body: `<p class="mb mut">Pra quem foi vendida cada unidade deste lote. Use em caso de reclamação ou recolhimento.</p>
      ${r.length ? `<table><tr><th>Pedido</th><th>Data</th><th>Cliente</th><th>Cidade</th><th>Produto</th><th class="n">Qtd</th></tr>${r.map(x => `<tr><td>#${x.numero}</td><td>${dbr(x.criado_em)}</td><td>${esc(x.cliente || 'Feira/balcão')}</td><td>${esc(x.cidade || '')}</td><td>${esc(x.produto)}</td><td class="n">${x.qtd}</td></tr>`).join('')}</table>
      <p class="mt b">${inteiro(r.reduce((a, x) => a + x.qtd, 0))} unidades em ${new Set(r.map(x => x.cliente)).size} cliente(s)</p>` : '<p class="mut">Nenhuma venda deste lote ainda.</p>'}` });
  };
}
function novoLote() {
  const m = modal({
    title: 'Registrar produção (novo lote)', body: `<div class="g2"><div><label>Data de fabricação</label><input type="date" id="df" value="${S.b.hoje}"></div><div><label>Caju processado (kg)</label><input id="kg" inputmode="decimal"></div></div>
    <label class="mt">Quantidades produzidas</label>${S.b.produtos.filter(p => p.ativo).map(p => `<div class="prodline"><img src="${esc(p.foto)}"><div class="i"><b>${esc(p.nome)}</b><small>validade ${p.validade_dias} dias</small></div><input data-q="${p.id}" inputmode="numeric" style="width:100px" placeholder="0"></div>`).join('')}
    <div class="g2 mt"><div><label>Outros custos (mão de obra, gás…)</label><input id="oc" inputmode="decimal"></div><div><label>Observação</label><input id="ob"></div></div>
    <p class="small mut mt">Garrafas, tampas, rótulos e potes saem do estoque de insumos automaticamente, pela ficha de cada produto.</p>`,
    foot: `<button class="btn" id="ok">Salvar lote</button>`
  });
  $('#ok', m).onclick = async () => {
    try { const r = await api('/api/lotes', { body: { data_fab: $('#df', m).value, caju_kg: num($('#kg', m).value), outros_custos: num($('#oc', m).value), obs: $('#ob', m).value, itens: $$('[data-q]', m).map(i => ({ produto_id: i.dataset.q, qtd: parseInt(i.value) || 0 })) } });
      m.close(); ok('Lote ' + r.codigo + ' registrado'); await carregar(); render(); } catch (e) { err(e); }
  };
}

// ---------------------------------------------------------------- estoque
async function telaEstoque(main) {
  await carregar();
  const ls = await api('/api/lotes');
  const ins = S.b.insumos || [];
  main.innerHTML = `<h2 class="mb">Estoque</h2><div class="kpis">${S.b.produtos.filter(p => p.ativo).map(p => `<div class="kpi ${p.minimo && p.saldo <= p.minimo ? 'r' : ''}"><small>${esc(p.nome)}</small><b>${inteiro(p.saldo)}</b><em>${p.un_caixa > 1 ? '≈ ' + Math.floor(p.saldo / p.un_caixa) + ' caixas · ' : ''}mínimo ${p.minimo}</em></div>`).join('')}</div>
    <div class="g2 gB"><div class="card"><h3 class="mb">Por lote (sai primeiro o que vence antes)</h3><table><tr><th>Lote</th><th>Produto</th><th>Validade</th><th class="n">Saldo</th><th></th></tr>
      ${ls.flatMap(l => l.itens.filter(i => i.saldo > 0).map(i => `<tr><td class="b">${esc(l.codigo)}</td><td>${esc(i.produto)}</td><td class="${l.dias_validade <= 30 ? 'red b' : ''}">${dbr(l.validade)}</td><td class="n b">${inteiro(i.saldo)}</td><td class="n">${pode('estoque') ? `<button class="btn sm ghost" data-li="${i.id}" data-n="${esc(l.codigo + ' · ' + i.produto)}" data-s="${i.saldo}">Ajustar</button>` : ''}</td></tr>`)).join('')}</table></div>
    <div class="card"><div class="row mb"><h3 class="sp">Insumos</h3>${pode('estoque') ? '<button class="btn sm ghost" id="ni">+ Insumo</button>' : ''}</div><table><tr><th>Insumo</th><th class="n">Estoque</th><th class="n">Mín.</th><th class="n">Custo</th><th></th></tr>
      ${ins.filter(i => i.ativo).map(i => `<tr><td>${esc(i.nome)}</td><td class="n b ${i.estoque <= i.minimo ? 'red' : ''}">${inteiro(Math.round(i.estoque * 100) / 100)} ${esc(i.unidade)}</td><td class="n">${inteiro(i.minimo)}</td><td class="n">${brl(i.custo)}</td>
      <td class="n">${pode('estoque') ? `<button class="btn sm g" data-in="${i.id}" data-n="${esc(i.nome)}">+ Entrada</button>` : ''}</td></tr>`).join('')}</table>
      <p class="small mut mt">A produção consome os insumos sozinha, pela ficha técnica de cada produto (Configurações → Produtos).</p></div></div>`;
  main.onclick = e => {
    const li = e.target.closest('[data-li]'), ii = e.target.closest('[data-in]');
    if (li) { const m = modal({ title: 'Ajustar ' + esc(li.dataset.n), body: `<div class="seg mb" id="tp"><button data-t="perda" class="on">Perda / quebra</button><button data-t="contagem">Contagem</button></div><label id="lq">Quantidade perdida</label><input id="q" inputmode="numeric"><label class="mt">Motivo</label><input id="o" placeholder="ex.: garrafas quebradas">`, foot: '<button class="btn" id="ok">Salvar</button>' });
      let t = 'perda'; $('#tp', m).onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; t = b.dataset.t; $$('#tp button', m).forEach(x => x.classList.toggle('on', x === b)); $('#lq', m).textContent = t === 'perda' ? 'Quantidade perdida' : `Quantidade contada (sistema: ${li.dataset.s})`; };
      $('#ok', m).onclick = async () => { try { await api('/api/estoque/ajuste', { body: { lote_item_id: li.dataset.li, tipo: t, qtd: num($('#q', m).value), obs: $('#o', m).value } }); m.close(); ok('Estoque ajustado'); render(); } catch (er) { err(er); } }; }
    if (ii) { const m = modal({ title: 'Entrada de ' + esc(ii.dataset.n), body: `<div class="g2"><div><label>Quantidade</label><input id="q" inputmode="decimal"></div><div><label>Custo por unidade (opcional)</label><input id="c" inputmode="decimal"></div></div><label class="mt">Observação</label><input id="o" placeholder="fornecedor, nota…">`, foot: '<button class="btn g" id="ok">Salvar</button>' });
      $('#ok', m).onclick = async () => { try { await api('/api/estoque/ajuste', { body: { insumo_id: ii.dataset.in, tipo: 'entrada', qtd: num($('#q', m).value), custo: num($('#c', m).value), obs: $('#o', m).value } }); m.close(); ok('Entrada registrada'); render(); } catch (er) { err(er); } }; }
    if (e.target.closest('#ni')) { const m = modal({ title: 'Novo insumo', body: `<label>Nome</label><input id="n"><div class="g3 mt"><div><label>Unidade</label><input id="u" value="un"></div><div><label>Mínimo</label><input id="mi"></div><div><label>Custo</label><input id="cu"></div></div>`, foot: '<button class="btn" id="ok">Criar</button>' });
      $('#ok', m).onclick = async () => { try { await api('/api/cad/insumos', { body: { nome: $('#n', m).value, unidade: $('#u', m).value, minimo: num($('#mi', m).value), custo: num($('#cu', m).value) } }); m.close(); render(); } catch (er) { err(er); } }; }
  };
}

// ---------------------------------------------------------------- clientes
let LEAF = null;
function leaflet() {
  if (window.L) return Promise.resolve(true);
  if (LEAF) return LEAF;
  LEAF = new Promise(res => {
    const c = document.createElement('link'); c.rel = 'stylesheet'; c.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.append(c);
    const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload = () => res(true); s.onerror = () => { LEAF = null; res(false); }; document.head.append(s);
  });
  return LEAF;
}
async function desenharMapa(el, pontos, extra) {
  if (!(await leaflet())) { el.innerHTML = '<div class="empty">Mapa precisa de internet para carregar.</div>'; return null; }
  const mp = L.map(el, { scrollWheelZoom: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(mp);
  const bs = [];
  pontos.filter(p => p.lat && p.lng).forEach(p => {
    const ic = L.divIcon({ className: '', html: `<div class="mk" style="background:${p.cor}"></div>`, iconSize: [16, 16], iconAnchor: [8, 8] });
    L.marker([p.lat, p.lng], { icon: ic }).addTo(mp).bindPopup(p.popup); bs.push([p.lat, p.lng]);
  });
  extra && extra(mp, bs);
  if (bs.length) mp.fitBounds(bs, { padding: [30, 30] }); else mp.setView([-6.4, -41.7], 7);
  return mp;
}
async function telaClientes(main) {
  let modo = telaClientes.modo || 'lista', filtro = 'todos';
  const cs = await api('/api/clientes');
  main.innerHTML = `<div class="row wrap mb"><h2 class="sp">Clientes e revendedores</h2><div class="seg" id="md" style="width:200px"><button data-m="lista">Lista</button><button data-m="mapa">Mapa</button></div>
    <input id="q" placeholder="Buscar…" style="width:200px"><button class="btn" id="nc">+ Cliente</button></div>
    <div class="chips mb" id="cf">${[['todos', 'Todos'], ['revenda', 'Revendedores'], ['consumidor', 'Consumidores'], ['devendo', 'Devendo'], ['sumidos', 'Sem comprar há 30+ dias']].map(([k, n]) => `<button data-f="${k}" class="${k === filtro ? 'on' : ''}">${n}</button>`).join('')}</div><div id="cc"></div>`;
  const f = c => (filtro === 'todos' || (filtro === 'devendo' ? c.aberto > 0.009 : filtro === 'sumidos' ? (c.dias_sem_comprar ?? 999) >= 30 : c.tipo === filtro)) && (!$('#q').value || c.nome.toLowerCase().includes($('#q').value.toLowerCase()) || (c.cidade || '').toLowerCase().includes($('#q').value.toLowerCase()));
  const cor = c => c.vencido > 0 ? '#D7261E' : (c.dias_sem_comprar ?? 999) >= 30 ? '#F6B400' : '#3E8E2F';
  const draw = () => {
    $$('#md button').forEach(b => b.classList.toggle('on', b.dataset.m === modo));
    const l = cs.filter(f);
    if (modo === 'mapa') {
      $('#cc').innerHTML = '<div id="mapa"></div><div class="row small mt" style="gap:16px"><span><i class="mk" style="display:inline-block;background:#3E8E2F;width:12px;height:12px"></i> em dia</span><span><i class="mk" style="display:inline-block;background:#D7261E;width:12px;height:12px"></i> com conta vencida</span><span><i class="mk" style="display:inline-block;background:#F6B400;width:12px;height:12px"></i> sem comprar há 30+ dias</span></div>';
      desenharMapa($('#mapa'), l.map(c => ({ lat: c.lat, lng: c.lng, cor: cor(c), popup: `<b>${esc(c.nome)}</b><br>${esc(c.cidade)} · ${esc(c.rota || '')}<br>${c.aberto > 0 ? 'Em aberto: ' + brl(c.aberto) + '<br>' : ''}Último pedido: ${dbr(c.ultimo) || '—'}<br><a href="https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}" target="_blank">Como chegar</a>` })),
        (mp, bs) => { const fz = [num(cfg('lat_fazenda')), num(cfg('lng_fazenda'))]; L.marker(fz, { icon: L.divIcon({ className: '', html: '<div style="font-size:26px">🏭</div>', iconSize: [28, 28], iconAnchor: [14, 14] }) }).addTo(mp).bindPopup('<b>Fazenda Sossego</b>'); bs.push(fz); });
      return;
    }
    $('#cc').innerHTML = `<div class="card"><table class="cli"><tr><th>Cliente</th><th>Cidade · rota</th><th class="hm">Tabela</th><th class="n hm">Prazo</th><th class="n">Em aberto</th><th class="n hm">Compras no ano</th><th class="hm">Último pedido</th></tr>
      ${l.map(c => `<tr class="click" data-c="${c.id}"><td><b>${esc(c.nome)}</b> ${c.tipo === 'revenda' ? '<span class="pill p-rev">revenda</span>' : ''}${!c.ativo ? ' <span class="pill p-off">inativo</span>' : ''}<div class="small mut">${tel(c.telefone)}<span class="om">${c.ultimo ? ` · último há ${c.dias_sem_comprar} d` : ''}</span></div></td>
      <td>${esc(c.cidade)}<div class="small mut">${esc(c.rota || '—')}</div></td><td class="small hm">${esc(c.tabela || '')}</td><td class="n hm">${c.prazo_dias ? c.prazo_dias + ' d' : 'à vista'}</td>
      <td class="n b ${c.vencido > 0 ? 'red' : ''}">${c.aberto > 0 ? brl(c.aberto) : '—'}${c.vencido > 0 ? '<div class="small">vencido ' + brl(c.vencido) + '</div>' : ''}</td><td class="n hm">${brl(c.total_ano)}</td>
      <td class="hm">${c.ultimo ? dbr(c.ultimo) + `<div class="small ${c.dias_sem_comprar >= 30 ? 'red' : 'mut'}">há ${c.dias_sem_comprar} dias</div>` : '—'}</td></tr>`).join('')}</table>${l.length ? '' : '<div class="empty">Nenhum cliente</div>'}</div>`;
  };
  $('#md').onclick = e => { const b = e.target.closest('[data-m]'); if (b) { modo = telaClientes.modo = b.dataset.m; draw(); } };
  $('#cf').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; filtro = b.dataset.f; $$('#cf button').forEach(x => x.classList.toggle('on', x === b)); draw(); };
  $('#q').oninput = () => { clearTimeout(draw.t); draw.t = setTimeout(draw, 200); };
  $('#nc').onclick = () => editarCliente({ tipo: 'revenda', tabela_id: 2, prazo_dias: 14, ativo: 1 });
  $('#cc').onclick = e => { const r = e.target.closest('[data-c]'); if (r) fichaCliente(cs.find(c => c.id == r.dataset.c)); };
  draw();
}
function receberDebito(x, depois) {
  const m = modal({ title: 'Receber pendência', body: `<p class="mb"><b>${esc(x.descricao)}</b> · em aberto ${brl(x.aberto)}</p><div class="g2"><div><label>Valor recebido</label><input id="v" inputmode="decimal" value="${x.aberto.toFixed(2).replace('.', ',')}"></div>
    <div><label>Forma</label><select id="f">${['pix', 'dinheiro', 'transferencia', 'credito', 'debito', 'boleto'].map(f => `<option value="${f}">${FORMAS[f] || f}</option>`).join('')}</select></div></div>`, foot: '<button class="btn g" id="ok">Confirmar recebimento</button>' });
  $('#ok', m).onclick = async () => { try { const r = await api(`/api/debitos/${x.id}/receber`, { body: { valor: num($('#v', m).value), forma: $('#f', m).value } }); m.close(); ok(r._offline ? 'Sem internet: recebimento salvo, envia quando voltar' : 'Recebido'); depois && depois(); } catch (e) { err(e); } };
}
function novaPendencia(c, depois) {
  const m = modal({ title: `Pendência · ${esc(c.nome)}`, body: `<p class="small mut mb">Lance uma dívida antiga, um saldo devedor ou qualquer valor que o cliente deva fora dos pedidos. Ela entra no "em aberto", no limite de crédito e na cobrança.</p>
    <label>Descrição</label><input id="d" placeholder="ex.: Saldo anterior ao sistema · garrafas não devolvidas">
    <div class="g2 mt"><div><label>Valor (R$)</label><input id="v" inputmode="decimal"></div><div><label>Vencimento</label><input id="ve" type="date" value="${S.b.hoje}"></div></div>`, foot: '<button class="btn" id="ok">Lançar pendência</button>' });
  setTimeout(() => $('#d', m).focus(), 60);
  $('#ok', m).onclick = async () => { try { await api(`/api/clientes/${c.id}/debitos`, { body: { descricao: $('#d', m).value || 'Saldo devedor', valor: num($('#v', m).value), vencimento: $('#ve', m).value } }); m.close(); ok('Pendência lançada'); depois && depois(); } catch (e) { err(e); } };
}
async function fichaCliente(c) {
  const ps = await api('/api/pedidos?cliente_id=' + c.id);
  const m = modal({
    title: esc(c.nome), wide: true, body: `<div class="g3 mb"><div><label>Contato</label>${esc(c.contato || '')} ${tel(c.telefone)}<br><span class="small mut">${esc(c.endereco)} · ${esc(c.bairro)} · ${esc(c.cidade)}</span></div>
      <div><label>Condições</label>Tabela <b>${esc(c.tabela || '')}</b> · rota <b>${esc(c.rota || '—')}</b><br>Prazo ${c.prazo_dias || 0} dias · limite ${c.limite ? brl(c.limite) : '—'}</div>
      <div><label>Situação</label><b class="${c.vencido > 0 ? 'red' : ''}">${c.aberto > 0 ? brl(c.aberto) + ' em aberto' : 'Nada em aberto'}</b><br><span class="small mut">${c.pendencias ? `inclui ${brl(c.pendencias)} de pendências · ` : ''}${c.n_pedidos} pedidos · ${brl(c.total_ano)} no ano</span></div></div>
      <div id="pds"></div>
      <table><tr><th>Pedido</th><th>Data</th><th>Itens</th><th>Status</th><th class="n">Total</th><th>Pagamento</th></tr>${ps.slice(0, 15).map(p => `<tr class="click" data-p="${p.id}"><td>#${p.numero}</td><td>${dbr(p.criado_em)}</td><td class="small">${p.itens.map(i => i.qtd + '× ' + esc(i.descricao)).join(', ')}</td><td>${STATUS[p.status]}</td><td class="n">${brl(p.total)}</td><td>${pagPill(p)}</td></tr>`).join('')}</table>`,
    foot: `<button class="btn ghost" id="ed">Editar cadastro</button><button class="btn ghost" id="cod">🔑 Acesso à área do cliente</button><span class="sp"></span>${c.aberto > 0 && pode('financeiro') ? '<button class="btn ghost" id="cob" style="color:var(--red)">Cobrar no WhatsApp</button>' : ''}<button class="btn" id="np">+ Pedido</button>`
  });
  $('#ed', m).onclick = () => { m.close(); editarCliente(c); };
  $('#np', m).onclick = () => { m.close(); location.hash = 'pedidos'; setTimeout(() => novoPedido(c.id), 200); };
  const pend = async () => {
    const ds = await api(`/api/clientes/${c.id}/debitos`).catch(() => []);
    $('#pds', m).innerHTML = `<div class="card mb" style="box-shadow:none;background:var(--tint)"><div class="row"><h3 class="sp">Pendências / saldo devedor</h3>${pode('financeiro') || pode('clientes') ? '<button class="btn sm" id="npd">+ Lançar pendência</button>' : ''}</div>
      ${ds.map(x => `<div class="pend-l"><div class="sp"><b>${esc(x.descricao)}</b><div class="small mut">vence ${dbr(x.vencimento)} · lançado por ${esc(x.criado_por)}${x.pago ? ` · já pago ${brl(x.pago)}` : ''}</div></div><b class="${x.vencimento < S.b.hoje ? 'red' : ''}">${brl(x.aberto)}</b>
        ${pode('financeiro') ? `<button class="btn sm g" data-rd="${x.id}">Receber</button>${!x.pago ? `<button class="btn sm ghost" data-xd="${x.id}" title="Apagar">✕</button>` : ''}` : ''}</div>`).join('') || '<p class="small mut">Nenhuma pendência fora dos pedidos.</p>'}</div>`;
    $('#npd', m) && ($('#npd', m).onclick = () => novaPendencia(c, pend));
    $$('[data-rd]', m).forEach(b => b.onclick = () => { const x = ds.find(d => d.id == b.dataset.rd); receberDebito(x, pend); });
    $$('[data-xd]', m).forEach(b => b.onclick = async () => { if (!confirm('Apagar esta pendência?')) return; try { await api('/api/debitos/' + b.dataset.xd, { method: 'DELETE' }); pend(); } catch (e) { err(e); } });
  };
  pend();
  $('#cob', m) && ($('#cob', m).onclick = async () => { const r = await api(`/api/clientes/${c.id}/whatsapp-cobranca`, { body: {} }); window.open(r.link, '_blank'); });
  $('#cod', m).onclick = async () => { const r = await api(`/api/c/codigo-equipe/${c.id}`, { body: {} }); window.open(r.link, '_blank'); };
  $('.mc', m).onclick = e => { const r = e.target.closest('[data-p]'); if (r) detalhePedido(+r.dataset.p); };
}
function editarCliente(c) {
  const sel = (k, lst, vazio) => `<select id="${k}">${vazio ? `<option value="">${vazio}</option>` : ''}${lst.map(x => `<option value="${x.id}" ${x.id == c[k] ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</select>`;
  const m = modal({
    title: c.id ? 'Editar cliente' : 'Novo cliente', wide: true, body: `<div class="g3"><div style="grid-column:span 2"><label>Nome / razão social</label><input id="nome" value="${esc(c.nome || '')}"></div>
      <div><label>Tipo</label><select id="tipo"><option value="revenda" ${c.tipo === 'revenda' ? 'selected' : ''}>Revendedor</option><option value="consumidor" ${c.tipo !== 'revenda' ? 'selected' : ''}>Consumidor</option></select></div>
      <div><label>CNPJ / CPF</label><input id="documento" value="${esc(c.documento || '')}"></div><div><label>WhatsApp</label><input id="telefone" value="${esc(tel(c.telefone))}"></div><div><label>Contato</label><input id="contato" value="${esc(c.contato || '')}"></div>
      <div style="grid-column:span 2"><label>Endereço</label><input id="endereco" value="${esc(c.endereco || '')}"></div><div><label>Bairro</label><input id="bairro" value="${esc(c.bairro || '')}"></div>
      <div><label>Cidade</label><input id="cidade" value="${esc(c.cidade || '')}"></div><div><label>Rota</label>${sel('rota_id', S.b.rotas, 'Sem rota (retira)')}</div><div><label>Tabela de preço</label>${sel('tabela_id', S.b.tabelas)}</div>
      <div><label>Prazo (dias, 0 = à vista)</label><input id="prazo_dias" value="${c.prazo_dias || 0}"></div><div><label>Limite de crédito (R$)</label><input id="limite" value="${c.limite || ''}"></div>
      <div><label>Localização no mapa</label><div class="row"><input id="lat" placeholder="lat" value="${c.lat ?? ''}"><input id="lng" placeholder="lng" value="${c.lng ?? ''}"></div></div></div>
      <div class="row mt"><button class="btn sm ghost" id="geo">📍 Usar minha localização atual</button><span class="small mut">Útil quando o cadastro é feito na porta do cliente.</span></div>
      <label class="mt">Observações</label><input id="obs" value="${esc(c.obs || '')}">`,
    foot: `${c.id ? `<label style="display:flex;gap:6px;align-items:center;margin:0;color:var(--ink)"><input type="checkbox" id="ativo" style="width:auto" ${c.ativo ? 'checked' : ''}> Ativo</label>` : ''}<span class="sp"></span><button class="btn" id="ok">Salvar</button>`
  });
  $('#geo', m).onclick = () => navigator.geolocation?.getCurrentPosition(p => { $('#lat', m).value = p.coords.latitude.toFixed(5); $('#lng', m).value = p.coords.longitude.toFixed(5); ok('Localização capturada'); }, () => toast('Não consegui pegar a localização', 'err'));
  $('#ok', m).onclick = async () => {
    const d = {}; ['nome', 'tipo', 'documento', 'telefone', 'contato', 'endereco', 'bairro', 'cidade', 'rota_id', 'tabela_id', 'obs'].forEach(k => d[k] = $('#' + k, m).value);
    d.prazo_dias = parseInt($('#prazo_dias', m).value) || 0; d.limite = num($('#limite', m).value); d.lat = $('#lat', m).value ? num($('#lat', m).value) : null; d.lng = $('#lng', m).value ? num($('#lng', m).value) : null;
    if ($('#ativo', m)) d.ativo = $('#ativo', m).checked ? 1 : 0;
    if (!d.nome) return toast('Informe o nome', 'err');
    try { await api('/api/cad/clientes' + (c.id ? '/' + c.id : ''), { method: c.id ? 'PUT' : 'POST', body: d }); m.close(); ok('Cliente salvo'); render(); } catch (e) { err(e); }
  };
}

// ---------------------------------------------------------------- rotas e entregas
async function telaRotas(main) {
  const ps = (await api('/api/pedidos?ativos=1')).filter(p => ['novo', 'separando', 'em_rota'].includes(p.status));
  const fz = `${cfg('lat_fazenda')},${cfg('lng_fazenda')}`;
  const grupos = S.b.rotas.map(r => ({ r, ps: ps.filter(p => p.rota_id == r.id) })).concat([{ r: { id: 0, nome: 'Retirada / sem rota', dia: '', cor: '#888' }, ps: ps.filter(p => !p.rota_id) }]).filter(g => g.ps.length || g.r.id);
  main.innerHTML = `<div class="row wrap mb"><h2 class="sp">Rotas, entregas e mapa</h2><a class="btn ghost" href="/romaneio" target="_blank">🖨 Romaneio de tudo em separação/rota</a></div>
    <div class="g2 gC"><div>${grupos.map(g => { const comLoc = g.ps.filter(p => p.lat && p.lng);
      const maps = comLoc.length ? `https://www.google.com/maps/dir/?api=1&origin=${fz}&destination=${comLoc[comLoc.length - 1].lat},${comLoc[comLoc.length - 1].lng}${comLoc.length > 1 ? '&waypoints=' + comLoc.slice(0, -1).slice(0, 9).map(p => p.lat + ',' + p.lng).join('|') : ''}&travelmode=driving` : '';
      return `<div class="card mb" style="border-left:6px solid ${g.r.cor}"><div class="row wrap"><h3 class="sp">${esc(g.r.nome)} ${g.r.dia ? `<span class="small mut">· ${esc(g.r.dia)}</span>` : ''}</h3>
        ${g.r.id ? `<span class="small mut">frete ${g.r.frete ? brl(g.r.frete) : 'grátis'}${g.r.frete_gratis_acima ? ' · grátis acima de ' + brl(g.r.frete_gratis_acima) : ''}</span>` : ''}</div>
        ${g.ps.length ? `<table class="mt">${g.ps.map(p => `<tr class="click" data-p="${p.id}"><td><input type="checkbox" data-sel="${p.id}" style="width:auto" onclick="event.stopPropagation()"></td><td><b>#${p.numero}</b> ${esc(p.cliente || '')}<div class="small mut">${esc(p.cidade || '')} · ${p.itens.reduce((a, i) => a + i.qtd, 0)} un</div><div class="om row" style="gap:4px;margin-top:4px"><span class="pill ${p.status === 'em_rota' ? 'p-ok' : 'p-warn'}">${STATUS[p.status]}</span>${pagPill(p)}</div></td><td class="hm"><span class="pill ${p.status === 'em_rota' ? 'p-ok' : 'p-warn'}">${STATUS[p.status]}</span></td><td class="n hm">${pagPill(p)}</td></tr>`).join('')}</table>
        <div class="row wrap mt">${maps ? `<a class="btn sm k" target="_blank" href="${maps}">🗺 Abrir rota no Maps (${comLoc.length} paradas)</a>` : ''}<a class="btn sm ghost" target="_blank" href="/romaneio?ids=${g.ps.map(p => p.id).join(',')}">🖨 Romaneio</a><button class="btn sm ghost" data-desp="${g.ps.filter(p => p.status !== 'em_rota').map(p => p.id).join(',')}">🚚 Despachar todos</button></div>` : '<p class="small mut mt">Sem entregas pendentes</p>'}</div>`; }).join('')}
      <div class="card"><div class="row mb"><h3 class="sp">Rotas e fretes</h3>${pode('config') || pode('rotas') ? '<button class="btn sm ghost" id="nr">+ Rota</button>' : ''}</div><table><tr><th>Rota</th><th>Dia</th><th class="n">Frete</th><th class="n">Grátis acima</th><th>Tabela</th><th></th></tr>
        ${S.b.rotas.map(r => `<tr><td><i class="mk" style="display:inline-block;background:${r.cor};width:12px;height:12px"></i> <b>${esc(r.nome)}</b></td><td>${esc(r.dia)}</td><td class="n">${brl(r.frete)}</td><td class="n">${r.frete_gratis_acima ? brl(r.frete_gratis_acima) : '—'}</td><td class="small">${esc(S.b.tabelas.find(t => t.id == r.tabela_id)?.nome || '')}</td><td><button class="btn sm ghost" data-er="${r.id}">✎</button></td></tr>`).join('')}</table></div></div>
    <div class="card" style="position:sticky;top:70px"><div class="row mb"><h3 class="sp">Mapa ao vivo</h3><span class="small mut" id="vivo"></span></div><div id="mapa"></div></div></div>`;
  main.onclick = e => {
    const d = e.target.closest('[data-desp]'); if (d) { const ids = d.dataset.desp.split(',').filter(Boolean).map(Number); if (!ids.length) return toast('Já estão em rota'); return despachar(ids); }
    const er = e.target.closest('[data-er]'); if (er) return editarRota(S.b.rotas.find(r => r.id == er.dataset.er));
    if (e.target.closest('#nr')) return editarRota({ cor: '#D7261E', tabela_id: 1 });
    const p = e.target.closest('[data-p]'); if (p) detalhePedido(+p.dataset.p);
  };
  const vivo = await api('/api/mapa');
  const cores = Object.fromEntries(S.b.rotas.map(r => [r.id, r.cor]));
  const mp = await desenharMapa($('#mapa'), ps.map(p => ({ lat: p.lat, lng: p.lng, cor: cores[p.rota_id] || '#888', popup: `<b>#${p.numero} ${esc(p.cliente || '')}</b><br>${STATUS[p.status]} · ${brl(p.total)}` })), (mp, bs) => {
    L.marker(vivo.fazenda, { icon: L.divIcon({ className: '', html: '<div style="font-size:26px">🏭</div>', iconSize: [28, 28], iconAnchor: [14, 14] }) }).addTo(mp).bindPopup('<b>Fazenda Sossego</b>'); bs.push(vivo.fazenda);
    vivo.entregadores.forEach(e => { L.marker([e.lat, e.lng], { icon: L.divIcon({ className: '', html: '<div style="font-size:26px">🚚</div>', iconSize: [28, 28], iconAnchor: [14, 14] }) }).addTo(mp).bindPopup(`<b>${esc(e.nome)}</b><br>posição às ${hm(e.em)}<br>${e.pedidos.filter(x => x.status === 'entregue').length}/${e.pedidos.length} entregues`); bs.push([e.lat, e.lng]); });
  });
  $('#vivo').textContent = vivo.entregadores.length ? `${vivo.entregadores.map(e => '🚚 ' + e.nome + ' · ' + hm(e.em)).join(' · ')}` : 'nenhum entregador transmitindo';
}
function editarRota(r) {
  const m = modal({ title: r.id ? 'Editar rota' : 'Nova rota', body: `<div class="g2"><div><label>Nome</label><input id="nome" value="${esc(r.nome || '')}"></div><div><label>Dia(s) de entrega</label><input id="dia" value="${esc(r.dia || '')}" placeholder="ex.: Sexta"></div>
    <div><label>Frete (R$)</label><input id="frete" value="${r.frete ?? ''}"></div><div><label>Frete grátis acima de (R$)</label><input id="fg" value="${r.frete_gratis_acima || ''}"></div>
    <div><label>Tabela de preço padrão</label><select id="tb">${S.b.tabelas.map(t => `<option value="${t.id}" ${t.id == r.tabela_id ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select></div><div><label>Cor no mapa</label><input type="color" id="cor" value="${r.cor || '#D7261E'}" style="height:40px"></div></div>`, foot: '<button class="btn" id="ok">Salvar</button>' });
  $('#ok', m).onclick = async () => { try { await api('/api/cad/rotas' + (r.id ? '/' + r.id : ''), { method: r.id ? 'PUT' : 'POST', body: { nome: $('#nome', m).value, dia: $('#dia', m).value, frete: num($('#frete', m).value), frete_gratis_acima: num($('#fg', m).value), tabela_id: $('#tb', m).value, cor: $('#cor', m).value } }); m.close(); await carregar(); render(); } catch (e) { err(e); } };
}
async function telaEntregas(main) {
  const load = async () => {
    const ps = (await api('/api/pedidos?ativos=1')).filter(p => p.status === 'em_rota' && (p.entregador_id === S.me.id || pode('rotas')));
    main.innerHTML = `<div class="row mb"><h2 class="sp">🚚 Minhas entregas</h2><span class="small" id="gps">📡 GPS…</span></div>
      ${ps.length > 1 ? `<a class="btn k full mb" target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${ps[ps.length - 1].lat},${ps[ps.length - 1].lng}&waypoints=${ps.slice(0, -1).map(p => p.lat + ',' + p.lng).join('|')}">🗺 Abrir rota completa no Maps (${ps.length} paradas)</a>` : ''}
      ${ps.map((p, i) => `<div class="card mb"><div class="row"><b style="font-size:16px">${i + 1}. ${esc(p.cliente || '')}</b><span class="sp"></span>${p.aberto > 0.009 ? (p.condicao === 'vista' ? `<span class="pill p-bad">cobrar ${brl(p.aberto)}</span>` : '<span class="pill p-warn">a prazo</span>') : '<span class="pill p-ok">pago</span>'}</div>
        <div class="small mut mt">${esc(p.endereco)} · ${esc(p.bairro)} · ${esc(p.cidade)}</div><ul class="small mt" style="margin-left:16px">${itensTxt(p)}</ul>${p.obs ? `<p class="small"><b>Obs:</b> ${esc(p.obs)}</p>` : ''}
        <div class="row mt"><a class="btn sm ghost" href="tel:${p.telefone}">📞</a><a class="btn sm ghost" target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}">📍 Mapa</a><span class="sp"></span><button class="btn g" data-e="${p.id}">✓ Entregue</button></div></div>`).join('') || '<div class="empty">Nenhuma entrega em rota agora 👍</div>'}
      <p class="small mut center">Deixe esta tela aberta durante a rota: sua posição aparece no mapa do escritório.</p>`;
    main.onclick = e => { const b = e.target.closest('[data-e]'); if (b) entregar(ps.find(p => p.id == b.dataset.e), load); };
    gps();
  };
  const gps = () => {
    if (!navigator.geolocation) return $('#gps').textContent = 'GPS indisponível';
    let ult = 0;
    S.geoWatch = navigator.geolocation.watchPosition(async pos => {
      $('#gps') && ($('#gps').textContent = '📡 transmitindo posição');
      if (Date.now() - ult < 30000) return; ult = Date.now();
      try { await api('/api/posicao', { body: { lat: pos.coords.latitude, lng: pos.coords.longitude } }); } catch (e) { }
    }, () => { $('#gps') && ($('#gps').textContent = '⚠ ative a localização'); }, { enableHighAccuracy: true, maximumAge: 20000 });
  };
  load();
}

// ---------------------------------------------------------------- feira (funciona sem internet)
const FILA = 'caju_feira_fila';
const filaGet = () => { try { return JSON.parse(localStorage.getItem(FILA) || '[]'); } catch (e) { return []; } };
const filaSet = l => { try { localStorage.setItem(FILA, JSON.stringify(l)); } catch (e) { } };
async function feiraSync() {
  const l = filaGet(); if (!l.length) return 0;
  const resto = [];
  for (const v of l) { try { await api('/api/feira/venda', { body: v }); } catch (e) { if (/conexão/i.test(e.message)) resto.push(v); else toast('Venda offline recusada: ' + e.message, 'err'); } }
  filaSet(resto); if (l.length > resto.length) ok(`${l.length - resto.length} venda(s) da feira sincronizada(s)`);
  return resto.length;
}
function telaFeira(main) {
  const tab = cfg('tabela_feira') || 5;
  const cart = {}; let forma = 'pix', evento = localStorage.getItem('caju_evento') || 'Feira';
  const precoF = p => p.precos[tab] ?? p.precos[1] ?? 0;
  const total = () => r2(Object.entries(cart).reduce((a, [id, q]) => a + q * precoF(prod(id)), 0));
  main.innerHTML = `<div class="row wrap mb"><h2 class="sp">🎪 Caixa de feira</h2><input id="ev" value="${esc(evento)}" style="width:240px" placeholder="Nome do evento"></div><div id="offb"></div>
    <div class="feira"><div class="fprod">${S.b.produtos.filter(p => p.ativo).map(p => `<button class="fp" data-p="${p.id}"><img src="${esc(p.foto)}" alt=""><div><b>${esc(p.nome)}</b><span>${brl(precoF(p))}</span></div></button>`).join('')}</div>
    <div class="resumo" id="fr"></div></div><div class="card mt" id="hoje"></div>`;
  $('#ev').onchange = e => { evento = e.target.value; localStorage.setItem('caju_evento', evento); };
  const drawOff = () => { const n = filaGet().length; $('#offb').innerHTML = !navigator.onLine || n ? `<div class="off">${!navigator.onLine ? '📵 Sem internet — as vendas ficam guardadas no aparelho' : ''}${n ? ` · ${n} venda(s) aguardando envio` : ''}</div>` : ''; };
  const draw = () => {
    const ls = Object.entries(cart).filter(([, q]) => q > 0);
    $('#fr').innerHTML = `<h3 class="mb">Venda atual</h3>${ls.map(([id, q]) => `<div class="l"><span><button class="btn sm ghost" data-m="${id}">−</button> <b>${q}</b> ${esc(prod(id).nome)}</span><span>${brl(q * precoF(prod(id)))}</span></div>`).join('') || '<p class="mut">Toque nos produtos</p>'}
      <div class="l big mt"><span>Total</span><span>${brl(total())}</span></div><div class="chips mt" id="fm">${['pix', 'dinheiro', 'credito', 'debito'].map(f => `<button data-f="${f}" class="${f === forma ? 'on' : ''}">${FORMAS[f]}</button>`).join('')}</div>
      ${forma === 'dinheiro' ? '<label class="mt">Recebido</label><input id="rc" inputmode="decimal"><div class="b mt" id="tc"></div>' : ''}
      <button class="btn lg full mt" id="ok" ${ls.length ? '' : 'disabled'}>Finalizar venda</button>`;
    $('#rc') && ($('#rc').oninput = e => { const t = num(e.target.value) - total(); $('#tc').textContent = t > 0 ? 'Troco: ' + brl(t) : ''; });
  };
  const hoje = async () => { try { const ps = await api(`/api/pedidos?de=${S.b.hoje}&ate=${S.b.hoje}`); const f = ps.filter(p => p.canal === 'feira' && p.status !== 'cancelado'); $('#hoje').innerHTML = `<h3 class="mb">Hoje na feira</h3><div class="kpis"><div class="kpi"><small>Vendas</small><b>${brl(f.reduce((a, p) => a + p.total, 0))}</b></div><div class="kpi k"><small>Atendimentos</small><b>${f.length}</b></div><div class="kpi g"><small>Unidades</small><b>${f.reduce((a, p) => a + p.itens.reduce((b, i) => b + i.qtd, 0), 0)}</b></div></div>`; } catch (e) { $('#hoje').innerHTML = '<p class="mut">Resumo do dia aparece quando a internet voltar.</p>'; } };
  main.onclick = async e => {
    const p = e.target.closest('[data-p]'), mm = e.target.closest('[data-m]'), f = e.target.closest('[data-f]');
    if (p) { cart[p.dataset.p] = (cart[p.dataset.p] || 0) + 1; draw(); }
    if (mm) { cart[mm.dataset.m] = Math.max(0, (cart[mm.dataset.m] || 0) - 1); draw(); }
    if (f) { forma = f.dataset.f; draw(); }
    if (e.target.id === 'ok') {
      const venda = { id_local: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), evento, forma, criado_em: null, itens: Object.entries(cart).filter(([, q]) => q > 0).map(([produto_id, qtd]) => ({ produto_id, qtd })) };
      try { await api('/api/feira/venda', { body: venda }); ok('Venda registrada ' + brl(total())); }
      catch (er) { if (/conexão/i.test(er.message)) { const d = new Date(); venda.criado_em = new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 19).replace('T', ' '); filaSet(filaGet().concat([venda])); toast('Sem internet: venda guardada no aparelho'); } else return err(er); }
      Object.keys(cart).forEach(k => delete cart[k]); draw(); drawOff(); hoje();
    }
  };
  draw(); drawOff(); hoje(); feiraSync().then(drawOff);
  S.poll = setInterval(() => { feiraSync().then(drawOff); }, 20000);
}

// ---------------------------------------------------------------- financeiro
function telaFinanceiro(main) {
  let aba = telaFinanceiro.aba || 'receber';
  main.innerHTML = `<div class="row wrap mb"><h2 class="sp">Financeiro</h2><div class="chips" id="per"></div><a class="btn ghost sm" id="pdf" target="_blank">📄 Relatório PDF</a></div>
    <div class="tabs" id="tb">${[['receber', 'Contas a receber'], ['pagar', 'Contas a pagar'], ['resultado', 'Resultado']].map(([k, n]) => `<button data-a="${k}" class="${k === aba ? 'on' : ''}">${n}</button>`).join('')}</div><div id="fn"></div>`;
  let D = null;
  const draw = () => {
    const el = $('#fn');
    if (aba === 'receber') {
      const venc = D.receber.filter(r => r.dias > 0), av = D.receber.filter(r => r.dias <= 0);
      const linha = r => r.tipo === 'pendencia' ? `<tr><td><b>${esc(r.cliente)}</b><div class="small mut"><span class="pill p-warn">pendência</span> ${esc(r.descricao)}</div></td><td class="${r.dias > 0 ? 'red b' : ''}">${dbr(r.vencimento)}${r.dias > 0 ? `<div class="small">há ${r.dias} dias</div>` : ''}</td><td class="n b">${brl(r.aberto)}</td>
        <td class="n"><button class="btn sm g" data-rdeb="${r.debito_id}" data-v="${r.aberto}" data-d="${esc(r.descricao)}">Receber</button></td></tr>` : `<tr class="click" data-p="${r.id}"><td><b>${esc(r.cliente || 'Sem cliente')}</b><div class="small mut">pedido #${r.numero} · ${dbr(r.criado_em)}</div></td><td class="${r.dias > 0 ? 'red b' : ''}">${dbr(r.vencimento)}${r.dias > 0 ? `<div class="small">há ${r.dias} dias</div>` : r.dias === 0 ? '<div class="small">hoje</div>' : `<div class="small mut">em ${-r.dias} dias</div>`}</td><td class="n b">${brl(r.aberto)}</td>
        <td class="n">${r.telefone ? `<button class="btn sm ghost" data-cob="${r.id}" style="color:var(--red)">Cobrar</button> ` : ''}<button class="btn sm g" data-rec="${r.id}">Receber</button></td></tr>`;
      el.innerHTML = `<div class="kpis"><div class="kpi r"><small>Vencido</small><b class="red">${brl(venc.reduce((a, r) => a + r.aberto, 0))}</b><em>${venc.length} título(s)</em></div><div class="kpi"><small>A vencer</small><b>${brl(av.reduce((a, r) => a + r.aberto, 0))}</b><em>${av.length} título(s)</em></div><div class="kpi g"><small>Recebido no período</small><b>${brl(D.recebido)}</b></div></div>
        <div class="card"><table class="resp"><tr><th>Cliente</th><th>Vencimento</th><th class="n">Valor</th><th></th></tr>${venc.concat(av).map(linha).join('')}</table>${D.receber.length ? '' : '<div class="empty">Nada a receber 🎉</div>'}</div>`;
    } else if (aba === 'pagar') {
      el.innerHTML = `<div class="row mb"><span class="sp"></span><button class="btn" id="nc">+ Conta a pagar</button></div><div class="card"><table class="resp"><tr><th>Descrição</th><th>Vencimento</th><th class="n">Valor</th><th></th></tr>
        ${D.pagar.map(c => `<tr><td><b>${esc(c.descricao)}</b><div class="small mut">${esc(c.categoria)}</div></td><td class="${!c.pago_em && c.vencimento < S.b.hoje ? 'red b' : ''}">${dbr(c.vencimento)}</td><td class="n b">${brl(c.valor)}</td>
        <td class="n">${c.pago_em ? `<span class="pill p-ok">pago ${dm(c.pago_em)}</span> <button class="btn sm ghost" data-desf="${c.id}">↺</button>` : `<button class="btn sm g" data-pg="${c.id}">Pagar</button>`}</td></tr>`).join('')}</table></div>`;
    } else {
      el.innerHTML = `<div class="kpis"><div class="kpi"><small>Vendas</small><b>${brl(D.vendas)}</b></div><div class="kpi k"><small>Custo dos produtos vendidos</small><b>${brl(D.cmv)}</b></div><div class="kpi r"><small>Despesas</small><b>${brl(D.total_despesas)}</b></div>
        <div class="kpi g"><small>Lucro estimado</small><b class="${D.lucro >= 0 ? 'grn' : 'red'}">${brl(D.lucro)}</b><em>margem ${D.vendas ? Math.round(D.lucro / D.vendas * 100) : 0}%</em></div></div>
        <div class="g2"><div class="card"><h3 class="mb">Resultado do período</h3><table><tr><td>(+) Vendas</td><td class="n">${brl(D.vendas)}</td></tr><tr><td>(−) Custo dos produtos (lotes)</td><td class="n red">${brl(D.cmv)}</td></tr>${D.perdas ? `<tr><td>(−) Perdas e quebras</td><td class="n red">${brl(D.perdas)}</td></tr>` : ''}
          ${D.despesas.map(x => `<tr><td>(−) ${esc(x.categoria)}</td><td class="n red">${brl(x.total)}</td></tr>`).join('')}<tr><td><b>(=) Lucro</b></td><td class="n b ${D.lucro >= 0 ? 'grn' : 'red'}">${brl(D.lucro)}</td></tr></table></div>
        <div class="card"><h3 class="mb">Recebido por forma</h3>${hbars(D.formas, x => FORMAS[x.forma] || x.forma, x => x.total)}</div></div>`;
    }
  };
  const load = async (de, ate) => { if (de) { load.de = de; load.ate = ate; } $('#pdf').href = `/relatorio?de=${load.de}&ate=${load.ate}`; D = await api(`/api/financeiro?de=${load.de}&ate=${load.ate}`); draw(); };
  $('#tb').onclick = e => { const b = e.target.closest('[data-a]'); if (!b) return; aba = telaFinanceiro.aba = b.dataset.a; $$('#tb button').forEach(x => x.classList.toggle('on', x === b)); draw(); };
  main.addEventListener('click', async e => {
    const rec = e.target.closest('[data-rec]'), cob = e.target.closest('[data-cob]'), pg = e.target.closest('[data-pg]'), df = e.target.closest('[data-desf]'), p = e.target.closest('[data-p]');
    if (rec) { e.stopPropagation(); return receberModal(await api('/api/pedidos/' + rec.dataset.rec), () => load()); }
    const rd = e.target.closest('[data-rdeb]'); if (rd) return receberDebito({ id: +rd.dataset.rdeb, aberto: +rd.dataset.v, descricao: rd.dataset.d }, () => load());
    if (cob) { e.stopPropagation(); const r = await api(`/api/pedidos/${cob.dataset.cob}/whatsapp?tipo=cobranca`); return window.open(r.link, '_blank'); }
    if (pg || df) { await api(`/api/contas/${(pg || df).dataset.pg || df.dataset.desf}/pagar`, { body: { desfazer: !!df } }); return load(); }
    if (e.target.id === 'nc') { const m = modal({ title: 'Nova conta a pagar', body: `<label>Descrição</label><input id="d"><div class="g3 mt"><div><label>Categoria</label><input id="c" list="cats" value="Outros"><datalist id="cats">${['Funcionários', 'Energia', 'Logística', 'Administrativo', 'Manutenção', 'Matéria-prima', 'Embalagens', 'Eventos', 'Impostos', 'Outros'].map(x => `<option value="${x}">`).join('')}</datalist></div><div><label>Valor</label><input id="v"></div><div><label>Vencimento</label><input type="date" id="ve" value="${S.b.hoje}"></div></div>`, foot: '<button class="btn" id="ok">Salvar</button>' });
      $('#ok', m).onclick = async () => { try { await api('/api/cad/contas_pagar', { body: { descricao: $('#d', m).value, categoria: $('#c', m).value, valor: num($('#v', m).value), vencimento: $('#ve', m).value } }); m.close(); load(); } catch (er) { err(er); } }; return; }
    if (p) detalhePedido(+p.dataset.p);
  });
  periodoChips('#per', load);
}

// ---------------------------------------------------------------- equipe
async function telaEquipe(main) {
  await carregar();
  main.innerHTML = `<div class="row mb"><h2 class="sp">Equipe e permissões</h2><button class="btn" id="nu">+ Pessoa</button></div>
    <div class="card mb"><table class="resp"><tr><th>Pessoa</th><th>Função</th><th>Pode</th><th class="n">Desconto máx.</th><th></th></tr>
    ${S.b.usuarios.map(u => { const ps = JSON.parse(u.permissoes || '[]'); return `<tr><td><b>${esc(u.nome)}</b>${!u.ativo ? ' <span class="pill p-off">inativo</span>' : ''}<div class="small mut">usuário <b>${esc(u.login || '—')}</b>${u.email ? ' · ' + esc(u.email) : ''}</div></td><td>${esc(u.papel)}</td><td class="small">${ps.length === Object.keys(S.b.permissoes).length ? '<b>tudo</b>' : ps.map(p => esc(S.b.permissoes[p])).join(' · ')}</td><td class="n">${u.desconto_max ? u.desconto_max + '%' : '—'}</td><td class="n"><button class="btn sm ghost" data-u="${u.id}">Editar</button></td></tr>`; }).join('')}</table></div>
    <div class="card"><h3 class="mb">Histórico de ações</h3><div id="log" class="small"></div></div>`;
  const log = await api('/api/log');
  $('#log').innerHTML = `<table>${log.slice(0, 80).map(l => `<tr><td>${dbr(l.criado_em)} ${hm(l.criado_em)}</td><td><b>${esc(l.usuario)}</b></td><td>${esc(l.acao)}</td><td class="mut">${esc(l.detalhe)}</td></tr>`).join('')}</table>`;
  main.onclick = e => { const b = e.target.closest('[data-u]'); if (b) editarUsuario(S.b.usuarios.find(u => u.id == b.dataset.u)); if (e.target.id === 'nu') editarUsuario({ papel: 'vendas', permissoes: JSON.stringify(S.b.papeis.vendas), ativo: 1 }); };
}
function editarUsuario(u) {
  const ps = new Set(JSON.parse(u.permissoes || '[]'));
  const m = modal({ title: u.id ? 'Editar pessoa' : 'Nova pessoa', wide: true, body: `<div class="g3"><div><label>Nome</label><input id="n" value="${esc(u.nome || '')}"></div>
    <div><label>Função (preenche as permissões)</label><select id="pp">${Object.keys(S.b.papeis).map(p => `<option ${p === u.papel ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
    <div><label>WhatsApp</label><input id="tl" inputmode="tel" value="${esc(u.telefone || '')}" placeholder="(86) 9…"></div></div>
    <h3 class="mt mb" style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:var(--mut)">Acesso ao sistema</h3>
    <div class="g3"><div><label>Usuário (login)</label><input id="lg" autocapitalize="none" value="${esc(u.login || '')}" placeholder="ex.: ana"></div>
    <div><label>E-mail</label><input id="em" type="email" value="${esc(u.email || '')}" placeholder="para recuperar a senha"></div>
    <div><label>CPF (opcional)</label><input id="cpf" inputmode="numeric" value="${esc(u.cpf || '')}"></div></div>
    <div class="g2 mt"><div><label>${u.id ? 'Nova senha (deixe vazio para manter)' : 'Senha inicial (mínimo 6)'}</label><input id="sh" type="text" autocomplete="off" placeholder="${u.id ? '••••••' : ''}"></div>
    <div>${u.id ? `<label>Primeiro acesso / esqueceu</label><button class="btn ghost full" id="gc">🔑 Gerar código de acesso</button>` : ''}</div></div>
    <label class="mt">O que esta pessoa pode fazer</label><div class="perm" id="perm">${Object.entries(S.b.permissoes).map(([k, n]) => `<label><input type="checkbox" value="${k}" ${ps.has(k) ? 'checked' : ''}> ${esc(n)}</label>`).join('')}</div>
    <div class="g2 mt"><div><label>Desconto máximo sem autorização (%)</label><input id="dm" value="${u.desconto_max || 0}"></div><div><label>Comissão (%)</label><input id="cm" value="${u.comissao || 0}"></div></div>`,
    foot: `${u.id ? `<label style="display:flex;gap:6px;align-items:center;margin:0;color:var(--ink);text-transform:none;letter-spacing:0;font-size:14px"><input type="checkbox" id="at" style="width:auto" ${u.ativo ? 'checked' : ''}> Ativo</label>` : ''}<span class="sp"></span><button class="btn" id="ok">Salvar</button>` });
  $('#pp', m).onchange = e => { const l = S.b.papeis[e.target.value]; $$('#perm input', m).forEach(i => i.checked = l.includes(i.value)); };
  $('#gc', m) && ($('#gc', m).onclick = async () => {
    try { const r = await api(`/api/equipe/${u.id}/codigo`, { body: {} });
      modal({ title: 'Código de acesso', body: `<p>Passe para <b>${esc(u.nome)}</b>:</p><p class="mt">Usuário: <b>${esc(r.login)}</b></p><p style="font-size:34px;font-weight:900;letter-spacing:8px;margin:8px 0">${r.codigo}</p><p class="small mut">Vale 20 minutos. Na tela de entrada: <b>Esqueci minha senha</b> → digita o usuário → usa este código e cria a senha.</p>`,
        foot: r.whatsapp ? `<a class="btn g" href="${r.whatsapp}" target="_blank">Enviar pelo WhatsApp</a>` : '' });
    } catch (e) { err(e); } });
  $('#ok', m).onclick = async () => {
    const body = { nome: $('#n', m).value, login: $('#lg', m).value.trim(), email: $('#em', m).value.trim(), cpf: $('#cpf', m).value, papel: $('#pp', m).value,
      permissoes: $$('#perm input:checked', m).map(i => i.value), desconto_max: num($('#dm', m).value), comissao: num($('#cm', m).value), telefone: $('#tl', m).value, ativo: $('#at', m) ? ($('#at', m).checked ? 1 : 0) : 1 };
    if ($('#sh', m).value) body.senha = $('#sh', m).value;
    try { await api('/api/cad/usuarios' + (u.id ? '/' + u.id : ''), { method: u.id ? 'PUT' : 'POST', body });
      m.close(); ok('Salvo. Permissões valem a partir do próximo login da pessoa.'); render(); } catch (e) { err(e); }
  };
}

// ---------------------------------------------------------------- configurações
async function telaConfig(main) {
  await carregar();
  let aba = telaConfig.aba || 'precos';
  const c = S.b.config;
  main.innerHTML = `<h2 class="mb">Configurações</h2><div class="tabs" id="tb">${[['precos', 'Produtos e tabelas de preço'], ['empresa', 'Empresa e Pix'], ['online', 'Área do cliente'], ['sistema', 'Sistema']].map(([k, n]) => `<button data-a="${k}" class="${k === aba ? 'on' : ''}">${n}</button>`).join('')}</div><div id="cf"></div>`;
  $('#tb').onclick = e => { const b = e.target.closest('[data-a]'); if (b) { telaConfig.aba = b.dataset.a; render(); } };
  const el = $('#cf');
  const salvarCfg = async () => { const d = {}; $$('[data-c]', el).forEach(i => d[i.dataset.c] = i.value); try { await api('/api/config', { method: 'PUT', body: d }); await carregar(); ok('Salvo'); } catch (e) { err(e); } };
  if (aba === 'precos') {
    el.innerHTML = `<div class="card mb"><div class="row mb"><h3 class="sp">Preços por tabela</h3><button class="btn sm ghost" id="nt">+ Tabela</button><button class="btn sm ghost" id="np">+ Produto</button></div><div style="overflow:auto"><table><tr><th>Produto</th>${S.b.tabelas.map(t => `<th class="n">${esc(t.nome)}</th>`).join('')}<th></th></tr>
      ${S.b.produtos.map(p => { const cx = p.un_caixa || 1; return `<tr data-p="${p.id}"><td><b>${esc(p.nome)}</b><div class="small mut">${cx > 1 ? `preço da <b>caixa com ${cx}</b>` : 'preço da unidade'}</div>${!p.ativo ? ' <span class="pill p-off">inativo</span>' : ''}</td>${S.b.tabelas.map(t => { const u = p.precos[t.id]; return `<td class="n"><input data-t="${t.id}" data-cx="${cx}" inputmode="decimal" value="${u === undefined || u === null ? '' : (Math.round(u * cx * 100) / 100).toFixed(2).replace('.', ',')}" style="width:96px;text-align:right;padding:5px 7px"><div class="small mut" data-u>${u === undefined || u === null ? '—' : cx > 1 ? brl(u) + '/un' : ''}</div></td>`; }).join('')}<td class="n"><button class="btn sm ghost" data-ep="${p.id}">Detalhes</button></td></tr>`; }).join('')}</table></div>
      <p class="small mut mt">Digite o valor e ele <b>salva sozinho</b> ao sair do campo. Produtos vendidos em caixa: coloque o preço da caixa, o da unidade é calculado.</p>
      <p class="small mut mt">Cada cliente tem uma tabela. O pedido puxa o preço dela sozinho. Cada rota também sugere uma tabela pros clientes novos.</p></div>`;
    el.onclick = async e => {
      const sp = e.target.closest('[data-sp]'), ep = e.target.closest('[data-ep]');

      void sp;
      if (ep || e.target.id === 'np') editarProduto(ep ? prod(ep.dataset.ep) : { ativo: 1, online: 1, un_caixa: 12, validade_dias: 365, unidade: 'un', ficha: [] });
      if (e.target.id === 'nt') { const n = prompt('Nome da nova tabela (ex.: Supermercados):'); if (n) { await api('/api/cad/tabelas', { body: { nome: n } }); await carregar(); render(); } }
    };
    el.onchange = async e => {
      const i = e.target.closest('[data-t]'); if (!i) return;
      const pid = i.closest('tr').dataset.p, cx = +i.dataset.cx || 1, v = i.value.trim();
      const unit = v === '' ? '' : Math.round(num(v) / cx * 10000) / 10000;
      try {
        await api('/api/cad/produtos/' + pid, { method: 'PUT', body: { precos: { [i.dataset.t]: unit } } });
        prod(pid).precos[i.dataset.t] = unit === '' ? undefined : unit;
        i.nextElementSibling.textContent = unit === '' ? '—' : cx > 1 ? brl(unit) + '/un' : '';
        i.classList.add('salvo'); setTimeout(() => i.classList.remove('salvo'), 1200); ok('Preço salvo');
        carregar();
      } catch (er) { err(er); }
    };
  } else if (aba === 'empresa') {
    const f = (k, l, ph = '') => `<div><label>${l}</label><input data-c="${k}" value="${esc(c[k] || '')}" placeholder="${esc(ph)}"></div>`;
    el.innerHTML = `<div class="card"><div class="g2">${f('empresa', 'Nome')}${f('slogan', 'Slogan')}${f('endereco', 'Endereço')}${f('telefones', 'Telefones')}${f('whatsapp', 'WhatsApp principal (só números)')}${f('instagram', 'Instagram')}${f('cnpj', 'CNPJ')}${f('selo', 'Selo / certificação')}
      ${f('pix_chave', 'Chave Pix', 'CNPJ, e-mail, telefone ou aleatória')}${f('pix_nome', 'Nome do recebedor Pix')}${f('pix_cidade', 'Cidade do recebedor Pix')}${f('custo_caju_kg', 'Custo do caju (R$/kg) para custo do lote')}
      ${f('lat_fazenda', 'Latitude da fazenda')}${f('lng_fazenda', 'Longitude da fazenda')}
      <div><label>Foto do espelho assinado na entrega</label><select data-c="exigir_comprovante"><option value="1" ${c.exigir_comprovante === '1' ? 'selected' : ''}>Obrigatória (ou motivo)</option><option value="0" ${c.exigir_comprovante !== '1' ? 'selected' : ''}>Opcional</option></select></div></div><button class="btn mt" id="sv">Salvar</button>
      <p class="small mut mt">Com a chave Pix preenchida, o espelho de pedido e a área do cliente mostram o QR Code com o valor certo.</p></div>`;
    $('#sv').onclick = salvarCfg;
  } else if (aba === 'online') {
    el.innerHTML = `<div class="card"><div class="g2"><div><label>Pedidos pela área do cliente</label><select data-c="online_ativo"><option value="1" ${c.online_ativo === '1' ? 'selected' : ''}>Ativos</option><option value="0" ${c.online_ativo !== '1' ? 'selected' : ''}>Pausados</option></select></div>
      <div><label>Pedido mínimo (R$)</label><input data-c="online_minimo" value="${esc(c.online_minimo || '0')}"></div><div style="grid-column:1/-1"><label>Aviso no topo da área do cliente</label><input data-c="online_msg" value="${esc(c.online_msg || '')}"></div>
      <div style="grid-column:1/-1"><label>Mensagem de cobrança (WhatsApp) · {cliente} {numero} {valor} {vencimento} {link}</label><textarea data-c="msg_cobranca" rows="3">${esc(c.msg_cobranca || '')}</textarea></div>
      <div style="grid-column:1/-1"><label>Mensagem de status do pedido · {cliente} {numero} {status} {link}</label><textarea data-c="msg_pedido" rows="2">${esc(c.msg_pedido || '')}</textarea></div>
      <div style="grid-column:1/-1"><label>Endereço público do sistema (para os links)</label><input data-c="url_publica" value="${esc(c.url_publica || '')}" placeholder="https://cajuina.seudominio.com.br"></div></div>
      <button class="btn mt" id="sv">Salvar</button><p class="small mut mt">Link da área do cliente: <b>${esc((c.url_publica || location.origin).replace(/\/$/, ''))}/cliente</b> · o cliente entra com o WhatsApp cadastrado e um código.</p></div>`;
    $('#sv').onclick = salvarCfg;
  } else {
    el.innerHTML = `<div class="g2"><div class="card"><h3 class="mb">Backup</h3><p class="small mut mb">Backup automático a cada 12 horas. Baixe uma cópia de vez em quando e guarde no Drive.</p><a class="btn ghost" href="/api/backup">⬇ Baixar backup agora</a></div>
      <div class="card"><h3 class="mb">Dados de demonstração</h3>${c.demo === '1' ? `<p class="small mb">O sistema está com <b>clientes, pedidos e lotes fictícios</b> para apresentação. Antes de usar de verdade, apague tudo (produtos, preços, rotas e equipe são mantidos).</p><button class="btn" id="lz">Apagar dados de demonstração</button>` : '<p class="small mut">Sistema em uso real.</p>'}</div></div>`;
    $('#lz') && ($('#lz').onclick = async () => { const t = prompt('Isso apaga clientes, pedidos, lotes e financeiro de demonstração. Digite APAGAR para confirmar:'); if (t !== 'APAGAR') return; try { await api('/api/demo/limpar', { body: { confirmar: 'APAGAR' } }); ok('Pronto! Sistema limpo para uso real.'); await carregar(); render(); } catch (e) { err(e); } });
  }
}
function editarProduto(p) {
  const ins = S.b.insumos || [];
  let ficha = (p.ficha || []).map(f => ({ ...f }));
  const m = modal({ title: p.id ? esc(p.nome) : 'Novo produto', wide: true, body: `<div class="g3"><div style="grid-column:span 2"><label>Nome</label><input id="nome" value="${esc(p.nome || '')}"></div><div><label>Unidade</label><input id="unidade" value="${esc(p.unidade || 'un')}"></div>
    <div style="grid-column:1/-1"><label>Descrição</label><input id="descricao" value="${esc(p.descricao || '')}"></div>
    <div><label>Unidades por caixa</label><input id="un_caixa" value="${p.un_caixa || 1}"></div><div><label>Validade (dias)</label><input id="validade_dias" value="${p.validade_dias || 365}"></div><div><label>Estoque mínimo</label><input id="minimo" value="${p.minimo || 0}"></div>
    <div><label>Aparece na área do cliente</label><select id="online"><option value="1" ${p.online ? 'selected' : ''}>Sim</option><option value="0" ${!p.online ? 'selected' : ''}>Não</option></select></div><div><label>Ativo</label><select id="ativo"><option value="1" ${p.ativo ? 'selected' : ''}>Sim</option><option value="0" ${!p.ativo ? 'selected' : ''}>Não</option></select></div>
    <div><label>Foto</label><input type="file" accept="image/*" id="ft"></div></div>
    <h4 class="mt mb">Ficha técnica (insumos por unidade produzida)</h4><div id="fc"></div><button class="btn sm ghost" id="af">+ Insumo</button>`, foot: '<button class="btn" id="ok">Salvar</button>' });
  let foto = p.foto || '';
  const dfc = () => { $('#fc', m).innerHTML = ficha.map((f, i) => `<div class="row mb"><select data-i="${i}" class="fi" style="flex:1">${ins.map(x => `<option value="${x.id}" ${x.id == f.insumo_id ? 'selected' : ''}>${esc(x.nome)} (${esc(x.unidade)})</option>`).join('')}</select><input data-i="${i}" class="fq" value="${f.qtd}" style="width:90px"><button class="btn sm ghost" data-d="${i}">×</button></div>`).join('') || '<p class="small mut">Sem insumos</p>';
    $$('.fi', m).forEach(x => x.onchange = () => ficha[x.dataset.i].insumo_id = +x.value); $$('.fq', m).forEach(x => x.onchange = () => ficha[x.dataset.i].qtd = num(x.value)); $$('[data-d]', m).forEach(x => x.onclick = () => { ficha.splice(x.dataset.d, 1); dfc(); }); };
  $('#af', m).onclick = () => { ficha.push({ insumo_id: ins[0]?.id, qtd: 1 }); dfc(); };
  $('#ft', m).onchange = async e => { foto = await reduzir(e.target.files[0], 400, .8); ok('Foto pronta'); };
  $('#ok', m).onclick = async () => { const d = { ficha, foto }; ['nome', 'unidade', 'descricao'].forEach(k => d[k] = $('#' + k, m).value); ['un_caixa', 'validade_dias', 'minimo', 'online', 'ativo'].forEach(k => d[k] = parseInt($('#' + k, m).value) || 0);
    try { await api('/api/cad/produtos' + (p.id ? '/' + p.id : ''), { method: p.id ? 'PUT' : 'POST', body: d }); m.close(); ok('Produto salvo'); await carregar(); render(); } catch (e) { err(e); } };
  dfc();
}

start();
