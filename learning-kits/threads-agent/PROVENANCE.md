# Происхождение

Источник прочитан только для копирования:

`Desktop/Reloqueen/threads-agent` (авторская рабочая копия)

Снимок git: `a58d924b37b27e057e01a3819cc7738f85a25ef2`.

## Разрешённое ядро

| Файл | SHA-256 источника | Что изменено |
|---|---|---|
| `compose.py` | `bed298a4161f05f999dac10156bd2dfccd8f1e8a7685ac9fdf386e82653ae03d` | Из примера атрибуции удалено имя реального коллеги; логика не менялась. SHA-256 копии: `e122a93ece124e95d24fbe8666b534a0af9f30206564235292f4e0d7321ea077`. |
| `kb.py` | `39ff21ffa238590ca6a364871f7163293fdad932609dafc7e0cd0ccb3c274d32` | Только комментарий миграции: удалены реальные хендлы; логика не менялась. SHA-256 копии: `1de0c40060f264adcd723fc102d90adcb7ae0432dde5e8eb58e5f33f1bf884ec`. |
| `config.py` | `2791ee9bbb3a4a6de3ce21be86d50a2b6cd06f31faddd92483637585ac1b962c` | Очищен список доверенных личных хендлов; добавлены `ALLOW_LIVE_MODE` и fail-closed `OWNER_USER_ID`; конфиг читает только локальный `.env` и не разрешает вынести базу за пределы комплекта. SHA-256 копии: `c9e088105044e4b2bd9f5ea875bdf4c01f9ee919fec8c8fa8b4ca4c6bb5f1c69`. |
| `bot.py` | `f290be960797558f9fe7f925c0ee4847fd0a74fa420a65c1d7864d4f41f4d38c` | Добавлен стоп до сети без `ALLOW_LIVE_MODE` и единая owner-only middleware без исключений для всех messages/callbacks. Она сравнивает user ID автора, а не chat ID группы. SHA-256 копии: `b6f967e32ca8b322de10c16a7514bc16c20d4a3754e597f4f290d560ba5499ae`. |
| `generate.py` | `8c4736dbde8e58fa6131a59f6457da4278b1e74849b2506a49ba46d4b35b1ca6` | Добавлен стоп до сети, если `ALLOW_LIVE_MODE` не включён. SHA-256 копии: `e843fce00e04bd19535cce255198c1032c8f3d69901aedc3a07a03d0db4f94bc`. |
| `ingest.py` | `52256e53222a0e991d59741db241c0f078f548a2b8794f197b7bb3593c83cab3` | Без изменений; хеш копии совпадает. |
| `llm.py` | `246d4921c008c48fd1a34abe8f35c5caf90c8fd824dc598d55806358024c3838` | Без изменений; хеш копии совпадает. |
| `pipeline.py` | `9852e34b697a5eb3021d95315cbd6dc3e47be6dd4e2c76584328127975c2a1c3` | Без изменений; хеш копии совпадает. |
| `requirements.txt` | `2589a5a442d486b1b3c679cf30c99fc568287e284bef8ffae5b176bb4e8b93de` | Без изменений; хеш копии совпадает. |

## Новые учебные файлы

`study_check.py`, `tests/test_study.py`, `channels.yml`, `sources.yml`, `.env.example`, `.gitignore`, `requirements-dev.txt`, `START-HERE.md`, `AGENTS.md` и `package-files.json` созданы для этого комплекта. Все факты, голос и канал в них вымышлены.

## Исключено

`.env`, SQLite-базы, логи, кэши, deploy, systemd, личные docs, боевые `channels.yml`/`sources.yml` и seed личных фактов не копировались. Сетевые модули есть, но до явного live opt-in останавливаются до любого сетевого действия.
