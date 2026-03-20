import unittest
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.config import get_settings
from app.services.auth import (
    create_password_reset_token,
    hash_password,
    verify_password,
    verify_password_reset_token,
)


class AuthServiceTests(unittest.TestCase):
    def test_hash_and_verify_support_passwords_longer_than_bcrypt_limit(self):
        password = "senha-super-segura-" + ("abc123" * 20)

        hashed_password = hash_password(password)

        self.assertNotEqual(hashed_password, password)
        self.assertTrue(verify_password(password, hashed_password))
        self.assertFalse(verify_password(f"{password}x", hashed_password))

    def test_password_reset_token_roundtrip_preserves_user_id_and_pwd_marker(self):
        senha_hash = "hash-prefix-reset-marker-1234567890"

        token = create_password_reset_token(42, senha_hash)

        user_id, pwd_marker = verify_password_reset_token(token)

        self.assertEqual(user_id, 42)
        self.assertEqual(pwd_marker, senha_hash[-12:])

    def test_password_reset_token_rejects_tokens_with_wrong_type(self):
        settings = get_settings()
        invalid_token = jwt.encode(
            {
                "sub": "42",
                "type": "access",
                "pwd": "marker-123456",
                "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
            },
            settings.secret_key,
            algorithm=settings.algorithm,
        )

        with self.assertRaises(JWTError):
            verify_password_reset_token(invalid_token)
