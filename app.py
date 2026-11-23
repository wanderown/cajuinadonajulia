# -*- coding: utf-8 -*-
"""
Cajuína Dona Júlia — sistema de gestão
Produção por lote, estoque com validade, pedidos e encomendas, revendedores a prazo,
rotas de entrega, feira, financeiro, equipe com permissões e área do cliente.
Roda na nuvem (Railway) com SQLite num volume. Acesso pelo navegador do PC ou do celular.
"""
import os, sys, json, sqlite3, uuid, secrets, time, threading, random, csv, io, hashlib
from datetime import datetime, timedelta, date
from functools import wraps
from flask import Flask, request, jsonify, session, g, send_from_directory, render_template, Response, abort, redirect

import integracoes as I

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.environ.get("CAJU_DATA") or os.path.join(BASE, "dados")
DB_PATH = os.path.join(DATA, "cajuina.db")
BACKUPS = os.path.join(DATA, "backups")
PORT = int(os.environ.get("PORT") or os.environ.get("CAJU_PORT") or "5000")
os.makedirs(BACKUPS, exist_ok=True)

try:
    from zoneinfo import ZoneInfo
    FUSO = ZoneInfo(os.environ.get("CAJU_TZ", "America/Fortaleza"))
except Exception:
    FUSO = None


def agora_dt():
    return datetime.now(FUSO).replace(tzinfo=None) if FUSO else datetime.now()


def agora():
    return agora_dt().strftime("%Y-%m-%d %H:%M:%S")


def hoje():
    return agora_dt().strftime("%Y-%m-%d")


def mais_dias(d, n):
    return (datetime.strptime(d[:10], "%Y-%m-%d") + timedelta(days=n)).strftime("%Y-%m-%d")


app = Flask(__name__, static_folder="static", template_folder="templates")
from werkzeug.middleware.proxy_fix import ProxyFix
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
_sf = os.path.join(DATA, ".secret")
if not os.path.exists(_sf):
    open(_sf, "w").write(secrets.token_hex(32))
app.secret_key = open(_sf).read().strip()
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=30)

# ------------------------------------------------------------------ permissões
PERMISSOES = {
    "pedidos": "Ver e criar pedidos",
    "pedidos_cancelar": "Cancelar pedidos",
    "precos": "Alterar preço/desconto no pedido",
    "clientes": "Clientes e revendedores",
    "producao": "Produção e lotes",
    "estoque": "Estoque e insumos",
    "rotas": "Rotas e entregas (gestão)",
    "entregas": "App do entregador",
    "feira": "Caixa de feira",
    "financeiro": "Financeiro (receber, pagar, resultado)",
    "relatorios": "Painel e relatórios",
    "equipe": "Equipe e permissões",
    "config": "Configurações e tabelas de preço",
}
PAPEIS = {
    "admin": list(PERMISSOES),
    "vendas": ["pedidos", "clientes", "feira", "relatorios", "rotas"],
    "producao": ["producao", "estoque"],
    "entregador": ["entregas"],
    "feira": ["feira"],
}
STATUS = ["novo", "separando", "em_rota", "entregue", "cancelado"]
CANAIS = {"revenda": "Revendedor", "encomenda": "Encomenda", "whatsapp": "WhatsApp", "online": "Área do cliente", "feira": "Feira/evento", "balcao": "Balcão/fazenda"}
FORMAS = ["pix", "dinheiro", "boleto", "credito", "debito", "transferencia"]

# ------------------------------------------------------------------ banco
SCHEMA = """
CREATE TABLE IF NOT EXISTS config (chave TEXT PRIMARY KEY, valor TEXT);
CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY, nome TEXT, pin TEXT UNIQUE, papel TEXT, permissoes TEXT,
  desconto_max REAL DEFAULT 0, telefone TEXT DEFAULT '', comissao REAL DEFAULT 0, ativo INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS log (id INTEGER PRIMARY KEY, usuario TEXT, acao TEXT, detalhe TEXT, criado_em TEXT);
CREATE TABLE IF NOT EXISTS produtos (id INTEGER PRIMARY KEY, nome TEXT, descricao TEXT DEFAULT '', unidade TEXT DEFAULT 'un',
  un_caixa INTEGER DEFAULT 1, validade_dias INTEGER DEFAULT 365, prefixo TEXT DEFAULT 'L', foto TEXT DEFAULT '',
  minimo INTEGER DEFAULT 0, ordem INTEGER DEFAULT 0, online INTEGER DEFAULT 1, ativo INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS tabelas (id INTEGER PRIMARY KEY, nome TEXT, ativo INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS precos (tabela_id INTEGER, produto_id INTEGER, preco REAL, PRIMARY KEY (tabela_id, produto_id));
CREATE TABLE IF NOT EXISTS rotas (id INTEGER PRIMARY KEY, nome TEXT, dia TEXT DEFAULT '', frete REAL DEFAULT 0,
  frete_gratis_acima REAL DEFAULT 0, tabela_id INTEGER, cor TEXT DEFAULT '#D7261E', ativo INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY, nome TEXT, tipo TEXT DEFAULT 'consumidor', documento TEXT DEFAULT '',
  contato TEXT DEFAULT '', telefone TEXT DEFAULT '', email TEXT DEFAULT '', endereco TEXT DEFAULT '', bairro TEXT DEFAULT '',
  cidade TEXT DEFAULT '', lat REAL, lng REAL, rota_id INTEGER, tabela_id INTEGER, prazo_dias INTEGER DEFAULT 0,
  limite REAL DEFAULT 0, obs TEXT DEFAULT '', ativo INTEGER DEFAULT 1, criado_em TEXT);
CREATE TABLE IF NOT EXISTS lotes (id INTEGER PRIMARY KEY, codigo TEXT UNIQUE, data_fab TEXT, validade TEXT, caju_kg REAL DEFAULT 0,
  custo_total REAL DEFAULT 0, obs TEXT DEFAULT '', usuario TEXT, criado_em TEXT);
CREATE TABLE IF NOT EXISTS lote_itens (id INTEGER PRIMARY KEY, lote_id INTEGER, produto_id INTEGER, qtd INTEGER, saldo INTEGER,
  custo_unit REAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS insumos (id INTEGER PRIMARY KEY, nome TEXT, unidade TEXT DEFAULT 'un', estoque REAL DEFAULT 0,
  minimo REAL DEFAULT 0, custo REAL DEFAULT 0, ativo INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS ficha (produto_id INTEGER, insumo_id INTEGER, qtd REAL, PRIMARY KEY (produto_id, insumo_id));
CREATE TABLE IF NOT EXISTS movs (id INTEGER PRIMARY KEY, tipo TEXT, produto_id INTEGER, lote_item_id INTEGER, insumo_id INTEGER,
  qtd REAL, custo REAL DEFAULT 0, pedido_id INTEGER, obs TEXT DEFAULT '', usuario TEXT, criado_em TEXT);
CREATE TABLE IF NOT EXISTS pedidos (id INTEGER PRIMARY KEY, numero INTEGER, token TEXT UNIQUE, cliente_id INTEGER, canal TEXT,
  status TEXT DEFAULT 'novo', tabela_id INTEGER, rota_id INTEGER, data_entrega TEXT, subtotal REAL DEFAULT 0, frete REAL DEFAULT 0,
  desconto REAL DEFAULT 0, total REAL DEFAULT 0, condicao TEXT DEFAULT 'vista', forma TEXT DEFAULT 'pix', vencimento TEXT,
  pago REAL DEFAULT 0, obs TEXT DEFAULT '', usuario TEXT, entregador_id INTEGER, canhoto TEXT DEFAULT '',
  criado_em TEXT, separado_em TEXT, saiu_em TEXT, entregue_em TEXT, cancelado_em TEXT, cancel_motivo TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS pedido_itens (id INTEGER PRIMARY KEY, pedido_id INTEGER, produto_id INTEGER, descricao TEXT,
  qtd INTEGER, unit REAL, total REAL);
CREATE TABLE IF NOT EXISTS pedido_lotes (item_id INTEGER, lote_item_id INTEGER, qtd INTEGER);
CREATE TABLE IF NOT EXISTS recebimentos (id INTEGER PRIMARY KEY, pedido_id INTEGER, valor REAL, forma TEXT, data TEXT, usuario TEXT,
  obs TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS contas_pagar (id INTEGER PRIMARY KEY, descricao TEXT, categoria TEXT, valor REAL, vencimento TEXT,
  pago_em TEXT, ativo INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS codigos (telefone TEXT PRIMARY KEY, codigo TEXT, expira TEXT, tentativas INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS posicoes (usuario_id INTEGER PRIMARY KEY, lat REAL, lng REAL, em TEXT);
CREATE INDEX IF NOT EXISTS ix_ped_cli ON pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS ix_ped_st ON pedidos(status);
CREATE INDEX IF NOT EXISTS ix_itens ON pedido_itens(pedido_id);
CREATE INDEX IF NOT EXISTS ix_rec ON recebimentos(pedido_id);
"""
CONFIG_PADRAO = {
    "empresa": "Cajuína Dona Júlia", "slogan": "Sabor que é Piauí!",
    "endereco": "Fazenda Sossego, BR 316 Km 208 · Valença do Piauí/PI",
    "telefones": "(86) 99956-3817 · (86) 99941-7686", "whatsapp": "86999417686", "instagram": "cajuinadonajulia",
    "cnpj": "", "selo": "Indicação de Procedência · Piauí (INPI)",
    "pix_chave": "", "pix_nome": "CAJUINA DONA JULIA", "pix_cidade": "VALENCA DO PIAUI",
    "lat_fazenda": "-6.4300", "lng_fazenda": "-41.7500",
    "online_ativo": "1", "online_minimo": "0", "online_msg": "Entregas em Teresina às sextas. Pedidos até quinta 18h.",
    "msg_cobranca": "Olá, {cliente}! Tudo bem? 🍹 Lembrando do pedido #{numero} da Cajuína Dona Júlia, no valor de {valor}, com vencimento em {vencimento}. Segue o link com o Pix: {link} Obrigado pela parceria!",
    "msg_pedido": "Olá, {cliente}! Seu pedido #{numero} da Cajuína Dona Júlia está {status}. Detalhes: {link}",
    "url_publica": "", "demo": "0",
}


