# -*- coding: utf-8 -*-
"""
Integrações externas do sistema Delli Pizzas.
Todas precisam de internet e de credenciais configuradas em Cardápio & Config → Integrações.
Nenhuma delas é necessária para o sistema funcionar: sem credenciais, ficam desligadas.
"""
import io, json, uuid, unicodedata, time
from urllib.parse import quote

try:
    import requests
except ImportError:  # pragma: no cover
    requests = None

try:
    import segno  # gerador de QR Code (pip install segno)
except ImportError:
    segno = None

TIMEOUT = 15


class IntegracaoErro(Exception):
    pass


def _req():
    if requests is None:
        raise IntegracaoErro("Biblioteca 'requests' não instalada")
    return requests


def _sem_acento(s, n=None):
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode()
    return s[:n] if n else s


# ======================================================================= PIX estático (BR Code)
def _crc16(payload: str) -> str:
    crc = 0xFFFF
    for ch in payload.encode():
        crc ^= ch << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) if crc & 0x8000 else (crc << 1)
            crc &= 0xFFFF
    return f"{crc:04X}"


def _tlv(id_, valor):
    return f"{id_}{len(valor):02d}{valor}"


def pix_copia_e_cola(chave, nome, cidade, valor=None, txid="***", descricao=""):
    """Gera o código Pix 'copia e cola' (padrão BR Code do Banco Central). Funciona offline."""
    if not chave:
        raise IntegracaoErro("Configure a chave Pix da loja")
    conta = _tlv("00", "br.gov.bcb.pix") + _tlv("01", chave.strip())
    if descricao:
        conta += _tlv("02", _sem_acento(descricao, 40))
    p = _tlv("00", "01") + _tlv("26", conta) + _tlv("52", "0000") + _tlv("53", "986")
    if valor:
        p += _tlv("54", f"{float(valor):.2f}")
    p += _tlv("58", "BR") + _tlv("59", _sem_acento(nome or "LOJA", 25).upper()) + _tlv("60", _sem_acento(cidade or "CIDADE", 15).upper())
    txid = "".join(c for c in _sem_acento(txid) if c.isalnum())[:25] or "***"
    p += _tlv("62", _tlv("05", txid))
    p += "6304"
    return p + _crc16(p)


def qr_png(texto, escala=6):
    """PNG de QR Code. Retorna bytes ou None se a biblioteca segno não estiver instalada."""
    if segno is None:
        return None
    buf = io.BytesIO()
    segno.make(texto, error="m").save(buf, kind="png", scale=escala, border=2)
    return buf.getvalue()


# ======================================================================= Mercado Pago (Pix com confirmação automática)
MP_URL = "https://api.mercadopago.com"


def mp_criar_pix(token, valor, descricao, email="cliente@pagamento.com", ref=None, notificacao_url=None):
    r = _req()
    body = {
        "transaction_amount": round(float(valor), 2),
        "description": descricao[:60],
        "payment_method_id": "pix",
        "payer": {"email": email or "cliente@pagamento.com"},
        "date_of_expiration": time.strftime("%Y-%m-%dT%H:%M:%S.000-03:00", time.localtime(time.time() + 30 * 60)),
    }
    if ref:
        body["external_reference"] = str(ref)
    if notificacao_url:
        body["notification_url"] = notificacao_url
    resp = r.post(f"{MP_URL}/v1/payments", json=body, timeout=TIMEOUT,
                  headers={"Authorization": f"Bearer {token}", "X-Idempotency-Key": str(uuid.uuid4())})
    if resp.status_code >= 300:
        raise IntegracaoErro(f"Mercado Pago recusou: {resp.text[:200]}")
    j = resp.json()
    td = (j.get("point_of_interaction") or {}).get("transaction_data") or {}
    return {"id": str(j["id"]), "status": j.get("status"), "copia_cola": td.get("qr_code"),
            "qr_base64": td.get("qr_code_base64"), "ticket_url": td.get("ticket_url")}


def mp_status(token, pagamento_id):
    resp = _req().get(f"{MP_URL}/v1/payments/{pagamento_id}", timeout=TIMEOUT,
                      headers={"Authorization": f"Bearer {token}"})
    if resp.status_code >= 300:
        raise IntegracaoErro(f"Mercado Pago: {resp.text[:200]}")
    j = resp.json()
    return {"id": str(j["id"]), "status": j.get("status"), "valor": j.get("transaction_amount"),
            "ref": j.get("external_reference")}


# ======================================================================= WhatsApp
def wa_numero(tel):
    t = "".join(c for c in str(tel or "") if c.isdigit())
    if len(t) in (10, 11):
        t = "55" + t
    return t


def wa_link(tel, mensagem):
    return f"https://wa.me/{wa_numero(tel)}?text={quote(mensagem)}"


