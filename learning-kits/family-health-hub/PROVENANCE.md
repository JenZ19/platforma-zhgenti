# Источник учебной копии

Версия комплекта: 2026-09-08.1.

Основа: авторский healthtablo, локальная подготовленная публичная копия family-health-hub-public. Лицензия оригинала сохранена в LICENSE.

Оригинальные hub.py и hubcore сохранены. Безопасные изменения: номер документа в примере комментария invitro.py заменён на нули; из base.html удалена ссылка на прежний приватный сервер и добавлено постоянное пояснение, что хаб не ставит диагнозов и не назначает лечение. Не включены deploy, личная база, inbox, demo_seed_husband.py, рабочие журналы и старые инструкции. Добавлены учебная проверка, инструкции и тест. Учебный PDF генерируется из явно вымышленных строк, а импорт и дедупликацию выполняет исходный код.

Проверен Python 3.14.3 / macOS: чистое venv, установка requirements, study_check, импорт двух значений и повторного PDF, открытие HTTP-интерфейса. Windows/Linux и OCR в этой проверке не запускались. Это не медицинская валидация всех парсеров.

## SHA-256 исходных файлов до адаптации

```json
{
  "LICENSE": "07cd5af457ae4f90a72bb8d6b9d02b0c9adb06d4abdf4be1add6ec59da82a65f",
  "RULES.md": "9ff5e54ebf0ffcba8407284b7fdc08c200ee8294bb72680ce94899ae3d0ae2d0",
  "hub.py": "07c5d543d0b463a56857147f308b4f1d16a6c0ac58442eb22b54b3c48f938e03",
  "hubcore/__init__.py": "e1c4028a2c7ebe318a19379eaa48f58469b93ece3c5e937fd19a86006d8d064f",
  "hubcore/analytes.py": "b0691b4ffadbeef3cc4b3b9909ac7e94c37b96b5a30797bc0792b3a3301b941c",
  "hubcore/auth.py": "5a89b7268d502602db5c913476bc2901f2d2374e2d4aac82948d09055a9b128b",
  "hubcore/db.py": "acea8551722aedce8872a0c171e03ece4828ba9ad30e57f5b0ad2542f163c4d5",
  "hubcore/ingest.py": "0fa3d0bef670043b1db15fe6b095be5e8682964c5cda2170a6690dbb9310e7d8",
  "hubcore/ocr.py": "a6b0ddf399a4f57c35c016b34345ff01ed2ea2bcec4326333176f969240f504c",
  "hubcore/parsers/__init__.py": "acf3cab6f5b88123e4ae8d8e4f6b37089909230c8dc14e6a3be3dcb095f50407",
  "hubcore/parsers/base.py": "e3d5ef0d50fd24f9ac4ac55b38761a58d8ace33beae8f11f735e16b49963a523",
  "hubcore/parsers/cgemo.py": "6004a0719b9467ac485be88cefc61c6825136758396da528f241c73cbd073c7c",
  "hubcore/parsers/femoflor.py": "c611643ebcdd3941bd6674ffa2a9df00269b3afb9fd5ce0f3671e5d4738c1e28",
  "hubcore/parsers/gemotest.py": "64a8242f7960f998367e439494846830594f8f8f52833edc551676170381575f",
  "hubcore/parsers/inovalys.py": "feed4d372c72998f673f04a73ce9ae40ac39d8e523917bcf7779a17c05c52d9f",
  "hubcore/parsers/invitro.py": "57ddd6fbdf7d836bf14cbc2fc430b269b87d622a2b79d5287c0576dddaba8296",
  "hubcore/parsers/pervyj_doctor.py": "fad20e5438051664a508f6358a64eeb377b43557ce8d018975ea00bdcc6ee51f",
  "hubcore/parsers/prescription.py": "4dce966e477e9f0925e23b34e3217c43d7a6d9b61a0e950762f498f228c52a2e",
  "hubcore/parsers/smclinic.py": "2f3240fd34da2826c0a599c49cd1189bd85f64f45df1ff69665af7ff432611e4",
  "hubcore/parsers/smclinic_diag.py": "d76094894beab2e33935b67b3ac076505061c5734c934ce20906a2596943322c",
  "hubcore/parsers/tabular.py": "399334af69027c139be8baef5dfb84f8e5d279abe785c0a6f5e7c7364ca3a821",
  "hubcore/parsers/vet.py": "bd13d1633542f4c0dc51e549e72aa4ae7184356ad253ac583205e10d8cc1d1d5",
  "hubcore/push.py": "aaee4a9a51768ae47f49ce8cbfff130d8b2207c65a4dae2aba73f2d024168012",
  "hubcore/reminders.py": "50291cecf32d3b7072a4341aebfaf0d6ef2ee33bd39c20670343faae1bea0166",
  "hubcore/static/app.js": "6c6155ceed310c657f0eda0767536eb1b7c16bfba5188cadd6390c8d24ebc037",
  "hubcore/static/apple-touch-icon-180.png": "bfcf0fb9be6f727667b2629e6c984b23794ccd98c5518acf0f6e154defe3c417",
  "hubcore/static/apple-touch-icon-192.png": "af6ad2718f956371850e6c4260d6cf3841231ea0799b30a5d6465cd241d09049",
  "hubcore/static/apple-touch-icon-512.png": "401f0738620314a0af0c08995b35c72f7de73dbf2355ec84de276e2d5029424a",
  "hubcore/static/apple-touch-icon.png": "bfcf0fb9be6f727667b2629e6c984b23794ccd98c5518acf0f6e154defe3c417",
  "hubcore/static/avatars.svg": "fec9750ea962418a337116ebe1e12b41b1117341453d33b05019c472ac15498f",
  "hubcore/static/icon.svg": "ac67003f1620413c8c4e95ac6b86d559a3867945fe768874514d50a6d04a0333",
  "hubcore/static/manifest.webmanifest": "291e44fc665c3afa4fcdf67fa104bd7bfd705b8e8f5302d2e70f7ec62573bd40",
  "hubcore/static/push.js": "2f873a2884604356c2809d95367104466787707ff64dffb8101ce39e4a1c0fce",
  "hubcore/static/style.css": "e1bfbd5910554fb4f0c00c3c462f36163b675a2f1648038044e24bd5752cc452",
  "hubcore/static/sw.js": "e1ffe51b0a9db2084dae87cdf7dd38a38544001a2f37ba4e6599db8fcda7e6d3",
  "hubcore/templates/_avatars.svg": "fec9750ea962418a337116ebe1e12b41b1117341453d33b05019c472ac15498f",
  "hubcore/templates/base.html": "1af091315aafe932089bc4a47a8a876725b26cf5f869c46d5e98cf00afd2df72",
  "hubcore/templates/cycle.html": "c610c3b4fa52bf800367c898b36e82848acdf2e13309aa33fe3d4fe87e1893ec",
  "hubcore/templates/document.html": "324d3e20b7b38294b09bdad591e71d3a9ae4efa025f45357a755ee3a717a48b2",
  "hubcore/templates/documents.html": "310e02618303e6cc1ff1f14b43372d7856def24a24af4776f6b98de7fbe42bab",
  "hubcore/templates/inbox.html": "604a2ae00d9d71002c984c97fa32d3837003840380a75cc0f3183b1a3884e5a7",
  "hubcore/templates/index.html": "c939c38dae963f9e33604429fca5f6eefef57f8e9e48e38d1ec8545f830787e1",
  "hubcore/templates/labs.html": "676f7ea06a8d3460588382cc3aa2781a9e6fa71b85e858a20d8cf18bceb7a500",
  "hubcore/templates/login.html": "3c8dcb45be2e22d225564f264993a2962c7670e2f8fe2fb82853eb7ed7108828",
  "hubcore/templates/marker.html": "df29a4d53816e416c0a287a941e74e95345bca12671141305fbe4f2be69dde02",
  "hubcore/templates/meds.html": "f5728b270a8bf1b787d0f8a4779c369279134fd436330854763709a256b16532",
  "hubcore/templates/mood.html": "fa3baf9baec29981214e7ca8dfe0d7c553f27fb7feaa53ab2f06d9d618e3a0dc",
  "hubcore/templates/search.html": "757bb67f94d88e48bcc3eb5ebabbbf578252a45d4edabdda842ce8d208551716",
  "hubcore/templates/settings.html": "3ce40f5d6ebf81ac27f1955b1334cc991db26244203c9896f4fcb169cec34546",
  "hubcore/templates/subject.html": "e19a19a1277512793c1a2cc331dc1b744f80d9b5977a38ef7407b88eeb8925f4",
  "hubcore/templates/timeline.html": "f14d575405b79585f685f4ab0e97bc83d965f1a918da198a2dc458293d548a68",
  "hubcore/web.py": "f3c2b2b74557f84a5aa8a97967dccb8176d902f1a21758feaa61f8bd7dc6323b",
  "requirements.txt": "db7fdafefa0a59c9c0fbafa3664b0f3db6878ad398eb7f7379dbd68443736280"
}
```
