# Проверка оригинального учебного хаба

8 сентября 2026 года. Источник только для чтения: `Documents/family-health-hub-public`, подготовленная авторская копия healthtablo. В комплект включены hub.py, hubcore (без кешей и icns), requirements.txt, RULES.md, MIT LICENSE. Файлы перечислены явно в package-files.json; исходные SHA-256 записаны в PROVENANCE.md.

Не включены личная база, документы, входящие, demo_seed_husband, deploy и прежние инструкции. В комментарии Invitro очищен номер документа. Из баннера копии убрана ссылка на прежний личный сервер; добавлено пояснение, что хаб не ставит диагнозов и не назначает лечение. Бизнес-логика импорта, хранилища и доступа сохранена.

Новые файлы: START-HERE.md, AGENTS.md, study_check.py, tests/test_study.py. Проверка блокирует сетевые соединения, принудительно задаёт отдельные HUB_* и не перезаписывает существующий каталог.

RED: unittest до реализации — FAIL, study_check.py отсутствовал. GREEN: чистый `/tmp/neiroprofi-health-kit-venv`, Python 3.14.3, установка оригинального requirements.txt; `python -m unittest discover -s learning-kits/family-health-hub/tests -p test_study.py` — 2 теста прошли. Проверяются импорт двух точных значений, дедупликация, отказ перезаписать старую папку и безопасные пояснения интерфейса без прежнего адреса сервера.

Прямой `study_check.py --output /tmp/neiroprofi-health-study-preview` — PASS: 2 values preserved; duplicate blocked; no network. Исходный `hub.py serve --host 127.0.0.1 --port 58765` с тестовой HUB_DATA_DIR — HTTP 200, HTML «Семейный хаб здоровья». Процесс остановлен после проверки. Личная установка не запускалась и не менялась.

В новой PyMuPDF есть предупреждение о будущем удалении имени fitz; исходный код работает. Windows/Linux и OCR не проверялись. Медицинские заключения, точность всех парсеров и готовность к реальным чувствительным данным этой проверкой не утверждаются.