def db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH, timeout=20)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def _fecha(_):
    d = g.pop("db", None)
    if d is not None:
        d.close()


def rows(c):
    return [dict(r) for r in c.fetchall()]


def one(c):
    r = c.fetchone()
    return dict(r) if r else None


def cfg_all():
    return {r["chave"]: r["valor"] for r in db().execute("SELECT * FROM config")}


def so_dig(t):
    return "".join(c for c in str(t or "") if c.isdigit())


def brl(v):
    return "R$ " + f"{(v or 0):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


app.jinja_env.filters["brl"] = lambda v: f"{(v or 0):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
app.jinja_env.filters["dbr"] = lambda s: f"{s[8:10]}/{s[5:7]}/{s[0:4]}" if s and len(s) >= 10 else ""
app.jinja_env.filters["tel"] = lambda t: (lambda d: f"({d[:2]}) {d[2:7]}-{d[7:]}" if len(d) == 11 else (f"({d[:2]}) {d[2:6]}-{d[6:]}" if len(d) == 10 else d))(so_dig(t))


# ------------------------------------------------------------------ auth
def eu():
    return session.get("nome", "sistema") if request else "sistema"


def perms():
    return set(session.get("perms", []))


def exige(*ps):
    def deco(fn):
        @wraps(fn)
        def w(*a, **k):
            if "uid" not in session:
                return jsonify(erro="Faça login"), 401
            if ps and not (set(ps) & perms()):
                return jsonify(erro="Você não tem permissão para isso"), 403
            return fn(*a, **k)
        return w
    return deco


def registrar(acao, detalhe=""):
    db().execute("INSERT INTO log (usuario,acao,detalhe,criado_em) VALUES (?,?,?,?)", (eu(), acao, str(detalhe)[:300], agora()))


@app.post("/api/login")
def login():
    pin = str((request.json or {}).get("pin", "")).strip()
    u = one(db().execute("SELECT * FROM usuarios WHERE pin=? AND ativo=1", (pin,)))
    if not u:
        return jsonify(erro="PIN inválido"), 401
    session.clear()
    session.permanent = True
    session.update(uid=u["id"], nome=u["nome"], papel=u["papel"], perms=json.loads(u["permissoes"] or "[]"),
                   desc_max=u["desconto_max"] or 0)
    registrar("login")
    db().commit()
    return jsonify(me())


def me():
    return {"id": session["uid"], "nome": session["nome"], "papel": session["papel"], "perms": session["perms"],
            "desconto_max": session.get("desc_max", 0)} if "uid" in session else None


@app.get("/api/me")
def api_me():
    return jsonify(me())


@app.post("/api/logout")
def logout():
    session.pop("uid", None)
    return jsonify(ok=True)


# ------------------------------------------------------------------ estoque / lotes
def saldo_produto(pid):
    return db().execute("SELECT COALESCE(SUM(saldo),0) FROM lote_itens WHERE produto_id=?", (pid,)).fetchone()[0]


def alocar(item_id, produto_id, qtd, pedido_id, usuario):
    """Tira do estoque pelo lote que vence primeiro (FIFO por validade)."""
    d = db()
    falta = qtd
    lotes = d.execute("""SELECT li.id, li.saldo, li.custo_unit FROM lote_itens li JOIN lotes l ON l.id=li.lote_id
                         WHERE li.produto_id=? AND li.saldo>0 ORDER BY l.validade, l.id""", (produto_id,)).fetchall()
    for li in lotes:
        if falta <= 0:
            break
        q = min(falta, li["saldo"])
        d.execute("UPDATE lote_itens SET saldo=saldo-? WHERE id=?", (q, li["id"]))
        d.execute("INSERT INTO pedido_lotes VALUES (?,?,?)", (item_id, li["id"], q))
        d.execute("""INSERT INTO movs (tipo,produto_id,lote_item_id,qtd,custo,pedido_id,usuario,criado_em)
                     VALUES ('venda',?,?,?,?,?,?,?)""", (produto_id, li["id"], -q, li["custo_unit"], pedido_id, usuario, agora()))
        falta -= q
    if falta > 0:
        raise ValueError("Estoque insuficiente")


def devolver(pedido_id, usuario):
    d = db()
    for r in d.execute("""SELECT pl.*, i.produto_id, li.custo_unit FROM pedido_lotes pl JOIN pedido_itens i ON i.id=pl.item_id
                          JOIN lote_itens li ON li.id=pl.lote_item_id WHERE i.pedido_id=?""", (pedido_id,)).fetchall():
        d.execute("UPDATE lote_itens SET saldo=saldo+? WHERE id=?", (r["qtd"], r["lote_item_id"]))
        d.execute("""INSERT INTO movs (tipo,produto_id,lote_item_id,qtd,custo,pedido_id,usuario,criado_em)
                     VALUES ('estorno',?,?,?,?,?,?,?)""", (r["produto_id"], r["lote_item_id"], r["qtd"], r["custo_unit"], pedido_id, usuario, agora()))
    d.execute("DELETE FROM pedido_lotes WHERE item_id IN (SELECT id FROM pedido_itens WHERE pedido_id=?)", (pedido_id,))


def criar_lote(dados, usuario):
    d = db()
    data_fab = dados.get("data_fab") or hoje()
    itens = [i for i in dados.get("itens", []) if int(i.get("qtd") or 0) > 0]
    if not itens:
        raise ValueError("Informe a quantidade produzida")
    n = d.execute("SELECT COUNT(*) FROM lotes WHERE substr(data_fab,1,7)=?", (data_fab[:7],)).fetchone()[0] + 1
    codigo = dados.get("codigo") or f"L-{data_fab[2:4]}{data_fab[5:7]}{'' if n == 1 else '-' + str(n)}"
    while d.execute("SELECT 1 FROM lotes WHERE codigo=?", (codigo,)).fetchone():
        n += 1
        codigo = f"L-{data_fab[2:4]}{data_fab[5:7]}-{n}"
    # custo: caju + insumos (ficha) + outros custos
    custo_insumos = 0.0
    consumo = {}
    for it in itens:
        for f in d.execute("SELECT f.insumo_id, f.qtd, i.custo FROM ficha f JOIN insumos i ON i.id=f.insumo_id WHERE f.produto_id=?",
                           (int(it["produto_id"]),)):
            q = f["qtd"] * int(it["qtd"])
            consumo[f["insumo_id"]] = consumo.get(f["insumo_id"], 0) + q
            custo_insumos += q * (f["custo"] or 0)
    custo_caju = float(dados.get("caju_kg") or 0) * float(dados.get("custo_kg") or cfg_all().get("custo_caju_kg") or 0)
    custo_total = round(custo_insumos + custo_caju + float(dados.get("outros_custos") or 0), 2)
    total_un = sum(int(i["qtd"]) for i in itens) or 1
    validade = dados.get("validade")
    cur = d.execute("INSERT INTO lotes (codigo,data_fab,validade,caju_kg,custo_total,obs,usuario,criado_em) VALUES (?,?,?,?,?,?,?,?)",
                    (codigo, data_fab, validade or "", float(dados.get("caju_kg") or 0), custo_total, dados.get("obs", ""), usuario, agora()))
    lid = cur.lastrowid
    maior_val = ""
    for it in itens:
        p = one(d.execute("SELECT * FROM produtos WHERE id=?", (int(it["produto_id"]),)))
        v = validade or mais_dias(data_fab, p["validade_dias"] or 365)
        maior_val = max(maior_val, v)
        q = int(it["qtd"])
        c = d.execute("INSERT INTO lote_itens (lote_id,produto_id,qtd,saldo,custo_unit) VALUES (?,?,?,?,?)",
                      (lid, p["id"], q, q, round(custo_total / total_un, 4)))
        d.execute("INSERT INTO movs (tipo,produto_id,lote_item_id,qtd,usuario,criado_em) VALUES ('producao',?,?,?,?,?)",
                  (p["id"], c.lastrowid, q, usuario, agora()))
    if not validade:
        d.execute("UPDATE lotes SET validade=? WHERE id=?", (maior_val, lid))
    for ins, q in consumo.items():
        d.execute("UPDATE insumos SET estoque=estoque-? WHERE id=?", (q, ins))
        d.execute("INSERT INTO movs (tipo,insumo_id,qtd,usuario,criado_em,obs) VALUES ('consumo',?,?,?,?,?)", (ins, -q, usuario, agora(), codigo))
    return lid, codigo


