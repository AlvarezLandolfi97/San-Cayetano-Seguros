import importlib
import os
from django.core.cache import caches
from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase, override_settings

import seguros.settings as project_settings


def _reload_settings():
    return importlib.reload(project_settings)


class SettingsSecurityTests(SimpleTestCase):
    def setUp(self):
        self._env_backup = os.environ.copy()

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self._env_backup)
        _reload_settings()

    def _prepare_common_env(self, production=True):
        os.environ["DJANGO_ENV"] = "production" if production else "development"
        os.environ["DJANGO_ALLOWED_HOSTS"] = "example.com"
        os.environ["FRONTEND_ORIGINS"] = "https://app.example.com"
        os.environ["DJANGO_DEBUG"] = "False" if production else "True"
        os.environ["DJANGO_SKIP_DOTENV"] = "true"

    def test_missing_secret_key_blocks_production_start(self):
        self._prepare_common_env()
        os.environ.pop("DJANGO_SECRET_KEY", None)
        os.environ.pop("SECRET_KEY", None)
        with self.assertRaises(ImproperlyConfigured):
            _reload_settings()

    def test_debug_allowed_without_secret_in_dev(self):
        self._prepare_common_env(production=False)
        os.environ.pop("DJANGO_SECRET_KEY", None)
        os.environ.pop("SECRET_KEY", None)
        settings = _reload_settings()
        self.assertTrue(settings.DEBUG)
        self.assertEqual(settings.SECRET_KEY, "dev-secret-key-change-me")


class CacheConfigurationTests(SimpleTestCase):
    def test_build_cache_settings_uses_redis_when_url_supplied(self):
        config = project_settings.build_cache_settings("redis://example:6379/1", True)
        redis_config = config["default"]
        self.assertEqual(redis_config["BACKEND"], "django_redis.cache.RedisCache")
        self.assertEqual(redis_config["LOCATION"], "redis://example:6379/1")

    def test_build_cache_settings_requires_url_in_production(self):
        with self.assertRaises(ImproperlyConfigured):
            project_settings.build_cache_settings("", False)

    def test_locmem_cache_set_get_works(self):
        locmem_config = project_settings.build_cache_settings(None, True)
        with override_settings(CACHES=locmem_config):
            cache_backend = caches["default"]
            cache_backend.set("ping", "pong", timeout=2)
            self.assertEqual(cache_backend.get("ping"), "pong")
