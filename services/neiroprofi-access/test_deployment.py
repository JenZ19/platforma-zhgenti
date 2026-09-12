import unittest
import json
import struct
from pathlib import Path

HERE = Path(__file__).parent


class DeploymentTests(unittest.TestCase):
    def test_home_screen_identity_on_login_and_course(self):
        ui = (HERE / 'ui.html').read_text()
        layout = (HERE.parents[1] / 'app/layout.tsx').read_text()
        self.assertIn('name="apple-mobile-web-app-title" content="Нейропрофи"', ui)
        self.assertIn('rel="apple-touch-icon"', ui)
        self.assertIn('/kurs1/app-icons/iskra-180.png', ui)
        self.assertIn('title: "Нейропрофи"', layout)
        self.assertIn('apple: "/app-icons/iskra-180.png"', layout)
        self.assertIn('manifest: "/manifest.webmanifest"', layout)

    def test_manifest_and_icon_sizes(self):
        public = HERE.parents[1] / 'public'
        manifest = json.loads((public / 'manifest.webmanifest').read_text())
        self.assertEqual(manifest['name'], 'Нейропрофи')
        self.assertEqual(manifest['short_name'], 'Нейропрофи')
        self.assertEqual(manifest['start_url'], './?format=mobile')
        self.assertEqual(manifest['scope'], './')
        self.assertEqual(manifest['display'], 'standalone')
        for size in [180, 192, 512]:
            raw = (public / f'app-icons/iskra-{size}.png').read_bytes()
            self.assertEqual(raw[:8], b'\x89PNG\r\n\x1a\n')
            self.assertEqual(struct.unpack('>II', raw[16:24]), (size, size))

    def test_only_install_assets_are_public(self):
        conf = (HERE / 'ezhgenti-kurs1.conf').read_text()
        for asset in ['manifest.webmanifest', 'app-icons/iskra-180.png', 'app-icons/iskra-192.png', 'app-icons/iskra-512.png']:
            self.assertIn(f'location = /kurs1/{asset}', conf)
            self.assertIn(f'alias /var/www/ezhgenti.ru/kurs1-current/{asset};', conf)
        self.assertIn('auth_request /_neiroprofi_auth;', conf)

    def test_gate_uses_external_redirect_not_internal_302_body(self):
        conf = (HERE / 'ezhgenti-kurs1.conf').read_text()
        self.assertIn('error_page 401 = @neiroprofi_login;', conf)
        self.assertIn('return 302 /kurs1/login;', conf)
        self.assertIn('auth_request /_neiroprofi_auth;', conf)
        self.assertIn('internal;', conf)

    def test_course_has_account_link(self):
        source = (HERE.parents[1] / 'app/components/LearningShell.tsx').read_text()
        self.assertIn('href="/kurs1/account"', source)
        self.assertIn('Мой доступ', source)
        self.assertIn('learning-account-mobile', source)

    def test_ui_safe_text_and_no_third_party_scripts(self):
        ui = (HERE / 'ui.html').read_text()
        self.assertNotIn('innerHTML', ui)
        self.assertNotIn('<script src="https:', ui)
        self.assertIn('textContent', ui)


if __name__ == '__main__':
    unittest.main()
