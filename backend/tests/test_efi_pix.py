import asyncio
import base64
import datetime as dt
import json
import unittest
from types import SimpleNamespace
from unittest import mock

import httpx
from fastapi import HTTPException
from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12, NoEncryption
from cryptography.x509.oid import NameOID

from app.config import get_settings
from app.deps import assinatura_ativa
from app.routers import assinaturas
from app.services import efi


def _p12_base64() -> str:
    chave = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    nome = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "teste-efi")])
    agora = dt.datetime.now(dt.timezone.utc)
    cert = (x509.CertificateBuilder().subject_name(nome).issuer_name(nome)
            .public_key(chave.public_key()).serial_number(1)
            .not_valid_before(agora).not_valid_after(agora + dt.timedelta(days=1))
            .sign(chave, hashes.SHA256()))
    return base64.b64encode(pkcs12.serialize_key_and_certificates(b"efi", chave, cert, None, NoEncryption())).decode()


class FakeDB:
    def __init__(self):
        self.commits = 0

    def commit(self):
        self.commits += 1


def _user(**kw):
    base = dict(id=1, nome="Admin", subscription_status="pending", subscription_gateway="efi",
                efi_pix_txid="a" * 32, subscription_current_period_end=None,
                created_at=dt.datetime(2020, 1, 1, tzinfo=dt.timezone.utc), asaas_subscription_id=None)
    base.update(kw)
    return SimpleNamespace(**base)


