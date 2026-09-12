# Происхождение

Источник прочитан только для копирования:
`SUBMARINE маркетинг/webinar-moderator-bot` (авторская рабочая копия).
Рабочий бот не изменялся и не запускался.

## Разрешённый исходник

- `original_core/classifier.py` — байт-в-байт копия `classifier.py`.
  SHA-256 источника и копии:
  `71b8d7f04657575dfee08e6b47275e7e649facfe2619f9396f43b0a2de5d622a`.
- `original_core/faq_rules.py` — очищенная выдержка из `faq_store.py`: нормализация,
  Жаккарово сходство и правило минимум двух общих содержательных слов.
  SHA-256 полного файла-источника: `fb65605bf5e409ceec94652137efe1c004cf900db5b7e95d06d6ef81781ac42f`.
  SHA-256 учебной выдержки: `d43d7c937dc02784fd33709a9717d253c0b777a2fd29c00d25a579731f60fd4d`.

## Учебные добавления

`study_check.py`, вымышленные `examples/*.json`, тесты, инструкции и пустой `.env.example`.
Учебный harness всегда передаёт классификатору пустой API-ключ, поэтому переменные окружения
из рабочих ботов не подхватываются.

Добавлен полный runtime оригинала: `bot.py`, `config.py`, `contacts.py`, `context.py`,
`faq_store.py`, `knowledge.py`, `pipeline.py`, `responder.py`, `scheduler.py`, `session.py`, `tg_bridge.py`,
`watcher.py`. Безопасные изменения: удалены школьные имена/ID и карта продуктов;
`OWNER_ID` по умолчанию равен 0; `.env` читается только из `original_core/`; живой runtime закрыт
явным флагом `ENABLE_LIVE_INTEGRATIONS=I_UNDERSTAND`; `webinars.yaml` и шаблоны пусты; селекторы
очищены от домена, комнаты и операционных комментариев.

Хеши `source / kit` для runtime-файлов:

```text
bot.py        a0d9e533aa5d03f0ea29cd23e9f0734d3da8977e185e45630f0488fd9748fdd0 / 4c458d3231ce3753d775797f90f3b080da61f548467f4fef4b96f49cf758295c
config.py     f463efa477f7069a33e790b36655992a3a8bdbd539d26cbb3b7f02e5fa56c730 / 89353984ecdff4ae2d9a1f269e97d7a0071376c50d4c4b42d76e6aa7b7a77d73
contacts.py   7487c91e762fc5835d521c906ef74dc342ad3f9ef12022bce005d53774040a83 / 7487c91e762fc5835d521c906ef74dc342ad3f9ef12022bce005d53774040a83
context.py    c93f2d4060bcebd18650870cc44d0b99182b743fd643fb63bb50bd8e3dbb2de8 / de9445d53ff0590324ce55784e63fb768dfffaf4e7171ecc84725f6bc71e7565
faq_store.py  fb65605bf5e409ceec94652137efe1c004cf900db5b7e95d06d6ef81781ac42f / f570059b834943582e245ede1e9a5afcc3818e4c95bc9c86575aea7d6065b52a
knowledge.py  cfb88202b1dbd49f49a8211544767a3eecfea76a074366a65230be3860fdf29f / cfb88202b1dbd49f49a8211544767a3eecfea76a074366a65230be3860fdf29f
pipeline.py   217ac70e050e80e8c3290ee6b9acda0e07717e15657690f9aaef0a7771c4f8d4 / 217ac70e050e80e8c3290ee6b9acda0e07717e15657690f9aaef0a7771c4f8d4
responder.py  69b16cf0549d74971e5642c119c169d885221368cddac8f0ab20b77f469135fe / 69b16cf0549d74971e5642c119c169d885221368cddac8f0ab20b77f469135fe
scheduler.py  0cfc2c74c8e26dde2be2896116a71d567335fa602f033c928a495d64d871fb1e / 0cfc2c74c8e26dde2be2896116a71d567335fa602f033c928a495d64d871fb1e
session.py    bcae678d27699f83af320f61990cb0b9d3178b4b92eb7baa8d67ff15ccc5e146 / 0b78d7198b9db0a785dcdd7df69a5f479c400ec6a3d61197468a34927df5b9fc
tg_bridge.py  59b74deedf24be823ea69f3358140e7e470bbc1b8d8cba8c43ce75acb09f1fef / 59b74deedf24be823ea69f3358140e7e470bbc1b8d8cba8c43ce75acb09f1fef
watcher.py    7bf342d6fa2faeb89d4104e28bf415065dec5759eaab6f65b6173381b28bb221 / 7bf342d6fa2faeb89d4104e28bf415065dec5759eaab6f65b6173381b28bb221
selectors.yaml 805d067e942dac331606ba22f52bea41dc04a691d7a274ecaffd4a6b676cc8a5 / f07821b1bcd419f4b1a905579e24bf0152431e0e7c39d0a9146e5b535eeb65d7
```

## Что исключено

`.env`, база данных, storage state/cookies, журналы, реальные контакты, знания школы,
комнаты и URL, production deploy/launchd, кэши, venv и приватные документы.