# ------------------------------------------------------------------ pedidos
def preco(tabela_id, produto_id):
    r = db().execute("SELECT preco FROM precos WHERE tabela_id=? AND produto_id=?", (tabela_id, produto_id)).fetchone()
    if r is None:
        r = db().execute("SELECT preco FROM precos WHERE tabela_id=(SELECT valor FROM config WHERE chave='tabela_padrao') AND produto_id=?",
                         (produto_id,)).fetchone()
    return r[0] if r else 0


def montar_itens(j, tabela_id, permite_preco):
    d = db()
    itens = [i for i in j.get("itens", []) if int(i.get("qtd") or 0) > 0]
    if not itens:
        raise ValueError("Pedido sem itens")
    linhas, subtotal = [], 0.0
    for it in itens:
        p = one(d.execute("SELECT * FROM produtos WHERE id=? AND ativo=1", (int(it["produto_id"]),)))
        if not p:
            raise ValueError("Produto indisponível")
        q = int(it["qtd"])
        if saldo_produto(p["id"]) < q:
            raise ValueError(f"Estoque insuficiente de {p['nome']} (disponível: {saldo_produto(p['id'])})")
        u = float(it["unit"]) if permite_preco and it.get("unit") not in (None, "") else preco(tabela_id, p["id"])
        if u < 0:
            raise ValueError("Preço inválido")
        u = round(u, 4)
        linhas.append((p, q, u))
        subtotal += round(q * u, 2)
    return linhas, round(subtotal, 2)


def checar_preco(j, tabela_id):
    """Quem não tem permissão de preço pode mexer em preço/desconto até o seu limite (%)."""
    if "precos" in perms():
        return True
    itens = [i for i in j.get("itens", []) if int(i.get("qtd") or 0) > 0]
    tab = sum(int(i["qtd"]) * preco(tabela_id, int(i["produto_id"])) for i in itens)
    novo = sum(int(i["qtd"]) * (float(i["unit"]) if i.get("unit") not in (None, "") else preco(tabela_id, int(i["produto_id"]))) for i in itens)
    abat = round(tab - novo + float(j.get("desconto") or 0), 2)
    if abat <= 0.009:
        return True
    maxp = session.get("desc_max", 0) or 0
    if maxp and abat <= tab * maxp / 100 + 0.01:
        return True
    raise PermissionError(f"Desconto acima do seu limite ({maxp:.0f}%)" if maxp else "Você não tem permissão para mudar preço ou dar desconto")