def wa_enviar_api(token, phone_id, tel, mensagem):
    """WhatsApp Cloud API (Meta). Mensagem de texto livre só é entregue se o cliente
    falou com a loja nas últimas 24h (é o caso de quem pediu pelo link do WhatsApp)."""
    resp = _req().post(f"https://graph.facebook.com/v20.0/{phone_id}/messages", timeout=TIMEOUT,
                       headers={"Authorization": f"Bearer {token}"},
                       json={"messaging_product": "whatsapp", "to": wa_numero(tel), "type": "text",
                             "text": {"body": mensagem}})
    if resp.status_code >= 300:
        raise IntegracaoErro(f"WhatsApp: {resp.text[:200]}")
    return True


def montar_mensagem(modelo, p, cfg):
    dados = {
        "nome": (p.get("cliente_nome") or "").split(" ")[0] or "cliente",
        "numero": p.get("numero"), "total": f"R$ {p.get('total', 0):.2f}".replace(".", ","),
        "loja": cfg.get("loja_nome", ""), "tempo": cfg.get("tempo_estimado", ""),
        "link": (cfg.get("nuvem_url") or "").rstrip("/") + f"/acompanhar/{p.get('uuid')}" if cfg.get("nuvem_url") else "",
    }
    try:
        return modelo.format(**dados)
    except (KeyError, IndexError, ValueError):
        return modelo


# ======================================================================= NFC-e (Focus NFe)
FOCUS = {"homologacao": "https://homologacao.focusnfe.com.br", "producao": "https://api.focusnfe.com.br"}
TPAG = {"dinheiro": "01", "credito": "03", "debito": "04", "pix": "17", "ifood": "99", "outro": "99"}


def nfce_payload(p, cfg):
    """Monta o JSON da NFC-e. Tributação padrão de Simples Nacional (CSOSN 102) — VALIDAR COM O CONTADOR."""
    itens = []
    total_itens = sum(i["total"] for i in p["itens"]) or 1
    desc_rest = round(p.get("desconto") or 0, 2)
    outras_rest = round(p.get("taxa_entrega") or 0, 2)
    for n, i in enumerate(p["itens"], start=1):
        ultimo = n == len(p["itens"])
        desc = desc_rest if ultimo else round((p.get("desconto") or 0) * i["total"] / total_itens, 2)
        outras = outras_rest if ultimo else round((p.get("taxa_entrega") or 0) * i["total"] / total_itens, 2)
        desc_rest = round(desc_rest - desc, 2); outras_rest = round(outras_rest - outras, 2)
        ncm = i.get("ncm") or (cfg.get("ncm_pizza") if i["tipo"] == "pizza" else cfg.get("ncm_padrao")) or "19059090"
        it = {
            "numero_item": n, "codigo_produto": str(i.get("codigo") or n),
            "descricao": _sem_acento(f"{i['descricao']} {i.get('detalhe') or ''}".strip(), 120),
            "cfop": cfg.get("nfce_cfop") or "5102", "unidade_comercial": "UN", "quantidade_comercial": i["qtd"],
            "valor_unitario_comercial": round(i["unitario"], 2), "valor_bruto": round(i["total"], 2),
            "unidade_tributavel": "UN", "quantidade_tributavel": i["qtd"],
            "valor_unitario_tributavel": round(i["unitario"], 2), "codigo_ncm": ncm.replace(".", ""),
            "icms_origem": "0", "icms_situacao_tributaria": cfg.get("nfce_csosn") or "102",
            "pis_situacao_tributaria": cfg.get("nfce_pis_cst") or "49",
            "cofins_situacao_tributaria": cfg.get("nfce_cofins_cst") or "49",
        }
        if desc > 0:
            it["valor_desconto"] = desc
        if outras > 0:
            it["valor_outras_despesas"] = outras
        itens.append(it)
    formas = [{"forma_pagamento": TPAG.get(pg["forma"], "99"), "valor_pagamento": round(pg["valor"], 2)}
              for pg in p.get("pagamentos", []) if pg["valor"] > 0] or [{"forma_pagamento": "01", "valor_pagamento": round(p["total"], 2)}]
    body = {
        "cnpj_emitente": "".join(c for c in cfg.get("nfce_cnpj", "") if c.isdigit()),
        "data_emissao": time.strftime("%Y-%m-%dT%H:%M:%S-03:00"),
        "natureza_operacao": "VENDA AO CONSUMIDOR", "presenca_comprador": "4" if p.get("tipo") == "entrega" else "1",
        "modalidade_frete": "9", "local_destino": "1", "items": itens, "formas_pagamento": formas,
    }
    cpf = "".join(c for c in str(p.get("cpf") or "") if c.isdigit())
    if len(cpf) == 11:
        body["cpf_destinatario"] = cpf
    return body


