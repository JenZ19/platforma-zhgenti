# Аудит комплекта webinar-moderator-agent

## Состав

Источник: `/Users/jenniferzelenova/Desktop/Reloqueen/SUBMARINE маркетинг/webinar-moderator-bot`
(только чтение). Перенесены исходный `classifier.py` и очищенная выдержка FAQ-правил.
Также перенесён полный очищенный runtime наблюдателя, pipeline, Telegram-моста, scheduler,
сессии, конфига, FAQ и базы знаний. Хеши и различия записаны в `PROVENANCE.md`.

## TDD и проверка

Красный запуск до реализации:

```text
python3 -m unittest discover -s tests -p 'test_*.py'
Ran 2 tests
FAILED (errors=2)
ModuleNotFoundError: No module named 'study_check'
```

Зелёный запуск:

```text
python3 -m unittest discover -s tests -p 'test_*.py'
Ran 4 tests
OK
```

Компиляция:

```text
python3 -m py_compile study_check.py original_core/*.py
exit 0
```

Учебный запус:

```text
python3 study_check.py --json
mode: observe
network_calls: 0
live_integrations_started: false
```

Проверено: реакция и спам определяются исходной эвристикой; спорный вопрос без ключа
получает `other/fallback`; FAQ совпадает только при двух общих содержательных словах.

## Очистка и ограничения

По поиску в комплекте нет известных жёстко заданных личных ID или имён из `config.py`/`faq_store.py`.
Нет `.env`, баз, cookies/storage state, контактов, комнат, URL эфиров, школьной базы знаний и deploy.
`package-files.json` содержит 28 точных путей без глобов, кэшей, venv и runtime-результатов.
Живой вход закрыт явным флагом, а shell-секреты и родительские `.env` не читаются.
В `study_check.py` фактически заблокированы `socket.connect`, `connect_ex` и `create_connection`;
отдельный тест подтверждает отказ прямого TCP-подключения.

Живые GetCourse, Telegram, AI, webhook, polling и комнаты не проверены и не запускались. Комплект — безопасная
учебная копия ядра, а не готовый живой бот.