class EfiPixTests(unittest.TestCase):
    def setUp(self):
        s = get_settings()
        self._orig = {k: getattr(s, k) for k in (
            "efi_client_id", "efi_client_secret", "efi_pix_key", "efi_cert_base64",
            "efi_cert_path", "payments_enabled", "assinatura_valor")}
        s.efi_client_id, s.efi_client_secret, s.efi_pix_key = "id", "secret", "chave@pix.com"
        s.efi_cert_base64, s.payments_enabled, s.assinatura_valor = _p12_base64(), True, 2990
        efi._ssl_context, efi._token, efi._token_expira_em = None, None, 0.0

    def tearDown(self):
        s = get_settings()
        for k, v in self._orig.items():
            setattr(s, k, v)
        efi._ssl_context, efi._token = None, None

    def _mock_efi(self, handler):
        transport = httpx.MockTransport(handler)
        return mock.patch.object(
            efi, "_client",
            lambda: httpx.AsyncClient(base_url=efi.URL_HOMOLOGACAO, transport=transport))

    def test_certificado_p12_em_base64_vira_contexto_ssl(self):
        self.assertIsNotNone(efi._contexto_ssl())

    def test_cria_cobranca_e_devolve_qrcode_sem_prefixo(self):
        chamadas = []

        def handler(req: httpx.Request):
            chamadas.append((req.method, req.url.path))
            if req.url.path == "/oauth/token":
                self.assertTrue(req.headers["authorization"].startswith("Basic "))
                return httpx.Response(200, json={"access_token": "tok", "expires_in": 3600})
            self.assertEqual(req.headers["authorization"], "Bearer tok")
            if req.method == "PUT":
                corpo = json.loads(req.content)
                self.assertEqual(corpo["valor"]["original"], "29.90")
                self.assertEqual(corpo["chave"], "chave@pix.com")
                self.assertEqual(corpo["devedor"], {"cpf": "12345678909", "nome": "Admin"})
                return httpx.Response(201, json={"txid": "t" * 32, "status": "ATIVA", "loc": {"id": 7},
                                                 "pixCopiaECola": "000201copia"})
            return httpx.Response(200, json={"qrcode": "000201copia", "imagemQrcode": "data:image/png;base64,QUJD"})

        with self._mock_efi(handler):
            r = asyncio.run(efi.criar_cobranca_pix("t" * 32, 2990, "12345678909", "Admin", "Assinatura"))
        self.assertEqual(r["copia_e_cola"], "000201copia")
        self.assertEqual(r["qrcode_base64"], "QUJD")
        self.assertEqual(chamadas, [("POST", "/oauth/token"), ("PUT", "/v2/cob/" + "t" * 32), ("GET", "/v2/loc/7/qrcode")])

    def test_assinar_pix_responde_no_formato_da_tela(self):
        def handler(req):
            if req.url.path == "/oauth/token":
                return httpx.Response(200, json={"access_token": "tok"})
            if req.method == "PUT":
                txid = req.url.path.rsplit("/", 1)[-1]
                return httpx.Response(201, json={"txid": txid, "status": "ATIVA", "loc": {"id": 1}, "pixCopiaECola": "cc"})
            return httpx.Response(200, json={"imagemQrcode": "data:image/png;base64,IMG"})

        user, db = _user(subscription_status=None, subscription_gateway=None, efi_pix_txid=None), FakeDB()
        with self._mock_efi(handler):
            r = asyncio.run(assinaturas._assinar_pix_efi("12345678909", db, user))
        self.assertEqual(set(r), {"subscription_id", "billing_type", "payment_status", "invoice_url", "pix"})
        self.assertEqual(r["pix"]["payload"], "cc")
        self.assertEqual(r["pix"]["encoded_image"], "IMG")
        self.assertEqual(user.subscription_status, "pending")
        self.assertEqual(user.efi_pix_txid, r["subscription_id"])
        self.assertEqual(len(user.efi_pix_txid), 32)

    def test_confirma_so_cobranca_concluida_com_valor_certo(self):
        db = FakeDB()
        user = _user()
        cob = {"txid": user.efi_pix_txid, "status": "ATIVA"}
        self.assertFalse(assinaturas._confirmar_pix_efi(db, user, cob))
        cob = {"txid": user.efi_pix_txid, "status": "CONCLUIDA", "pix": [{"valor": "1.00"}]}
        self.assertFalse(assinaturas._confirmar_pix_efi(db, user, cob))
        cob = {"txid": "outro" + "b" * 27, "status": "CONCLUIDA", "pix": [{"valor": "29.90"}]}
        self.assertFalse(assinaturas._confirmar_pix_efi(db, user, cob))
        self.assertEqual(user.subscription_status, "pending")

        cob = {"txid": user.efi_pix_txid, "status": "CONCLUIDA", "pix": [{"valor": "29.90"}]}
        self.assertTrue(assinaturas._confirmar_pix_efi(db, user, cob))
        self.assertEqual(user.subscription_status, "active")
        self.assertGreater(user.subscription_current_period_end, dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=27))
        # Webhook repetido não estende de novo.
        fim = user.subscription_current_period_end
        self.assertFalse(assinaturas._confirmar_pix_efi(db, user, cob))
        self.assertEqual(user.subscription_current_period_end, fim)

    def test_pix_efi_vence_depois_do_mes_pago(self):
        ontem = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=1)
        self.assertFalse(assinatura_ativa(_user(subscription_status="active", subscription_current_period_end=ontem)))
        self.assertEqual(assinaturas._status_exibido(
            _user(subscription_status="active", subscription_current_period_end=ontem)), "overdue")
        # Assinatura recorrente da Asaas não expira por data.
        self.assertTrue(assinatura_ativa(_user(subscription_status="active", subscription_gateway="asaas",
                                               subscription_current_period_end=ontem)))

    def test_webhook_confere_na_efi_e_exige_token(self):
        get_settings().efi_webhook_token = "segredo"
        try:
            user = _user()

            class Query:
                def filter(self, *a):
                    return self

                def first(self):
                    return user

            db = FakeDB()
            db.query = lambda *a: Query()

            def req(token, corpo):
                scope = {"type": "http", "method": "POST", "path": "/", "headers": [],
                         "query_string": f"token={token}&ignorar=/pix".encode()}

                async def receive():
                    return {"type": "http.request", "body": json.dumps(corpo).encode()}
                from starlette.requests import Request
                return Request(scope, receive)

            with self.assertRaises(HTTPException):
                asyncio.run(assinaturas.webhook_efi(req("errado", {}), db))
            # Chamada de validação da Efí (sem "pix").
            self.assertEqual(asyncio.run(assinaturas.webhook_efi(req("segredo", {}), db))["resultados"], [])

            async def consultar(txid):
                return {"txid": txid, "status": "CONCLUIDA", "pix": [{"valor": "29.90"}]}
            with mock.patch.object(efi, "consultar_cobranca", consultar):
                r = asyncio.run(assinaturas.webhook_efi(
                    req("segredo", {"pix": [{"txid": user.efi_pix_txid, "valor": "29.90"}]}), db))
            self.assertTrue(r["resultados"][0]["ativou"])
            self.assertEqual(user.subscription_status, "active")
        finally:
            get_settings().efi_webhook_token = ""


if __name__ == "__main__":
    unittest.main()
