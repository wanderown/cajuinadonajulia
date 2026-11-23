# -*- coding: utf-8 -*-
"""
Dados iniciais. A parte "base" (produtos, tabelas, rotas, insumos, equipe) vale pra usar de verdade.
A parte "demonstração" cria clientes, lotes, pedidos e contas FICTÍCIOS para apresentar o sistema.
Tudo pode ser apagado em Configurações → "Apagar dados de demonstração".
"""
import json, random
from datetime import datetime, timedelta

PRODUTOS = [  # nome, descrição, unidade, un_caixa, validade_dias, prefixo, foto, mínimo, ordem
    ("Cajuína 300ml", "Garrafa de vidro · tradicional de Valença do Piauí", "garrafa", 12, 365, "L", "/static/fotos/cajuina-300.jpg", 600, 1),
    ("Cajuína 500ml", "Garrafa de vidro · ideal pra família", "garrafa", 12, 365, "L", "/static/fotos/cajuina-500.jpg", 300, 2),
    ("Castanha de caju 200g", "Torrada e salgada · pote", "pote", 10, 180, "C", "/static/fotos/castanha.jpg", 40, 3),
    ("Doce de caju 400g", "Doce caseiro em calda · pote de vidro", "pote", 12, 240, "D", "/static/fotos/doce.jpg", 40, 4),
]
TABELAS = ["Varejo", "Revenda Teresina", "Revenda interior", "Hotéis e restaurantes", "Feira / evento"]
PRECOS = {  # produto -> preços por tabela (ilustrativos)
    1: [11.00, 7.50, 7.00, 8.00, 10.00],
    2: [15.00, 10.50, 10.00, 11.50, 14.00],
    3: [25.00, 18.00, 17.00, 19.00, 22.00],
    4: [18.00, 12.00, 11.50, 13.00, 16.00],
}
ROTAS = [  # nome, dia, frete, grátis acima, tabela, cor
    ("Teresina", "Sexta", 30.0, 600.0, 2, "#D7261E"),
    ("Picos", "Terça", 25.0, 500.0, 3, "#2759b5"),
    ("Oeiras", "Quinta", 20.0, 400.0, 3, "#7a2db5"),
    ("Valença e região", "Diária", 0.0, 0.0, 1, "#3E8E2F"),
]
CIDADES = {"Teresina": (-5.0892, -42.8019, 1), "Picos": (-7.0769, -41.4669, 2), "Oeiras": (-7.0247, -42.1311, 3),
           "Valença do Piauí": (-6.4069, -41.7458, 4)}
INSUMOS = [  # nome, unidade, estoque final, mínimo, custo
    ("Garrafa 300ml", "un", 3800, 1000, 1.10), ("Garrafa 500ml", "un", 1600, 500, 1.45), ("Tampa metálica", "un", 780, 1500, 0.12),
    ("Rótulo 300ml", "un", 4200, 1000, 0.18), ("Rótulo 500ml", "un", 900, 800, 0.22), ("Caixa de papelão (12 un)", "un", 320, 100, 2.80),
    ("Pote 200g (castanha)", "un", 260, 80, 0.90), ("Pote de vidro 400g (doce)", "un", 150, 80, 1.60),
    ("Castanha in natura", "kg", 85, 30, 32.00), ("Açúcar", "kg", 120, 40, 4.20),
]
FICHA = {1: [(1, 1), (3, 1), (4, 1), (6, 1 / 12)], 2: [(2, 1), (3, 1), (5, 1), (6, 1 / 12)],
         3: [(7, 1), (9, 0.2)], 4: [(8, 1), (10, 0.15)]}