def nfce_emitir(cfg, p, ref):
    amb = cfg.get("nfce_ambiente") or "homologacao"
    resp = _req().post(f"{FOCUS[amb]}/v2/nfce?ref={ref}", json=nfce_payload(p, cfg),
                       auth=(cfg.get("nfce_token", ""), ""), timeout=30)
    j = resp.json() if resp.content else {}
    if resp.status_code >= 300 and j.get("status") not in ("autorizado", "processando_autorizacao"):
        raise IntegracaoErro(j.get("mensagem") or j.get("mensagem_sefaz") or resp.text[:200])
    base = FOCUS[amb]
    return {"status": j.get("status"), "chave": j.get("chave_nfe"), "numero": j.get("numero"),
            "danfe": base + j["caminho_danfe"] if j.get("caminho_danfe") else "",
            "qrcode": j.get("qrcode_url"), "mensagem": j.get("mensagem_sefaz") or j.get("mensagem")}


def nfce_cancelar(cfg, ref, justificativa):
    amb = cfg.get("nfce_ambiente") or "homologacao"
    resp = _req().delete(f"{FOCUS[amb]}/v2/nfce/{ref}", json={"justificativa": justificativa[:255]},
                         auth=(cfg.get("nfce_token", ""), ""), timeout=30)
    j = resp.json() if resp.content else {}
    if resp.status_code >= 300:
        raise IntegracaoErro(j.get("mensagem") or resp.text[:200])
    return j.get("status")


# ======================================================================= iFood (Merchant API) — EXPERIMENTAL
IFOOD = "https://merchant-api.ifood.com.br"


class IFood:
    """Cliente mínimo da API de pedidos do iFood. Exige app homologado no Portal do Desenvolvedor."""

    def __init__(self, client_id, secret, merchant_id):
        self.cid, self.sec, self.mid = client_id, secret, merchant_id
        self._tok, self._exp = None, 0

    def token(self):
        if self._tok and time.time() < self._exp - 60:
            return self._tok
        resp = _req().post(f"{IFOOD}/authentication/v1.0/oauth/token", timeout=TIMEOUT,
                           data={"grantType": "client_credentials", "clientId": self.cid, "clientSecret": self.sec})
        if resp.status_code >= 300:
            raise IntegracaoErro(f"iFood auth: {resp.text[:200]}")
        j = resp.json()
        self._tok, self._exp = j["accessToken"], time.time() + int(j.get("expiresIn", 3600))
        return self._tok

    def _h(self):
        return {"Authorization": f"Bearer {self.token()}"}

    def eventos(self):
        resp = _req().get(f"{IFOOD}/events/v1.0/events:polling", timeout=TIMEOUT,
                          headers={**self._h(), "x-polling-merchants": self.mid})
        if resp.status_code == 204:
            return []
        if resp.status_code >= 300:
            raise IntegracaoErro(f"iFood eventos: {resp.text[:200]}")
        return resp.json()

    def ack(self, ids):
        if ids:
            _req().post(f"{IFOOD}/events/v1.0/events/acknowledgment", json=[{"id": i} for i in ids],
                        headers=self._h(), timeout=TIMEOUT)

    def pedido(self, order_id):
        resp = _req().get(f"{IFOOD}/order/v1.0/orders/{order_id}", headers=self._h(), timeout=TIMEOUT)
        if resp.status_code >= 300:
            raise IntegracaoErro(f"iFood pedido: {resp.text[:200]}")
        return resp.json()

    def acao(self, order_id, acao):
        """acao: confirm | startPreparation | readyToPickup | dispatch"""
        resp = _req().post(f"{IFOOD}/order/v1.0/orders/{order_id}/{acao}", headers=self._h(), timeout=TIMEOUT)
        if resp.status_code >= 300:
            raise IntegracaoErro(f"iFood {acao}: {resp.text[:200]}")
        return True


def ifood_converter(o):
    """Converte o pedido do iFood para o formato interno."""
    itens = []
    for it in o.get("items", []):
        det = ", ".join(f"{op.get('quantity', 1)}x {op.get('name')}" for op in it.get("options") or [])
        itens.append({"tipo": "externo", "descricao": it.get("name", "Item iFood"), "detalhe": det,
                      "qtd": int(it.get("quantity", 1)), "unitario": float(it.get("totalPrice", 0)) / max(1, int(it.get("quantity", 1))),
                      "obs": it.get("observations") or ""})
    cust = o.get("customer") or {}
    tel = (cust.get("phone") or {})
    end = (o.get("delivery") or {}).get("deliveryAddress") or {}
    total = o.get("total") or {}
    pago_online = any(m.get("prepaid") for m in (o.get("payments") or {}).get("methods", []))
    entrega = o.get("orderType") == "DELIVERY"
    return {
        "ifood_id": o["id"], "tipo": "entrega" if entrega else "retirada", "canal": "ifood",
        "cliente": {"nome": cust.get("name", ""), "telefone": "", "endereco": end.get("formattedAddress", ""),
                    "complemento": end.get("complement", ""), "referencia": end.get("reference", "")},
        "bairro": end.get("neighborhood", ""), "taxa_entrega": float(total.get("deliveryFee") or 0),
        "desconto": float(total.get("benefits") or 0), "itens": itens, "pago_online": pago_online,
        "total": float(total.get("orderAmount") or 0),
        "obs": f"iFood #{o.get('displayId', '')} · localizador {tel.get('localizer', '')}".strip(),
    }
