import unittest
from types import SimpleNamespace
from urllib.parse import parse_qs, urlparse
from unittest.mock import patch

from app.services.google_auth import get_google_auth_url


class GoogleAuthTests(unittest.TestCase):
    @patch("app.services.google_auth.get_settings")
    def test_get_google_auth_url_encodes_redirect_uri_and_state(self, mock_get_settings):
        mock_get_settings.return_value = SimpleNamespace(google_client_id="client-123")

        url = get_google_auth_url(
            "https://app.quemjoga.com/callback?next=/home",
            "state com espaco",
        )
        parsed = urlparse(url)
        query = parse_qs(parsed.query)

        self.assertEqual(parsed.netloc, "accounts.google.com")
        self.assertEqual(query["client_id"], ["client-123"])
        self.assertEqual(
            query["redirect_uri"],
            ["https://app.quemjoga.com/callback?next=/home"],
        )
        self.assertEqual(query["state"], ["state com espaco"])
        self.assertEqual(query["scope"], ["openid email profile"])

    @patch("app.services.google_auth.get_settings")
    def test_get_google_auth_url_omits_state_when_not_provided(self, mock_get_settings):
        mock_get_settings.return_value = SimpleNamespace(google_client_id="client-123")

        url = get_google_auth_url("https://app.quemjoga.com/callback")
        query = parse_qs(urlparse(url).query)

        self.assertNotIn("state", query)