EQUIPE = [  # nome, pin, papel, desconto_max, telefone
    ("Lira (dono)", "1234", "admin", 100, ""), ("Ana · vendas", "1111", "vendas", 5, ""), ("Zé · produção", "2222", "producao", 0, ""),
    ("João · entregas", "3333", "entregador", 0, ""), ("Caixa da feira", "4444", "feira", 0, ""),
]
# clientes FICTÍCIOS: nome, tipo, cidade, bairro, tabela, prazo, limite, perfil(frequência em dias, caixas min-max)
CLIENTES = [
    ("Empório Sertão Vivo", "revenda", "Teresina", "Centro", 2, 28, 9000, (7, 3, 7)),
    ("Supermercado Carnaúba", "revenda", "Teresina", "Jóquei", 2, 28, 6000, (10, 5, 10)),
    ("Hotel Chapada Azul", "revenda", "Teresina", "Ilhotas", 4, 21, 3000, (12, 3, 6)),
    ("Restaurante Sabor de Cajuí", "revenda", "Teresina", "Fátima", 4, 15, 2000, (9, 2, 5)),
    ("Café Mandacaru", "revenda", "Teresina", "São Cristóvão", 4, 15, 1500, (14, 1, 3)),
    ("Lanchonete Prato Cheio", "revenda", "Teresina", "Dirceu", 2, 14, 1200, (10, 1, 3)),
    ("Empório Raízes do Piauí", "revenda", "Teresina", "Horto", 2, 28, 3500, (14, 2, 5)),
    ("Mercearia São José", "revenda", "Picos", "Centro", 3, 21, 2500, (14, 3, 6)),
    ("Restaurante Serra Grande", "revenda", "Picos", "Junco", 3, 14, 1500, (16, 2, 4)),
    ("Empório Oeiras Colonial", "revenda", "Oeiras", "Centro Histórico", 3, 21, 2000, (18, 2, 5)),
    ("Mercadinho da Praça", "revenda", "Valença do Piauí", "Centro", 3, 7, 1000, (6, 1, 3)),
    ("Lanchonete Bom Gosto", "revenda", "Valença do Piauí", "Bairro Novo", 3, 7, 800, (8, 1, 2)),
    ("Maria Alves", "consumidor", "Valença do Piauí", "Centro", 1, 0, 0, (20, 0, 0)),
    ("João Pedro Sousa", "consumidor", "Teresina", "Morada do Sol", 1, 0, 0, (25, 0, 0)),
    ("Ana Paula Lima", "consumidor", "Teresina", "Santa Isabel", 1, 0, 0, (30, 0, 0)),
    ("Carlos Henrique Rocha", "consumidor", "Teresina", "Noivos", 1, 0, 0, (28, 0, 0)),
    ("Francisca Barros", "consumidor", "Valença do Piauí", "São José", 1, 0, 0, (18, 0, 0)),
    ("Raimundo Nonato Silva", "consumidor", "Picos", "Bomba", 1, 0, 0, (35, 0, 0)),
    ("Luciana Melo", "consumidor", "Teresina", "Ininga", 1, 0, 0, (40, 0, 0)),
    ("Buffet Festa Boa", "revenda", "Teresina", "Piçarra", 4, 0, 0, (45, 4, 10)),
]
RUAS = ["Rua Coelho Rodrigues", "Av. Frei Serafim", "Rua Areolino de Abreu", "Rua Senador Teodoro Pacheco", "Av. Nossa Senhora de Fátima",
        "Rua Riachuelo", "Av. Getúlio Vargas", "Rua São Pedro", "Rua 7 de Setembro", "Av. Presidente Kennedy"]