def criar_pedido(j, usuario, permite_preco=False, canal_padrao="encomenda"):
    d = db()
    cli = one(d.execute("SELECT * FROM clientes WHERE id=?", (int(j.get("cliente_id") or 0),))) if j.get("cliente_id") else None
    tabela_id = int(j.get("tabela_id") or (cli and cli["tabela_id"]) or cfg_all().get("tabela_padrao") or 1)
    rota_id = j.get("rota_id") if j.get("rota_id") not in (None, "") else (cli and cli["rota_id"])
    rota = one(d.execute("SELECT * FROM rotas WHERE id=?", (rota_id,))) if rota_id else None
    linhas, subtotal = montar_itens(j, tabela_id, permite_preco)
    subtotal = round(subtotal, 2)
    frete = j.get("frete")
    if frete in (None, ""):
        frete = rota["frete"] if rota else 0
        if rota and rota["frete_gratis_acima"] and subtotal >= rota["frete_gratis_acima"]:
            frete = 0
    frete = float(frete or 0)
    desconto = float(j.get("desconto") or 0) if permite_preco else 0.0
    total = round(max(0, subtotal + frete - desconto), 2)
    condicao = j.get("condicao") or ("prazo" if cli and cli["prazo_dias"] else "vista")
    prazo = int(j.get("prazo_dias") or (cli and cli["prazo_dias"]) or 0)
    if condicao == "prazo" and cli and cli["limite"]:
        aberto = em_aberto_cliente(cli["id"])
        if aberto + total > cli["limite"] and not j.get("ignorar_limite"):
            raise ValueError(f"Limite de crédito excedido (em aberto {brl(aberto)} de {brl(cli['limite'])})")
    criado = j.get("criado_em") or agora()
    vencimento = mais_dias(criado, prazo) if condicao == "prazo" else criado[:10]
    num = d.execute("SELECT COALESCE(MAX(numero),0)+1 FROM pedidos").fetchone()[0]
    cur = d.execute("""INSERT INTO pedidos (numero,token,cliente_id,canal,status,tabela_id,rota_id,data_entrega,subtotal,frete,desconto,total,
        condicao,forma,vencimento,obs,usuario,criado_em) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (num, secrets.token_urlsafe(10), cli and cli["id"], j.get("canal") or (cli and cli["tipo"] == "revenda" and "revenda") or canal_padrao,
         "novo", tabela_id, rota_id, j.get("data_entrega") or "", subtotal, frete, desconto, total, condicao,
         j.get("forma") or "pix", vencimento, j.get("obs", ""), usuario, criado))
    pid = cur.lastrowid
    for p, q, u in linhas:
        c = d.execute("INSERT INTO pedido_itens (pedido_id,produto_id,descricao,qtd,unit,total) VALUES (?,?,?,?,?,?)",
                      (pid, p["id"], p["nome"], q, u, round(q * u, 2)))
        alocar(c.lastrowid, p["id"], q, pid, usuario)
    if j.get("pago_agora"):
        receber(pid, total, j.get("forma") or "pix", usuario, criado[:10])
    return pid


def receber(pid, valor, forma, usuario, data=None, obs=""):
    d = db()
    p = one(d.execute("SELECT * FROM pedidos WHERE id=?", (pid,)))
    valor = round(min(float(valor), p["total"] - p["pago"]), 2)
    if valor <= 0:
        raise ValueError("Nada a receber neste pedido")
    d.execute("INSERT INTO recebimentos (pedido_id,valor,forma,data,usuario,obs) VALUES (?,?,?,?,?,?)",
              (pid, valor, forma, data or hoje(), usuario, obs))
    d.execute("UPDATE pedidos SET pago=pago+? WHERE id=?", (valor, pid))
    return valor


def em_aberto_cliente(cid):
    return round(db().execute("SELECT COALESCE(SUM(total-pago),0) FROM pedidos WHERE cliente_id=? AND status!='cancelado'",
                              (cid,)).fetchone()[0], 2)


def pedido_completo(pid):
    d = db()
    p = one(d.execute("""SELECT p.*, c.nome cliente, c.telefone, c.tipo cliente_tipo, c.endereco, c.bairro, c.cidade, c.documento,
        c.lat, c.lng, r.nome rota, t.nome tabela, u.nome entregador FROM pedidos p LEFT JOIN clientes c ON c.id=p.cliente_id
        LEFT JOIN rotas r ON r.id=p.rota_id LEFT JOIN tabelas t ON t.id=p.tabela_id LEFT JOIN usuarios u ON u.id=p.entregador_id
        WHERE p.id=?""", (pid,)))
    if not p:
        return None
    p["itens"] = rows(d.execute("""SELECT i.*, pr.un_caixa, pr.descricao detalhe, pr.unidade FROM pedido_itens i
        LEFT JOIN produtos pr ON pr.id=i.produto_id WHERE i.pedido_id=? ORDER BY i.id""", (pid,)))
    for i in p["itens"]:
        i["lotes"] = rows(d.execute("""SELECT l.codigo, l.validade, pl.qtd FROM pedido_lotes pl JOIN lote_itens li ON li.id=pl.lote_item_id
            JOIN lotes l ON l.id=li.lote_id WHERE pl.item_id=?""", (i["id"],)))
    p["recebimentos"] = rows(d.execute("SELECT * FROM recebimentos WHERE pedido_id=? ORDER BY id", (pid,)))
    p["aberto"] = round(p["total"] - p["pago"], 2)
    p["vencido"] = p["aberto"] > 0.009 and p["status"] != "cancelado" and (p["vencimento"] or "9") < hoje()
    return p


def link_publico(p):
    base = (cfg_all().get("url_publica") or request.host_url).rstrip("/")
    return f"{base}/p/{p['token']}"


@app.get("/api/pedidos")
@exige("pedidos", "rotas", "entregas", "financeiro")
def pedidos_lista():
    d = db()
    q = request.args
    sql = "SELECT id FROM pedidos WHERE 1=1"
    a = []
    if q.get("ativos"):
        sql += " AND (status IN ('novo','separando','em_rota') OR (status='entregue' AND entregue_em>=?))"
        a.append(mais_dias(hoje(), -3))
    if q.get("de"):
        sql += " AND substr(criado_em,1,10)>=?"; a.append(q["de"])
    if q.get("ate"):
        sql += " AND substr(criado_em,1,10)<=?"; a.append(q["ate"])
    if q.get("cliente_id"):
        sql += " AND cliente_id=?"; a.append(int(q["cliente_id"]))
    if q.get("status"):
        sql += " AND status=?"; a.append(q["status"])
    if q.get("q"):
        sql += " AND (CAST(numero AS TEXT)=? OR cliente_id IN (SELECT id FROM clientes WHERE nome LIKE ?))"
        a += [q["q"], f"%{q['q']}%"]
    if "entregas" in perms() and not ({"pedidos", "rotas"} & perms()):
        sql += " AND entregador_id=? AND status='em_rota'"; a.append(session["uid"])
    sql += " ORDER BY id DESC LIMIT 400"
    return jsonify([pedido_completo(r[0]) for r in d.execute(sql, a).fetchall()])


@app.get("/api/pedidos/<int:pid>")
@exige("pedidos", "rotas", "entregas", "financeiro")
def pedido_get(pid):
    p = pedido_completo(pid)
    if not p:
        abort(404)
    p["link"] = link_publico(p)
    return jsonify(p)


@app.post("/api/pedidos")
@exige("pedidos", "feira")
def pedido_novo():
    j = request.json or {}
    nome_novo = (j.get("cliente_nome") or "").strip()
    if not j.get("cliente_id") and nome_novo:
        ex = db().execute("SELECT id FROM clientes WHERE lower(trim(nome))=lower(?)", (nome_novo,)).fetchone()
        if ex:
            j["cliente_id"] = ex[0]
        else:
            cur = db().execute("""INSERT INTO clientes (nome,tipo,telefone,cidade,tabela_id,rota_id,ativo,criado_em)
                VALUES (?,?,?,?,?,?,1,?)""", (nome_novo, "consumidor", so_dig(j.get("cliente_tel") or ""), j.get("cliente_cidade") or "",
                int(j.get("tabela_id") or cfg_all().get("tabela_padrao") or 1), j.get("rota_id") or None, agora()))
            j["cliente_id"] = cur.lastrowid
            registrar("cliente cadastrado no pedido", nome_novo)
    cli = one(db().execute("SELECT tabela_id FROM clientes WHERE id=?", (int(j.get("cliente_id") or 0),))) if j.get("cliente_id") else None
    tabela_id = int(j.get("tabela_id") or (cli and cli["tabela_id"]) or cfg_all().get("tabela_padrao") or 1)
    try:
        pode_preco = checar_preco(j, tabela_id)
    except PermissionError as e:
        return jsonify(erro=str(e)), 403
    try:
        pid = criar_pedido(j, eu(), permite_preco=pode_preco)
    except (ValueError, KeyError) as e:
        db().rollback()
        return jsonify(erro=str(e)), 400
    registrar("pedido criado", f"#{db().execute('SELECT numero FROM pedidos WHERE id=?', (pid,)).fetchone()[0]}")
    db().commit()
    return jsonify(pedido_completo(pid))


@app.put("/api/pedidos/<int:pid>/itens")
@exige("pedidos")
def pedido_editar(pid):
    j = request.json or {}
    d = db()
    p = pedido_completo(pid)
    if not p:
        abort(404)
    if p["status"] not in ("novo", "separando"):
        return jsonify(erro="Só dá pra editar pedido que ainda não saiu para entrega"), 400
    try:
        checar_preco(j, p["tabela_id"])
        devolver(pid, eu())
        d.execute("DELETE FROM pedido_itens WHERE pedido_id=?", (pid,))
        linhas, subtotal = montar_itens(j, p["tabela_id"], True)
        frete = float(j["frete"]) if j.get("frete") not in (None, "") else p["frete"]
        desconto = float(j.get("desconto") or 0)
        total = round(max(0, subtotal + frete - desconto), 2)
        if p["pago"] > total + 0.009:
            raise ValueError(f"Já foi recebido {brl(p['pago'])}, mais que o novo total {brl(total)}")
        for pr, q, u in linhas:
            c = d.execute("INSERT INTO pedido_itens (pedido_id,produto_id,descricao,qtd,unit,total) VALUES (?,?,?,?,?,?)",
                          (pid, pr["id"], pr["nome"], q, u, round(q * u, 2)))
            alocar(c.lastrowid, pr["id"], q, pid, eu())
        d.execute("UPDATE pedidos SET subtotal=?, frete=?, desconto=?, total=?, obs=?, data_entrega=? WHERE id=?",
                  (subtotal, frete, desconto, total, j.get("obs", p["obs"]), j.get("data_entrega", p["data_entrega"]) or "", pid))
    except PermissionError as e:
        d.rollback()
        return jsonify(erro=str(e)), 403
    except (ValueError, KeyError) as e:
        d.rollback()
        return jsonify(erro=str(e)), 400
    registrar("pedido editado", f"#{p['numero']}: {brl(p['total'])} → {brl(total)}")
    d.commit()
    r = pedido_completo(pid)
    r["link"] = link_publico(r)
    return jsonify(r)


@app.post("/api/pedidos/<int:pid>/status")
@exige("pedidos", "rotas", "entregas")
def pedido_status(pid):
    j = request.json or {}
    novo = j.get("status")
    d = db()
    p = pedido_completo(pid)
    if not p or novo not in STATUS:
        return jsonify(erro="Inválido"), 400
    if novo == "cancelado":
        if "pedidos_cancelar" not in perms():
            return jsonify(erro="Você não tem permissão para cancelar"), 403
        if p["pago"] > 0 and not j.get("estornar"):
            return jsonify(erro="Pedido tem pagamento registrado. Confirme o estorno."), 400
        devolver(pid, eu())
        d.execute("DELETE FROM recebimentos WHERE pedido_id=?", (pid,))
        d.execute("UPDATE pedidos SET status='cancelado', pago=0, cancelado_em=?, cancel_motivo=? WHERE id=?",
                  (agora(), j.get("motivo", ""), pid))
    else:
        if "entregas" in perms() and not ({"pedidos", "rotas"} & perms()) and novo != "entregue":
            return jsonify(erro="Sem permissão"), 403
        col = {"separando": "separado_em", "em_rota": "saiu_em", "entregue": "entregue_em"}.get(novo)
        sets, vals = ["status=?"], [novo]
        if col:
            sets.append(f"{col}=?"); vals.append(agora())
        if novo == "em_rota" and j.get("entregador_id"):
            sets.append("entregador_id=?"); vals.append(int(j["entregador_id"]))
        if novo == "entregue" and j.get("canhoto"):
            sets.append("canhoto=?"); vals.append(j["canhoto"][:400000])
        vals.append(pid)
        d.execute(f"UPDATE pedidos SET {','.join(sets)} WHERE id=?", vals)
        if novo == "entregue" and j.get("receber") and p["aberto"] > 0:
            receber(pid, p["aberto"], j.get("forma", "dinheiro"), eu())
    registrar(f"pedido {novo}", f"#{p['numero']}")
    d.commit()
    return jsonify(pedido_completo(pid))


@app.post("/api/pedidos/<int:pid>/receber")
@exige("financeiro", "pedidos", "entregas")
def pedido_receber(pid):
    j = request.json or {}
    try:
        v = receber(pid, float(j.get("valor") or 0), j.get("forma", "pix"), eu(), j.get("data") or hoje(), j.get("obs", ""))
    except ValueError as e:
        return jsonify(erro=str(e)), 400
    registrar("recebimento", f"pedido {pid} {brl(v)}")
    db().commit()
    return jsonify(pedido_completo(pid))


@app.get("/api/pedidos/<int:pid>/whatsapp")
@exige("pedidos", "financeiro", "rotas")
def pedido_whats(pid):
    p = pedido_completo(pid)
    c = cfg_all()
    tipo = request.args.get("tipo", "pedido")
    st = {"novo": "recebido ✅", "separando": "em separação 📦", "em_rota": "a caminho 🚚", "entregue": "entregue 🎉",
          "cancelado": "cancelado"}.get(p["status"], p["status"])
    modelo = c.get("msg_cobranca") if tipo == "cobranca" else c.get("msg_pedido")
    msg = modelo.format(cliente=p["cliente"] or "", numero=p["numero"], valor=brl(p["aberto"] if tipo == "cobranca" else p["total"]),
                        vencimento=app.jinja_env.filters["dbr"](p["vencimento"]), link=link_publico(p), status=st)
    return jsonify(link=I.wa_link(p["telefone"], msg), mensagem=msg)


# ------------------------------------------------------------------ espelho de pedido / romaneio
def pix_payload(valor, txid):
    c = cfg_all()
    if not c.get("pix_chave"):
        return ""
    try:
        return I.pix_copia_e_cola(c["pix_chave"], c.get("pix_nome"), c.get("pix_cidade"), valor, txid)
    except Exception:
        return ""


def render_espelho(p, auto=False):
    pix = pix_payload(p["aberto"], f"PED{p['numero']}") if p["aberto"] > 0.009 else ""
    return render_template("espelho.html", p=p, c=cfg_all(), pix=pix, qr=bool(pix and I.segno), auto=auto, hoje=hoje(),
                           link=link_publico(p))


@app.get("/espelho/<int:pid>")
def espelho_interno(pid):
    if "uid" not in session and session.get("cli") is None:
        return redirect("/")
    p = pedido_completo(pid)
    if not p or ("uid" not in session and p["cliente_id"] != session.get("cli")):
        abort(404)
    return render_espelho(p, request.args.get("imprimir") == "1")


@app.get("/p/<token>")
def espelho_publico(token):
    r = db().execute("SELECT id FROM pedidos WHERE token=?", (token,)).fetchone()
    if not r:
        abort(404)
    return render_espelho(pedido_completo(r[0]))


@app.get("/qr.png")
def qr_png():
    png = I.qr_png(request.args.get("t", "")[:700], int(request.args.get("s", 5)))
    if not png:
        return "QR indisponível (instale o pacote segno)", 501
    return Response(png, mimetype="image/png", headers={"Cache-Control": "max-age=3600"})


@app.get("/romaneio")
@exige("rotas", "pedidos", "entregas")
def romaneio():
    d = db()
    ids = [int(x) for x in (request.args.get("ids") or "").split(",") if x.isdigit()]
    if not ids:
        rota = request.args.get("rota_id")
        ids = [r[0] for r in d.execute("SELECT id FROM pedidos WHERE status IN ('separando','em_rota') AND (?='' OR rota_id=?) ORDER BY id",
                                       (rota or "", rota or 0))]
    ps = [pedido_completo(i) for i in ids]
    tot = {}
    for p in ps:
        for i in p["itens"]:
            tot[i["descricao"]] = tot.get(i["descricao"], 0) + i["qtd"]
    return render_template("romaneio.html", ps=ps, tot=tot, c=cfg_all(), agora=agora())


# ------------------------------------------------------------------ cadastros
TAB = {
    "produtos": ["nome", "descricao", "unidade", "un_caixa", "validade_dias", "prefixo", "foto", "minimo", "ordem", "online", "ativo"],
    "tabelas": ["nome", "ativo"],
    "rotas": ["nome", "dia", "frete", "frete_gratis_acima", "tabela_id", "cor", "ativo"],
    "clientes": ["nome", "tipo", "documento", "contato", "telefone", "email", "endereco", "bairro", "cidade", "lat", "lng", "rota_id",
                 "tabela_id", "prazo_dias", "limite", "obs", "ativo"],
    "insumos": ["nome", "unidade", "minimo", "custo", "ativo"],
    "contas_pagar": ["descricao", "categoria", "valor", "vencimento", "pago_em", "ativo"],
    "usuarios": ["nome", "pin", "papel", "permissoes", "desconto_max", "telefone", "comissao", "ativo"],
}
PERM_TAB = {"produtos": "config", "tabelas": "config", "rotas": "rotas", "clientes": "clientes", "insumos": "estoque",
            "contas_pagar": "financeiro", "usuarios": "equipe"}


@app.post("/api/cad/<tab>")
@app.put("/api/cad/<tab>/<int:rid>")
def cad_salvar(tab, rid=None):
    if tab not in TAB:
        abort(404)
    if "uid" not in session or PERM_TAB[tab] not in perms():
        return jsonify(erro="Sem permissão"), 403
    j = dict(request.json or {})
    if tab == "clientes" and "telefone" in j:
        j["telefone"] = so_dig(j["telefone"])
    if tab == "usuarios":
        if "permissoes" in j and isinstance(j["permissoes"], list):
            j["permissoes"] = json.dumps([p for p in j["permissoes"] if p in PERMISSOES])
        if "pin" in j and (not str(j["pin"]).isdigit() or len(str(j["pin"])) < 4):
            return jsonify(erro="PIN precisa ter 4 ou mais números"), 400
    for k in ("lat", "lng", "rota_id", "tabela_id"):
        if k in j and j[k] in ("", None):
            j[k] = None
    cols = [c for c in TAB[tab] if c in j]
    d = db()
    try:
        if rid:
            if cols:
                d.execute(f"UPDATE {tab} SET {','.join(c + '=?' for c in cols)} WHERE id=?", [j[c] for c in cols] + [rid])
        else:
            extra = ", criado_em" if tab == "clientes" else ""
            vals = [j[c] for c in cols] + ([agora()] if tab == "clientes" else [])
            rid = d.execute(f"INSERT INTO {tab} ({','.join(cols)}{extra}) VALUES ({','.join('?' * len(vals))})", vals).lastrowid
    except sqlite3.IntegrityError:
        return jsonify(erro="Valor duplicado (ex.: PIN já usado)"), 400
    if tab == "usuarios" and not d.execute("SELECT 1 FROM usuarios WHERE ativo=1 AND permissoes LIKE '%equipe%'").fetchone():
        d.rollback()
        return jsonify(erro="Precisa sobrar pelo menos 1 pessoa com acesso à Equipe"), 400
    if tab == "produtos" and isinstance(j.get("precos"), dict):
        for tid, v in j["precos"].items():
            if v in ("", None):
                d.execute("DELETE FROM precos WHERE tabela_id=? AND produto_id=?", (int(tid), rid))
            else:
                d.execute("INSERT OR REPLACE INTO precos VALUES (?,?,?)", (int(tid), rid, float(v)))
    if tab == "produtos" and isinstance(j.get("ficha"), list):
        d.execute("DELETE FROM ficha WHERE produto_id=?", (rid,))
        for f in j["ficha"]:
            if f.get("insumo_id") and float(f.get("qtd") or 0) > 0:
                d.execute("INSERT INTO ficha VALUES (?,?,?)", (rid, int(f["insumo_id"]), float(f["qtd"])))
    registrar(f"{tab} {'editado' if request.method == 'PUT' else 'criado'}", j.get("nome") or j.get("descricao") or rid)
    d.commit()
    return jsonify(id=rid)


@app.get("/api/base")
@exige()
def base():
    d = db()
    c = cfg_all()
    prods = rows(d.execute("SELECT * FROM produtos ORDER BY ordem, id"))
    pr = {}
    for r in d.execute("SELECT * FROM precos"):
        pr.setdefault(r["produto_id"], {})[str(r["tabela_id"])] = r["preco"]
    for p in prods:
        p["precos"] = pr.get(p["id"], {})
        p["saldo"] = saldo_produto(p["id"])
        p["ficha"] = rows(d.execute("SELECT insumo_id, qtd FROM ficha WHERE produto_id=?", (p["id"],)))
    out = {"produtos": prods, "tabelas": rows(d.execute("SELECT * FROM tabelas ORDER BY id")),
           "rotas": rows(d.execute("SELECT * FROM rotas ORDER BY id")),
           "entregadores": rows(d.execute("SELECT id, nome FROM usuarios WHERE ativo=1 AND permissoes LIKE '%entregas%'")),
           "config": {k: v for k, v in c.items() if not k.startswith("_")}, "permissoes": PERMISSOES, "papeis": PAPEIS,
           "canais": CANAIS, "formas": FORMAS, "hoje": hoje()}
    if "equipe" in perms():
        out["usuarios"] = rows(d.execute("SELECT * FROM usuarios ORDER BY ativo DESC, nome"))
    if {"estoque", "producao"} & perms():
        out["insumos"] = rows(d.execute("SELECT * FROM insumos ORDER BY nome"))
    return jsonify(out)


@app.get("/api/clientes")
@exige("clientes", "pedidos", "financeiro", "rotas", "feira")
def clientes_lista():
    d = db()
    cs = rows(d.execute("""SELECT c.*, r.nome rota, t.nome tabela,
        (SELECT COALESCE(SUM(total-pago),0) FROM pedidos WHERE cliente_id=c.id AND status!='cancelado') aberto,
        (SELECT COALESCE(SUM(total-pago),0) FROM pedidos WHERE cliente_id=c.id AND status!='cancelado' AND total-pago>0.009 AND vencimento<?) vencido,
        (SELECT MAX(criado_em) FROM pedidos WHERE cliente_id=c.id AND status!='cancelado') ultimo,
        (SELECT COUNT(*) FROM pedidos WHERE cliente_id=c.id AND status!='cancelado') n_pedidos,
        (SELECT COALESCE(SUM(total),0) FROM pedidos WHERE cliente_id=c.id AND status!='cancelado' AND criado_em>=?) total_ano
        FROM clientes c LEFT JOIN rotas r ON r.id=c.rota_id LEFT JOIN tabelas t ON t.id=c.tabela_id ORDER BY c.ativo DESC, c.nome""",
                        (hoje(), hoje()[:4] + "-01-01")))
    for c in cs:
        c["aberto"] = round(c["aberto"], 2); c["vencido"] = round(c["vencido"], 2)
        c["dias_sem_comprar"] = (agora_dt() - datetime.strptime(c["ultimo"][:10], "%Y-%m-%d")).days if c["ultimo"] else None
    return jsonify(cs)


@app.post("/api/clientes/<int:cid>/whatsapp-cobranca")
@exige("financeiro", "clientes")
def cliente_cobranca(cid):
    d = db()
    c = one(d.execute("SELECT * FROM clientes WHERE id=?", (cid,)))
    ps = rows(d.execute("SELECT numero, total-pago aberto, vencimento FROM pedidos WHERE cliente_id=? AND status!='cancelado' AND total-pago>0.009 ORDER BY vencimento", (cid,)))
    tot = sum(p["aberto"] for p in ps)
    linhas = "\n".join(f"• Pedido #{p['numero']} — {brl(p['aberto'])} (vence {app.jinja_env.filters['dbr'](p['vencimento'])})" for p in ps)
    base = (cfg_all().get("url_publica") or request.host_url).rstrip("/")
    msg = (f"Olá, {c['nome']}! Tudo bem? 🍹\nSegue o resumo dos pedidos em aberto com a Cajuína Dona Júlia:\n{linhas}\n"
           f"Total: {brl(tot)}\nVocê pode ver e pagar pelo Pix na sua área: {base}/cliente\nObrigado pela parceria!")
    return jsonify(link=I.wa_link(c["telefone"], msg))


# ------------------------------------------------------------------ produção e estoque
@app.get("/api/lotes")
@exige("producao", "estoque", "pedidos")
def lotes_lista():
    d = db()
    ls = rows(d.execute("SELECT * FROM lotes ORDER BY data_fab DESC, id DESC LIMIT 100"))
    for l in ls:
        l["itens"] = rows(d.execute("""SELECT li.*, p.nome produto FROM lote_itens li JOIN produtos p ON p.id=li.produto_id
                                       WHERE li.lote_id=?""", (l["id"],)))
        l["dias_validade"] = (datetime.strptime(l["validade"], "%Y-%m-%d") - datetime.strptime(hoje(), "%Y-%m-%d")).days if l["validade"] else None
    return jsonify(ls)


@app.get("/api/lotes/<int:lid>/rastreio")
@exige("producao", "estoque", "pedidos")
def lote_rastreio(lid):
    """Pra quem foi vendida cada garrafa deste lote (recall / reclamação)."""
    return jsonify(rows(db().execute("""SELECT p.id, p.numero, p.criado_em, c.nome cliente, c.telefone, c.cidade, pr.nome produto, pl.qtd
        FROM pedido_lotes pl JOIN lote_itens li ON li.id=pl.lote_item_id JOIN pedido_itens i ON i.id=pl.item_id
        JOIN pedidos p ON p.id=i.pedido_id LEFT JOIN clientes c ON c.id=p.cliente_id JOIN produtos pr ON pr.id=li.produto_id
        WHERE li.lote_id=? AND p.status!='cancelado' ORDER BY p.criado_em""", (lid,))))


@app.post("/api/lotes")
@exige("producao")
def lote_novo():
    try:
        lid, cod = criar_lote(request.json or {}, eu())
    except (ValueError, KeyError) as e:
        db().rollback()
        return jsonify(erro=str(e)), 400
    registrar("lote produzido", cod)
    db().commit()
    return jsonify(id=lid, codigo=cod)


@app.post("/api/estoque/ajuste")
@exige("estoque")
def estoque_ajuste():
    j = request.json or {}
    d = db()
    if j.get("insumo_id"):
        i = one(d.execute("SELECT * FROM insumos WHERE id=?", (int(j["insumo_id"]),)))
        q = float(j.get("qtd") or 0)
        tipo = j.get("tipo", "entrada")
        if tipo == "entrada":
            if j.get("custo"):
                novo = (max(0, i["estoque"]) * i["custo"] + q * float(j["custo"])) / max(0.0001, max(0, i["estoque"]) + q)
                d.execute("UPDATE insumos SET custo=? WHERE id=?", (round(novo, 4), i["id"]))
            delta = q
        elif tipo == "contagem":
            delta = q - i["estoque"]
        else:
            delta = -abs(q)
        d.execute("UPDATE insumos SET estoque=estoque+? WHERE id=?", (delta, i["id"]))
        d.execute("INSERT INTO movs (tipo,insumo_id,qtd,obs,usuario,criado_em) VALUES (?,?,?,?,?,?)",
                  (tipo, i["id"], delta, j.get("obs", ""), eu(), agora()))
        registrar(f"insumo {tipo}", f"{i['nome']} {delta:+g}")
    elif j.get("lote_item_id"):
        li = one(d.execute("SELECT * FROM lote_itens WHERE id=?", (int(j["lote_item_id"]),)))
        q = int(j.get("qtd") or 0)
        delta = q - li["saldo"] if j.get("tipo") == "contagem" else -abs(q)
        if li["saldo"] + delta < 0:
            return jsonify(erro="Quantidade maior que o saldo"), 400
        d.execute("UPDATE lote_itens SET saldo=saldo+? WHERE id=?", (delta, li["id"]))
        d.execute("INSERT INTO movs (tipo,produto_id,lote_item_id,qtd,custo,obs,usuario,criado_em) VALUES (?,?,?,?,?,?,?,?)",
                  (j.get("tipo", "perda"), li["produto_id"], li["id"], delta, li["custo_unit"], j.get("obs", ""), eu(), agora()))
        registrar(f"estoque {j.get('tipo', 'perda')}", f"lote item {li['id']} {delta:+d}")
    d.commit()
    return jsonify(ok=True)


# ------------------------------------------------------------------ financeiro e painel
def periodo():
    de = request.args.get("de") or hoje()[:8] + "01"
    ate = request.args.get("ate") or hoje()
    return de, ate


@app.get("/api/painel")
@exige("relatorios", "financeiro")
def painel():
    d = db()
    de, ate = periodo()
    a = (de, ate)
    base = "FROM pedidos WHERE status!='cancelado' AND substr(criado_em,1,10) BETWEEN ? AND ?"
    v = one(d.execute(f"SELECT COUNT(*) n, COALESCE(SUM(total),0) total, COALESCE(SUM(frete),0) frete {base}", a))
    dias = max(1, (datetime.strptime(ate, "%Y-%m-%d") - datetime.strptime(de, "%Y-%m-%d")).days + 1)
    de_ant = mais_dias(de, -dias); ate_ant = mais_dias(de, -1)
    ant = d.execute(f"SELECT COALESCE(SUM(total),0) {base}", (de_ant, ate_ant)).fetchone()[0]
    un = d.execute(f"""SELECT COALESCE(SUM(i.qtd),0) FROM pedido_itens i JOIN pedidos p ON p.id=i.pedido_id
        WHERE p.status!='cancelado' AND substr(p.criado_em,1,10) BETWEEN ? AND ?""", a).fetchone()[0]
    cmv = -(d.execute("SELECT COALESCE(SUM(qtd*custo),0) FROM movs WHERE tipo IN ('venda','estorno') AND substr(criado_em,1,10) BETWEEN ? AND ?", a).fetchone()[0])
    canal = rows(d.execute(f"SELECT canal, COUNT(*) n, SUM(total) total {base} GROUP BY canal ORDER BY total DESC", a))
    produto = rows(d.execute("""SELECT pr.nome, SUM(i.qtd) qtd, SUM(i.total) total FROM pedido_itens i JOIN pedidos p ON p.id=i.pedido_id
        JOIN produtos pr ON pr.id=i.produto_id WHERE p.status!='cancelado' AND substr(p.criado_em,1,10) BETWEEN ? AND ?
        GROUP BY pr.id ORDER BY total DESC""", a))
    clientes = rows(d.execute("""SELECT c.nome, COUNT(*) n, SUM(p.total) total FROM pedidos p JOIN clientes c ON c.id=p.cliente_id
        WHERE p.status!='cancelado' AND substr(p.criado_em,1,10) BETWEEN ? AND ? GROUP BY c.id ORDER BY total DESC LIMIT 8""", a))
    rota = rows(d.execute("""SELECT COALESCE(r.nome,'Sem rota') nome, COUNT(*) n, SUM(p.total) total FROM pedidos p LEFT JOIN rotas r ON r.id=p.rota_id
        WHERE p.status!='cancelado' AND substr(p.criado_em,1,10) BETWEEN ? AND ? GROUP BY p.rota_id ORDER BY total DESC""", a))
    dia = rows(d.execute(f"SELECT substr(criado_em,1,10) dia, SUM(total) total {base} GROUP BY dia ORDER BY dia", a))
    receber_ = one(d.execute("""SELECT COALESCE(SUM(total-pago),0) total, COALESCE(SUM(CASE WHEN vencimento<? THEN total-pago END),0) vencido,
        COUNT(CASE WHEN vencimento<? THEN 1 END) n_vencidos FROM pedidos WHERE status!='cancelado' AND total-pago>0.009""", (hoje(), hoje())))
    recebido = d.execute("SELECT COALESCE(SUM(valor),0) FROM recebimentos WHERE data BETWEEN ? AND ?", a).fetchone()[0]
    estoque = rows(d.execute("SELECT id, nome, minimo FROM produtos WHERE ativo=1 ORDER BY ordem"))
    for p in estoque:
        p["saldo"] = saldo_produto(p["id"])
        vend30 = d.execute("""SELECT COALESCE(SUM(i.qtd),0) FROM pedido_itens i JOIN pedidos pe ON pe.id=i.pedido_id
            WHERE i.produto_id=? AND pe.status!='cancelado' AND pe.criado_em>=?""", (p["id"], mais_dias(hoje(), -30))).fetchone()[0]
        p["dias"] = round(p["saldo"] / (vend30 / 30), 0) if vend30 else None
    alertas = []
    for l in d.execute("""SELECT l.id, l.codigo, l.validade, SUM(li.saldo) saldo FROM lotes l JOIN lote_itens li ON li.lote_id=l.id
        GROUP BY l.id HAVING saldo>0 AND validade<=? ORDER BY validade""", (mais_dias(hoje(), 60),)):
        dd = (datetime.strptime(l["validade"], "%Y-%m-%d") - datetime.strptime(hoje(), "%Y-%m-%d")).days
        alertas.append({"tipo": "lote", "nivel": "bad" if dd <= 30 else "warn", "texto": f"Lote {l['codigo']} vence em {dd} dias", "extra": f"{l['saldo']} un"})
    for i in d.execute("SELECT nome, estoque, minimo, unidade FROM insumos WHERE ativo=1 AND estoque<=minimo"):
        alertas.append({"tipo": "insumo", "nivel": "bad", "texto": f"{i['nome']} abaixo do mínimo", "extra": f"{i['estoque']:g} {i['unidade']}"})
    for p in estoque:
        if p["minimo"] and p["saldo"] <= p["minimo"]:
            alertas.append({"tipo": "produto", "nivel": "warn", "texto": f"{p['nome']}: estoque baixo", "extra": f"{p['saldo']} un"})
    for c in d.execute("""SELECT c.nome, SUM(p.total-p.pago) v, MIN(p.vencimento) venc FROM pedidos p JOIN clientes c ON c.id=p.cliente_id
        WHERE p.status!='cancelado' AND p.total-p.pago>0.009 AND p.vencimento<? GROUP BY c.id ORDER BY v DESC LIMIT 4""", (hoje(),)):
        dd = (datetime.strptime(hoje(), "%Y-%m-%d") - datetime.strptime(c["venc"], "%Y-%m-%d")).days
        alertas.append({"tipo": "cobranca", "nivel": "bad", "texto": f"{c['nome']}: {brl(c['v'])} vencido há {dd} dias", "extra": "cobrar"})
    a_entregar = d.execute("SELECT COUNT(*) FROM pedidos WHERE status IN ('novo','separando','em_rota')").fetchone()[0]
    return jsonify(de=de, ate=ate, vendas=round(v["total"], 2), pedidos=v["n"], frete=round(v["frete"], 2), unidades=un,
                   variacao=round((v["total"] - ant) / ant * 100, 1) if ant else None, cmv=round(cmv, 2),
                   ticket=round(v["total"] / v["n"], 2) if v["n"] else 0, canal=canal, produto=produto, clientes=clientes, rota=rota,
                   dia=dia, receber=receber_, recebido=round(recebido, 2), estoque=estoque, alertas=alertas, a_entregar=a_entregar)


@app.get("/api/financeiro")
@exige("financeiro")
def financeiro():
    d = db()
    de, ate = periodo()
    receber_ = rows(d.execute("""SELECT p.id, p.numero, p.total, p.pago, p.total-p.pago aberto, p.vencimento, p.criado_em, p.condicao,
        c.id cliente_id, c.nome cliente, c.telefone FROM pedidos p LEFT JOIN clientes c ON c.id=p.cliente_id
        WHERE p.status!='cancelado' AND p.total-p.pago>0.009 ORDER BY p.vencimento""",))
    pagar = rows(d.execute("SELECT * FROM contas_pagar WHERE ativo=1 AND (pago_em IS NULL OR pago_em='' OR vencimento BETWEEN ? AND ?) ORDER BY (pago_em IS NOT NULL AND pago_em!=''), vencimento", (de, ate)))
    vendas = d.execute("SELECT COALESCE(SUM(total),0) FROM pedidos WHERE status!='cancelado' AND substr(criado_em,1,10) BETWEEN ? AND ?", (de, ate)).fetchone()[0]
    recebido = d.execute("SELECT COALESCE(SUM(valor),0) FROM recebimentos WHERE data BETWEEN ? AND ?", (de, ate)).fetchone()[0]
    cmv = -(d.execute("SELECT COALESCE(SUM(qtd*custo),0) FROM movs WHERE tipo IN ('venda','estorno') AND substr(criado_em,1,10) BETWEEN ? AND ?", (de, ate)).fetchone()[0])
    perdas = -(d.execute("SELECT COALESCE(SUM(qtd*custo),0) FROM movs WHERE tipo='perda' AND produto_id IS NOT NULL AND substr(criado_em,1,10) BETWEEN ? AND ?", (de, ate)).fetchone()[0])
    desp = rows(d.execute("SELECT categoria, SUM(valor) total FROM contas_pagar WHERE ativo=1 AND vencimento BETWEEN ? AND ? GROUP BY categoria ORDER BY total DESC", (de, ate)))
    td = sum(x["total"] for x in desp)
    formas = rows(d.execute("SELECT forma, SUM(valor) total FROM recebimentos WHERE data BETWEEN ? AND ? GROUP BY forma ORDER BY total DESC", (de, ate)))
    for r in receber_:
        r["aberto"] = round(r["aberto"], 2)
        r["dias"] = (datetime.strptime(hoje(), "%Y-%m-%d") - datetime.strptime(r["vencimento"], "%Y-%m-%d")).days
    return jsonify(de=de, ate=ate, receber=receber_, pagar=pagar, vendas=round(vendas, 2), recebido=round(recebido, 2), cmv=round(cmv, 2),
                   perdas=round(perdas, 2), despesas=desp, total_despesas=round(td, 2), lucro=round(vendas - cmv - perdas - td, 2), formas=formas)


@app.post("/api/contas/<int:cid>/pagar")
@exige("financeiro")
def conta_pagar(cid):
    desf = (request.json or {}).get("desfazer")
    db().execute("UPDATE contas_pagar SET pago_em=? WHERE id=?", (None if desf else hoje(), cid))
    registrar("conta paga" if not desf else "conta reaberta", cid)
    db().commit()
    return jsonify(ok=True)


@app.get("/api/relatorio.csv")
@exige("relatorios", "financeiro")
def relatorio_csv():
    de, ate = periodo()
    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";")
    w.writerow(["Pedido", "Data", "Cliente", "Canal", "Rota", "Status", "Produto", "Qtd", "Unit", "Total item", "Lotes", "Total pedido", "Pago", "Vencimento"])
    for (pid,) in db().execute("SELECT id FROM pedidos WHERE substr(criado_em,1,10) BETWEEN ? AND ? ORDER BY id", (de, ate)).fetchall():
        p = pedido_completo(pid)
        for i in p["itens"]:
            f = lambda v: f"{v:.2f}".replace(".", ",")
            w.writerow([p["numero"], p["criado_em"][:10], p["cliente"], CANAIS.get(p["canal"], p["canal"]), p["rota"] or "", p["status"],
                        i["descricao"], i["qtd"], f(i["unit"]), f(i["total"]), " ".join(l["codigo"] for l in i["lotes"]), f(p["total"]),
                        f(p["pago"]), p["vencimento"]])
    return Response("﻿" + buf.getvalue(), mimetype="text/csv",
                    headers={"Content-Disposition": f"attachment; filename=vendas_{de}_{ate}.csv"})


@app.get("/api/log")
@exige("equipe")
def log_lista():
    return jsonify(rows(db().execute("SELECT * FROM log ORDER BY id DESC LIMIT 300")))


# ------------------------------------------------------------------ entregador: posição em tempo real
@app.post("/api/posicao")
@exige("entregas")
def posicao():
    j = request.json or {}
    db().execute("INSERT OR REPLACE INTO posicoes VALUES (?,?,?,?)", (session["uid"], float(j["lat"]), float(j["lng"]), agora()))
    db().commit()
    return jsonify(ok=True)


@app.get("/api/mapa")
@exige("clientes", "rotas", "pedidos")
def mapa():
    d = db()
    lim = (agora_dt() - timedelta(minutes=30)).strftime("%Y-%m-%d %H:%M:%S")
    ents = rows(d.execute("SELECT p.*, u.nome FROM posicoes p JOIN usuarios u ON u.id=p.usuario_id WHERE p.em>=?", (lim,)))
    for e in ents:
        e["pedidos"] = rows(d.execute("""SELECT p.numero, c.nome, c.lat, c.lng, p.status FROM pedidos p JOIN clientes c ON c.id=p.cliente_id
            WHERE p.entregador_id=? AND (p.status='em_rota' OR (p.status='entregue' AND p.entregue_em>=?)) ORDER BY p.id""", (e["usuario_id"], hoje())))
    return jsonify(entregadores=ents, fazenda=[float(cfg_all().get("lat_fazenda") or 0), float(cfg_all().get("lng_fazenda") or 0)])


# ------------------------------------------------------------------ feira
@app.post("/api/feira/venda")
@exige("feira")
def feira_venda():
    """Venda rápida de feira. Aceita vendas feitas offline (com id local para não duplicar)."""
    j = request.json or {}
    d = db()
    loc = j.get("id_local", "")
    if loc and d.execute("SELECT 1 FROM pedidos WHERE obs LIKE ?", (f"%[{loc}]%",)).fetchone():
        return jsonify(ok=True, duplicado=True)
    dados = {"cliente_id": j.get("cliente_id"), "canal": "feira", "tabela_id": j.get("tabela_id") or cfg_all().get("tabela_feira") or 1,
             "itens": j.get("itens", []), "forma": j.get("forma", "dinheiro"), "pago_agora": True, "condicao": "vista",
             "obs": f"{j.get('evento', 'Feira')} [{loc}]", "criado_em": j.get("criado_em") or agora(), "frete": 0}
    try:
        pid = criar_pedido(dados, eu())
    except ValueError as e:
        d.rollback()
        return jsonify(erro=str(e)), 400
    d.execute("UPDATE pedidos SET status='entregue', entregue_em=? WHERE id=?", (dados["criado_em"], pid))
    d.commit()
    return jsonify(ok=True, id=pid)


# ------------------------------------------------------------------ área do cliente
def cliente_logado():
    cid = session.get("cli")
    return one(db().execute("SELECT * FROM clientes WHERE id=? AND ativo=1", (cid,))) if cid else None


@app.post("/api/c/codigo")
def c_codigo():
    tel = so_dig((request.json or {}).get("telefone"))
    d = db()
    c = one(d.execute("SELECT * FROM clientes WHERE telefone=? AND ativo=1", (tel,))) if len(tel) >= 10 else None
    if not c:
        return jsonify(erro="Telefone não encontrado. Fale com a Cajuína Dona Júlia pelo WhatsApp para se cadastrar."), 404
    cod = f"{random.randint(0, 999999):06d}"
    d.execute("INSERT OR REPLACE INTO codigos VALUES (?,?,?,0)", (tel, cod, (agora_dt() + timedelta(minutes=10)).strftime("%Y-%m-%d %H:%M:%S")))
    d.commit()
    cfg = cfg_all()
    out = {"ok": True, "nome": c["nome"].split(" ")[0]}
    if cfg.get("demo") == "1":
        out["codigo_demo"] = cod      # demonstração: mostra o código na tela
    elif cfg.get("wa_token"):
        try:
            I.wa_enviar_api(cfg["wa_token"], cfg.get("wa_phone_id"), tel, f"Seu código de acesso à Cajuína Dona Júlia: {cod}")
        except Exception as e:
            return jsonify(erro=f"Não foi possível enviar o código ({e})"), 500
    else:
        out["aviso"] = "Peça seu código à equipe pelo WhatsApp."
        out["whats_loja"] = cfg.get("whatsapp")
    return jsonify(out)


@app.post("/api/c/entrar")
def c_entrar():
    j = request.json or {}
    tel = so_dig(j.get("telefone"))
    d = db()
    r = one(d.execute("SELECT * FROM codigos WHERE telefone=?", (tel,)))
    if not r or r["expira"] < agora() or r["tentativas"] >= 5:
        return jsonify(erro="Código expirado. Peça um novo."), 400
    if str(j.get("codigo", "")).strip() != r["codigo"]:
        d.execute("UPDATE codigos SET tentativas=tentativas+1 WHERE telefone=?", (tel,)); d.commit()
        return jsonify(erro="Código incorreto"), 400
    c = one(d.execute("SELECT * FROM clientes WHERE telefone=? AND ativo=1", (tel,)))
    d.execute("DELETE FROM codigos WHERE telefone=?", (tel,)); d.commit()
    session.permanent = True
    session["cli"] = c["id"]
    return jsonify(ok=True)


@app.post("/api/c/codigo-equipe/<int:cid>")
@exige("clientes")
def c_codigo_equipe(cid):
    """A equipe gera o código e manda pelo WhatsApp (quando não há API de envio automático)."""
    d = db()
    c = one(d.execute("SELECT * FROM clientes WHERE id=?", (cid,)))
    cod = f"{random.randint(0, 999999):06d}"
    d.execute("INSERT OR REPLACE INTO codigos VALUES (?,?,?,0)", (c["telefone"], cod, (agora_dt() + timedelta(hours=24)).strftime("%Y-%m-%d %H:%M:%S")))
    d.commit()
    base = (cfg_all().get("url_publica") or request.host_url).rstrip("/")
    return jsonify(link=I.wa_link(c["telefone"], f"Olá, {c['nome']}! Seu código para entrar na área do cliente da Cajuína Dona Júlia é *{cod}*. Acesse: {base}/cliente"))


@app.post("/api/c/sair")
def c_sair():
    session.pop("cli", None)
    return jsonify(ok=True)


@app.get("/api/c/me")
def c_me():
    c = cliente_logado()
    if not c:
        return jsonify(None)
    d = db()
    cfg = cfg_all()
    ps = [pedido_completo(r[0]) for r in d.execute("SELECT id FROM pedidos WHERE cliente_id=? ORDER BY id DESC LIMIT 30", (c["id"],))]
    for p in ps:
        p.pop("canhoto", None)
        p["link"] = link_publico(p)
    tab = c["tabela_id"] or int(cfg.get("tabela_padrao") or 1)
    prods = rows(d.execute("SELECT id, nome, descricao, foto, un_caixa, unidade FROM produtos WHERE ativo=1 AND online=1 ORDER BY ordem"))
    for p in prods:
        p["preco"] = preco(tab, p["id"])
        p["disponivel"] = saldo_produto(p["id"]) > 0
    rota = one(d.execute("SELECT nome, dia, frete, frete_gratis_acima FROM rotas WHERE id=?", (c["rota_id"],))) if c["rota_id"] else None
    aberto = em_aberto_cliente(c["id"])
    pix = pix_payload(aberto, f"CLI{c['id']}") if aberto > 0.009 else ""
    ano = d.execute("SELECT COALESCE(SUM(total),0), COUNT(*) FROM pedidos WHERE cliente_id=? AND status!='cancelado' AND criado_em>=?",
                    (c["id"], hoje()[:4] + "-01-01")).fetchone()
    return jsonify(cliente={k: c[k] for k in ("id", "nome", "tipo", "telefone", "endereco", "bairro", "cidade", "prazo_dias")},
                   pedidos=ps, produtos=prods, rota=rota, aberto=aberto, pix=pix, qr=bool(pix and I.segno),
                   ano={"total": round(ano[0], 2), "n": ano[1]},
                   loja={k: cfg.get(k) for k in ("empresa", "slogan", "whatsapp", "telefones", "online_msg", "online_ativo", "online_minimo", "selo", "instagram")})


@app.post("/api/c/pedido")
def c_pedido():
    c = cliente_logado()
    if not c:
        return jsonify(erro="Entre novamente"), 401
    cfg = cfg_all()
    if cfg.get("online_ativo") != "1":
        return jsonify(erro="Pedidos online pausados no momento. Fale com a gente no WhatsApp."), 400
    j = request.json or {}
    dados = {"cliente_id": c["id"], "canal": "online", "itens": [{"produto_id": i["produto_id"], "qtd": i["qtd"]} for i in j.get("itens", [])],
             "obs": (j.get("obs") or "")[:300], "forma": j.get("forma", "pix")}
    sub = sum(int(i.get("qtd") or 0) * preco(c["tabela_id"] or 1, int(i["produto_id"])) for i in dados["itens"])
    if sub < float(cfg.get("online_minimo") or 0):
        return jsonify(erro=f"Pedido mínimo de {brl(float(cfg['online_minimo']))}"), 400
    try:
        pid = criar_pedido(dados, "Área do cliente")
    except ValueError as e:
        db().rollback()
        msg = str(e)
        if msg.startswith("Limite"):
            msg = "Este pedido passa do seu limite de compra a prazo. Pague os pedidos em aberto ou fale com a gente no WhatsApp."
        return jsonify(erro=msg), 400
    db().commit()
    return jsonify(pedido_completo(pid) | {"link": link_publico(pedido_completo(pid))})


# ------------------------------------------------------------------ config
@app.put("/api/config")
@exige("config")
def config_put():
    d = db()
    for k, v in (request.json or {}).items():
        if k in CONFIG_PADRAO or k in ("tabela_padrao", "tabela_feira", "custo_caju_kg", "wa_token", "wa_phone_id"):
            d.execute("INSERT OR REPLACE INTO config VALUES (?,?)", (k, str(v)))
    registrar("configurações alteradas")
    d.commit()
    return jsonify(cfg_all())


@app.post("/api/demo/limpar")
@exige("config")
def demo_limpar():
    """Apaga pedidos, clientes, lotes e lançamentos de demonstração para começar a usar de verdade."""
    if (request.json or {}).get("confirmar") != "APAGAR":
        return jsonify(erro="Digite APAGAR para confirmar"), 400
    fazer_backup("antes-limpar-demo")
    d = db()
    for t in ("pedidos", "pedido_itens", "pedido_lotes", "recebimentos", "clientes", "lotes", "lote_itens", "movs", "contas_pagar",
              "codigos", "posicoes", "log"):
        d.execute(f"DELETE FROM {t}")
    d.execute("UPDATE insumos SET estoque=0")
    d.execute("UPDATE config SET valor='0' WHERE chave='demo'")
    d.commit()
    return jsonify(ok=True)


# ------------------------------------------------------------------ backup
def fazer_backup(motivo="auto"):
    nome = f"cajuina_{agora_dt().strftime('%Y%m%d_%H%M%S')}_{motivo}.db"
    try:
        s = sqlite3.connect(DB_PATH); t = sqlite3.connect(os.path.join(BACKUPS, nome)); s.backup(t); t.close(); s.close()
        for velho in sorted(f for f in os.listdir(BACKUPS) if f.endswith(".db"))[:-40]:
            os.remove(os.path.join(BACKUPS, velho))
    except Exception as e:
        print("backup falhou:", e)
    return nome


@app.get("/api/backup")
@exige("config")
def backup_baixar():
    return send_from_directory(BACKUPS, fazer_backup("manual"), as_attachment=True)


def loop_backup():
    while True:
        time.sleep(12 * 3600)
        fazer_backup()


# ------------------------------------------------------------------ páginas
@app.get("/")
def index():
    return send_from_directory(app.static_folder, "index.html", max_age=0)


@app.get("/cliente")
def area_cliente():
    return send_from_directory(app.static_folder, "cliente.html", max_age=0)


@app.get("/sw.js")
def sw():
    return send_from_directory(app.static_folder, "sw.js", mimetype="application/javascript", max_age=0)


@app.get("/favicon.ico")
def favicon():
    return send_from_directory(app.static_folder, "icon-192.png")


# ------------------------------------------------------------------ inicialização + dados de demonstração
def init_db():
    con = sqlite3.connect(DB_PATH)
    con.execute("PRAGMA journal_mode=WAL")
    con.executescript(SCHEMA)
    for k, v in CONFIG_PADRAO.items():
        con.execute("INSERT OR IGNORE INTO config VALUES (?,?)", (k, v))
    vazio = con.execute("SELECT COUNT(*) FROM usuarios").fetchone()[0] == 0
    con.commit()
    con.close()
    if vazio:
        import demo
        with app.app_context():
            demo.popular(db(), os.environ.get("CAJU_DEMO", "1") == "1", sys.modules[__name__])
            db().commit()


init_db()

if __name__ == "__main__":
    fazer_backup("inicio")
    threading.Thread(target=loop_backup, daemon=True).start()
    print(f"Cajuína Dona Júlia rodando em http://localhost:{PORT}  ·  área do cliente: /cliente")
    try:
        from waitress import serve
        serve(app, host="0.0.0.0", port=PORT, threads=16)
    except ImportError:
        app.run(host="0.0.0.0", port=PORT, threaded=True)
