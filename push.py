"""Web Push (notificações com o app fechado) sem dependências extras: VAPID + aes128gcm (RFC 8291/8292)."""
import base64, json, os, struct, time, threading
from urllib.parse import urlparse
import requests
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes, hmac, serialization
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature


def b64u(b):
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def ub64(s):
    s = s.encode() if isinstance(s, str) else s
    return base64.urlsafe_b64decode(s + b"=" * (-len(s) % 4))


def _hmac(key, data):
    h = hmac.HMAC(key, hashes.SHA256())
    h.update(data)
    return h.finalize()


def pub_bytes(priv):
    return priv.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)


def gerar_chaves():
    """Devolve (privada_b64u, publica_b64u)."""
    k = ec.generate_private_key(ec.SECP256R1())
    d = k.private_numbers().private_value.to_bytes(32, "big")
    return b64u(d), b64u(pub_bytes(k))


def _priv(priv_b64):
    return ec.derive_private_key(int.from_bytes(ub64(priv_b64), "big"), ec.SECP256R1())


def criptografar(payload: bytes, p256dh: str, auth: str):
    ua_pub = ub64(p256dh)
    auth_secret = ub64(auth)
    as_priv = ec.generate_private_key(ec.SECP256R1())
    as_pub = pub_bytes(as_priv)
    ua_key = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), ua_pub)
    ecdh = as_priv.exchange(ec.ECDH(), ua_key)
    prk_key = _hmac(auth_secret, ecdh)
    ikm = _hmac(prk_key, b"WebPush: info\x00" + ua_pub + as_pub + b"\x01")
    salt = os.urandom(16)
    prk = _hmac(salt, ikm)
    cek = _hmac(prk, b"Content-Encoding: aes128gcm\x00\x01")[:16]
    nonce = _hmac(prk, b"Content-Encoding: nonce\x00\x01")[:12]
    ct = AESGCM(cek).encrypt(nonce, payload + b"\x02", None)
    return salt + struct.pack("!IB", 4096, len(as_pub)) + as_pub + ct


def vapid_header(endpoint, priv_b64, pub_b64, contato):
    u = urlparse(endpoint)
    head = b64u(json.dumps({"typ": "JWT", "alg": "ES256"}).encode())
    body = b64u(json.dumps({"aud": f"{u.scheme}://{u.netloc}", "exp": int(time.time()) + 12 * 3600, "sub": contato}).encode())
    msg = f"{head}.{body}".encode()
    der = _priv(priv_b64).sign(msg, ec.ECDSA(hashes.SHA256()))
    r, s = decode_dss_signature(der)
    sig = b64u(r.to_bytes(32, "big") + s.to_bytes(32, "big"))
    return f"vapid t={head}.{body}.{sig}, k={pub_b64}"


def enviar(sub, dados: dict, priv_b64, pub_b64, contato="mailto:contato@cajuinadonajulia.com.br", ttl=86400):
    """Envia uma notificação. Retorna o status HTTP (410/404 = inscrição morta)."""
    corpo = criptografar(json.dumps(dados, ensure_ascii=False).encode(), sub["p256dh"], sub["auth"])
    h = {"Authorization": vapid_header(sub["endpoint"], priv_b64, pub_b64, contato),
         "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", "TTL": str(ttl), "Urgency": "high"}
    try:
        return requests.post(sub["endpoint"], data=corpo, headers=h, timeout=10).status_code
    except requests.RequestException:
        return 0


def em_segundo_plano(fn, *a):
    threading.Thread(target=fn, args=a, daemon=True).start()