def popular(d, demo, A):
    rnd = random.Random(2026)
    for nome, pin, papel, desc, tel in EQUIPE:
        d.execute("INSERT INTO usuarios (nome,pin,papel,permissoes,desconto_max,telefone) VALUES (?,?,?,?,?,?)",
                  (nome, pin, papel, json.dumps(A.PAPEIS[papel]), desc, tel))
    for t in TABELAS:
        d.execute("INSERT INTO tabelas (nome) VALUES (?)", (t,))
    for p in PRODUTOS:
        d.execute("INSERT INTO produtos (nome,descricao,unidade,un_caixa,validade_dias,prefixo,foto,minimo,ordem) VALUES (?,?,?,?,?,?,?,?,?)", p)
    for pid, ps in PRECOS.items():
        for tid, v in enumerate(ps, start=1):
            d.execute("INSERT INTO precos VALUES (?,?,?)", (tid, pid, v))
    for r in ROTAS:
        d.execute("INSERT INTO rotas (nome,dia,frete,frete_gratis_acima,tabela_id,cor) VALUES (?,?,?,?,?,?)", r)
    for nome, un, est, mn, custo in INSUMOS:
        d.execute("INSERT INTO insumos (nome,unidade,estoque,minimo,custo) VALUES (?,?,?,?,?)", (nome, un, 999999, mn, custo))
    for pid, fs in FICHA.items():
        for ins, q in fs:
            d.execute("INSERT INTO ficha VALUES (?,?,?)", (pid, ins, q))
    extras = {"tabela_padrao": "1", "tabela_feira": "5", "custo_caju_kg": "2.50", "demo": "1" if demo else "0"}
    if demo:
        extras["pix_chave"] = "pix@cajuinadonajulia.exemplo"   # chave fictícia, só para mostrar o QR na demonstração
    for k, v in extras.items():
        d.execute("INSERT OR REPLACE INTO config VALUES (?,?)", (k, v))
    if not demo:
        for nome, un, est, mn, custo in INSUMOS:
            d.execute("UPDATE insumos SET estoque=0 WHERE nome=?", (nome,))
        return

    hoje = datetime.strptime(A.hoje(), "%Y-%m-%d")
    fmt = lambda dt: dt.strftime("%Y-%m-%d %H:%M:%S")

    # ---- clientes
    cids = []
    for i, (nome, tipo, cid_, bairro, tab, prazo, lim, perfil) in enumerate(CLIENTES):
        lat, lng, rota = CIDADES[cid_]
        lat += rnd.uniform(-0.035, 0.035); lng += rnd.uniform(-0.035, 0.035)
        tel = f"8690000{i + 1:04d}"
        doc = f"{rnd.randint(10, 99)}.{rnd.randint(100, 999)}.{rnd.randint(100, 999)}/0001-{rnd.randint(10, 99)}" if tipo == "revenda" else ""
        cur = d.execute("""INSERT INTO clientes (nome,tipo,documento,contato,telefone,endereco,bairro,cidade,lat,lng,rota_id,tabela_id,prazo_dias,
            limite,criado_em) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (nome, tipo, doc, "" if tipo == "consumidor" else rnd.choice(["Sr. Antônio", "Dona Rita", "Marcos", "Patrícia", "Seu Zé"]),
             tel, f"{rnd.choice(RUAS)}, {rnd.randint(20, 2400)}", bairro, cid_, round(lat, 5), round(lng, 5), rota, tab, prazo, lim,
             fmt(hoje - timedelta(days=rnd.randint(120, 600)))))
        cids.append((cur.lastrowid, nome, tipo, perfil, rota, prazo))

    # ---- lotes (produção) ao longo do ano
    def lote(dias_atras, q300, q500, cast=0, doce=0, kg=0):
        dt = hoje - timedelta(days=dias_atras)
        itens = [{"produto_id": 1, "qtd": q300}, {"produto_id": 2, "qtd": q500}]
        if cast: itens.append({"produto_id": 3, "qtd": cast})
        if doce: itens.append({"produto_id": 4, "qtd": doce})
        lid, cod = A.criar_lote({"data_fab": dt.strftime("%Y-%m-%d"), "caju_kg": kg or round((q300 * .3 + q500 * .5) * 1.45),
                                 "itens": itens, "outros_custos": round((q300 + q500) * 0.6, 2)}, "Zé · produção")
        d.execute("UPDATE movs SET criado_em=? WHERE criado_em>=? AND tipo IN ('producao','consumo') AND (obs=? OR lote_item_id IN (SELECT id FROM lote_itens WHERE lote_id=?))",
                  (fmt(dt), fmt(hoje - timedelta(days=1)), cod, lid))
        d.execute("UPDATE lotes SET criado_em=? WHERE id=?", (fmt(dt), lid))
        return lid
    lote(345, 1200, 400, 0, 0)         # lote antigo: vence em ~20 dias
    lote(230, 2400, 900, 0, 260)
    lote(130, 3000, 1100, 320, 0)
    lote(75, 3000, 1100, 360, 300)
    lote(40, 1600, 700, 260, 200)
    lote(12, 1500, 600, 240, 200)

    # ---- pedidos dos últimos 80 dias
    eventos = []
    for cid, nome, tipo, (freq, cmin, cmax), rota, prazo in cids:
        dia = rnd.randint(1, freq)
        while dia <= 80:
            eventos.append((80 - dia, cid, nome, tipo, cmin, cmax, rota, prazo))
            dia += max(3, int(freq * rnd.uniform(.7, 1.3)))
    eventos.sort(key=lambda e: -e[0])
    entregador = d.execute("SELECT id FROM usuarios WHERE papel='entregador'").fetchone()[0]
    for dias_atras, cid, nome, tipo, cmin, cmax, rota, prazo in eventos:
        dt = hoje - timedelta(days=dias_atras, hours=rnd.randint(-4, 5), minutes=rnd.randint(0, 59))
        dt = dt.replace(hour=max(7, min(19, dt.hour)))
        if tipo == "revenda":
            itens = [{"produto_id": 1, "qtd": 12 * rnd.randint(cmin, cmax)}]
            if rnd.random() < .7: itens.append({"produto_id": 2, "qtd": 12 * rnd.randint(1, max(1, cmax // 2))})
            if rnd.random() < .45: itens.append({"produto_id": 3, "qtd": 10 * rnd.randint(1, 2)})
            if rnd.random() < .35: itens.append({"produto_id": 4, "qtd": 12})
            canal = "revenda"
        else:
            itens = [{"produto_id": rnd.choice([1, 2]), "qtd": rnd.choice([6, 12, 12, 24])}]
            if rnd.random() < .4: itens.append({"produto_id": rnd.choice([3, 4]), "qtd": rnd.randint(1, 3)})
            canal = rnd.choice(["encomenda", "whatsapp", "online", "encomenda"])
        try:
            pid = A.criar_pedido({"cliente_id": cid, "canal": canal, "itens": itens, "criado_em": fmt(dt), "ignorar_limite": True,
                                  "forma": rnd.choice(["pix", "pix", "pix", "boleto", "dinheiro"]) if tipo == "revenda" else rnd.choice(["pix", "dinheiro"])},
                                 rnd.choice(["Ana · vendas", "Lira (dono)"]) if canal != "online" else "Área do cliente", permite_preco=False)
        except ValueError:
            continue
        p = d.execute("SELECT * FROM pedidos WHERE id=?", (pid,)).fetchone()
        d.execute("UPDATE movs SET criado_em=? WHERE pedido_id=?", (fmt(dt), pid))
        sep, saiu, ent = dt + timedelta(hours=20), dt + timedelta(days=1, hours=8), dt + timedelta(days=1, hours=rnd.randint(9, 16))
        if dias_atras >= 3 or (dias_atras >= 2 and rnd.random() < .5):
            d.execute("UPDATE pedidos SET status='entregue', separado_em=?, saiu_em=?, entregue_em=?, entregador_id=? WHERE id=?",
                      (fmt(sep), fmt(saiu), fmt(ent), entregador if rota != 4 else None, pid))
            venc = datetime.strptime(p["vencimento"], "%Y-%m-%d")
            atrasado = nome in ("Lanchonete Prato Cheio", "Restaurante Serra Grande") and dias_atras < 40
            if p["condicao"] == "vista":
                A.receber(pid, p["total"], p["forma"], "João · entregas", ent.strftime("%Y-%m-%d"))
            elif venc <= hoje and not atrasado:
                A.receber(pid, p["total"], p["forma"], "Lira (dono)", min(hoje, venc + timedelta(days=rnd.randint(-3, 4))).strftime("%Y-%m-%d"))
        elif dias_atras >= 1:
            d.execute("UPDATE pedidos SET status='em_rota', separado_em=?, saiu_em=?, entregador_id=? WHERE id=?",
                      (fmt(sep), fmt(hoje.replace(hour=8, minute=5)), entregador, pid))
        elif rnd.random() < .5:
            d.execute("UPDATE pedidos SET status='separando', separado_em=? WHERE id=?", (fmt(dt + timedelta(hours=2)), pid))
    # alguns cancelados
    for (pid,) in d.execute("SELECT id FROM pedidos WHERE status='entregue' AND pago=0 AND condicao='vista' ORDER BY RANDOM() LIMIT 2").fetchall():
        A.devolver(pid, "Lira (dono)")
        d.execute("UPDATE pedidos SET status='cancelado', cancelado_em=criado_em, cancel_motivo='Cliente desistiu' WHERE id=?", (pid,))

    # ---- pedidos novos de hoje (pra mostrar o quadro)
    for nome_cli, canal, itens, h in [("Empório Sertão Vivo", "revenda", [{"produto_id": 1, "qtd": 72}, {"produto_id": 2, "qtd": 24}, {"produto_id": 3, "qtd": 10}], 8),
                                      ("Carlos Henrique Rocha", "online", [{"produto_id": 2, "qtd": 6}, {"produto_id": 4, "qtd": 2}], 9),
                                      ("Hotel Chapada Azul", "whatsapp", [{"produto_id": 1, "qtd": 48}], 10),
                                      ("Maria Alves", "encomenda", [{"produto_id": 1, "qtd": 24}], 11)]:
        cid = d.execute("SELECT id FROM clientes WHERE nome=?", (nome_cli,)).fetchone()[0]
        dt = hoje.replace(hour=h, minute=rnd.randint(0, 59))
        pid = A.criar_pedido({"cliente_id": cid, "canal": canal, "itens": itens, "criado_em": fmt(dt), "ignorar_limite": True,
                              "obs": "Casamento dia 29 — entregar gelada se possível" if nome_cli == "Maria Alves" else ""},
                             "Área do cliente" if canal == "online" else "Ana · vendas")
        d.execute("UPDATE movs SET criado_em=? WHERE pedido_id=?", (fmt(dt), pid))

    # ---- feiras / festivais
    for dias_atras, evento, n in [(52, "Festival da Cajuína", 46), (24, "Feira de artesanato · Riverside", 28)]:
        for k in range(n):
            dt = hoje - timedelta(days=dias_atras, hours=-rnd.randint(9, 20), minutes=-rnd.randint(0, 59))
            itens = [{"produto_id": rnd.choice([1, 1, 2]), "qtd": rnd.choice([1, 1, 2, 3, 6])}]
            if rnd.random() < .3: itens.append({"produto_id": rnd.choice([3, 4]), "qtd": 1})
            try:
                pid = A.criar_pedido({"canal": "feira", "tabela_id": 5, "itens": itens, "criado_em": fmt(dt), "pago_agora": True, "frete": 0,
                                      "forma": rnd.choice(["pix", "pix", "dinheiro", "credito", "debito"]), "obs": evento}, "Caixa da feira")
            except ValueError:
                continue
            d.execute("UPDATE pedidos SET status='entregue', entregue_em=criado_em WHERE id=?", (pid,))
            d.execute("UPDATE movs SET criado_em=? WHERE pedido_id=?", (fmt(dt), pid))

    # ---- perdas e estoque de insumos final
    li = d.execute("SELECT li.id, li.produto_id, li.custo_unit FROM lote_itens li JOIN lotes l ON l.id=li.lote_id WHERE li.saldo>20 AND li.produto_id=1 ORDER BY l.validade LIMIT 1").fetchone()
    if li:
        d.execute("UPDATE lote_itens SET saldo=saldo-14 WHERE id=?", (li["id"],))
        d.execute("INSERT INTO movs (tipo,produto_id,lote_item_id,qtd,custo,obs,usuario,criado_em) VALUES ('perda',?,?,?,?,?,?,?)",
                  (li["produto_id"], li["id"], -14, li["custo_unit"], "Garrafas quebradas no transporte", "Zé · produção", fmt(hoje - timedelta(days=9))))
    for nome, un, est, mn, custo in INSUMOS:
        d.execute("UPDATE insumos SET estoque=? WHERE nome=?", (est, nome))
    # sobra do lote antigo (para mostrar o alerta de validade)
    li = d.execute("SELECT li.id, li.custo_unit FROM lote_itens li JOIN lotes l ON l.id=li.lote_id WHERE li.produto_id=1 ORDER BY l.validade LIMIT 1").fetchone()
    d.execute("UPDATE lote_itens SET saldo=saldo+96 WHERE id=?", (li["id"],))
    d.execute("INSERT INTO movs (tipo,produto_id,lote_item_id,qtd,custo,obs,usuario,criado_em) VALUES ('contagem',1,?,96,?,?,?,?)",
              (li["id"], li["custo_unit"], "Contagem: caixas encontradas no depósito", "Zé · produção", fmt(hoje - timedelta(days=6))))

    # ---- contas a pagar (despesas mensais)
    fixas = [("Salários e diárias", "Funcionários", 5200, 5), ("Energia da fábrica", "Energia", 980, 10), ("Combustível das rotas", "Logística", 1350, 15),
             ("Contador", "Administrativo", 650, 20), ("Internet e telefone", "Administrativo", 180, 12), ("Manutenção de equipamentos", "Manutenção", 420, 25)]
    for m in range(3, -2, -1):
        base = (hoje.replace(day=1) - timedelta(days=1)).replace(day=1) if m == 1 else hoje.replace(day=1)
        mes = hoje.replace(day=1)
        for _ in range(m):
            mes = (mes - timedelta(days=1)).replace(day=1)
        if m < 0:
            mes = (hoje.replace(day=28) + timedelta(days=5)).replace(day=1)
        for desc, cat, val, dia in fixas:
            venc = mes.replace(day=dia)
            v = round(val * rnd.uniform(.92, 1.08), 2)
            pago = venc.strftime("%Y-%m-%d") if venc < hoje - timedelta(days=2) else None
            d.execute("INSERT INTO contas_pagar (descricao,categoria,valor,vencimento,pago_em) VALUES (?,?,?,?,?)", (desc, cat, v, venc.strftime("%Y-%m-%d"), pago))
    d.execute("INSERT INTO contas_pagar (descricao,categoria,valor,vencimento,pago_em) VALUES (?,?,?,?,?)",
              ("Estande Festival da Cajuína", "Eventos", 850, (hoje - timedelta(days=55)).strftime("%Y-%m-%d"), (hoje - timedelta(days=55)).strftime("%Y-%m-%d")))

    # ---- entregador na rua (posição de demonstração) e histórico
    lat, lng, _ = CIDADES["Teresina"]
    d.execute("INSERT OR REPLACE INTO posicoes VALUES (?,?,?,?)", (entregador, lat + .012, lng + .02, fmt(datetime.strptime(A.agora(), "%Y-%m-%d %H:%M:%S"))))
    for u, a in [("Lira (dono)", "login"), ("Ana · vendas", "pedido criado"), ("Zé · produção", "lote produzido"), ("João · entregas", "pedido entregue")]:
        d.execute("INSERT INTO log (usuario,acao,detalhe,criado_em) VALUES (?,?,?,?)", (u, a, "demonstração", A.agora()))

    # ---- comprovantes de entrega: foto simulada do espelho assinado nas entregas recentes
    try:
        comprovantes_demo(d, A)
    except Exception as e:
        print("demo comprovantes:", e)


def comprovantes_demo(d, A):
    import os, math
    from PIL import Image, ImageDraw, ImageFont
    os.makedirs(A.COMPROV, exist_ok=True)
    nomes = ["Maria", "Seu Antônio", "Carla (gerente)", "Josué", "Dona Rita", "Paulo (caixa)"]
    try:
        fb = ImageFont.truetype("DejaVuSans-Bold.ttf", 30); fn = ImageFont.truetype("DejaVuSans.ttf", 22)
    except Exception:
        fb = fn = ImageFont.load_default()
    rnd = random.Random(7)
    ps = d.execute("""SELECT p.id, p.numero, p.total, p.entregue_em, c.nome, c.contato FROM pedidos p LEFT JOIN clientes c ON c.id=p.cliente_id
                      WHERE p.status='entregue' AND p.cliente_id IS NOT NULL ORDER BY p.id DESC""").fetchall()
    for k, p in enumerate(ps):
        quem = (p["contato"] or rnd.choice(nomes)).split(" ")[0] if k % 3 else rnd.choice(nomes)
        if k >= 12:   # entregas antigas: só o nome de quem recebeu
            d.execute("UPDATE pedidos SET recebido_por=?, comprovante_em=entregue_em, comprovante_por='João · entregas' WHERE id=?", (quem, p["id"]))
            continue
        W, H = 900, 1200
        im = Image.new("RGB", (W, H), (246, 242, 232))
        g = ImageDraw.Draw(im)
        g.rectangle([0, 0, W, 22], fill=(246, 180, 0))
        g.text((50, 60), "CAJUÍNA DONA JÚLIA", font=fb, fill=(43, 27, 20))
        g.text((560, 60), f"Nº {p['numero']:04d}", font=fb, fill=(43, 27, 20))
        g.text((50, 110), "ESPELHO DE PEDIDO", font=fn, fill=(215, 38, 30))
        g.line([50, 150, W - 50, 150], fill=(43, 27, 20), width=3)
        g.text((50, 180), f"Cliente: {p['nome']}", font=fn, fill=(60, 50, 40))
        g.rectangle([50, 240, W - 50, 280], fill=(43, 27, 20))
        for i in range(4):
            y = 300 + i * 50
            g.line([60, y + 20, 60 + rnd.randint(250, 420), y + 20], fill=(120, 110, 100), width=6)
            g.line([W - 220, y + 20, W - 70, y + 20], fill=(120, 110, 100), width=6)
        g.text((W - 330, 560), f"TOTAL R$ {p['total']:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."), font=fb, fill=(43, 27, 20))
        for x0 in (50, 470):
            g.line([x0, 930, x0 + 380, 930], fill=(150, 140, 130), width=2)
        g.text((50, 940), "Recebido por (nome legível)", font=fn, fill=(120, 110, 100))
        g.text((470, 940), "Assinatura", font=fn, fill=(120, 110, 100))
        g.text((70, 870), quem, font=fb, fill=(25, 45, 120))
        pts, x = [], 490
        for t in range(90):          # rabisco de assinatura
            x += rnd.uniform(2, 5)
            pts.append((x, 900 + 22 * math.sin(t / 3.2 + rnd.uniform(-.4, .4)) - t * .15))
        g.line(pts, fill=(25, 45, 120), width=4)
        dt = (p["entregue_em"] or A.agora())[:10]
        g.text((50, 1000), f"Data: {dt[8:10]}/{dt[5:7]}/{dt[:4]}", font=fn, fill=(25, 45, 120))
        im = im.rotate(rnd.uniform(-3, 3), expand=True, fillcolor=(90, 70, 55)).resize((750, 1000))
        im.save(os.path.join(A.COMPROV, f"{p['id']}.jpg"), quality=70)
        d.execute("UPDATE pedidos SET canhoto='arquivo', recebido_por=?, comprovante_em=entregue_em, comprovante_por='João · entregas' WHERE id=?", (quem, p["id"]))
