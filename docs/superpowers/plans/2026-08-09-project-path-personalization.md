# Project Path Personalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить универсальные чек-листы и механическую адаптацию реальных данных на отдельное предметное содержание для всех 52 проектов.

**Architecture:** Новые недельные каталоги содержат явный `ProjectPreparationProfile` для каждого `slug`. `buildRealDataChecklist` только преобразует профиль в восемь карточек, а адаптер реального режима использует конкретный файл и пример профиля без общего префикса перед каждым действием.

**Tech Stack:** TypeScript, React 19, Vitest, Testing Library, Vinext, Sites.

## Global Constraints

- Содержание рассчитано на новичка, который не знает технических терминов.
- Каждый видимый пункт объясняет «зачем», «что нажать или написать» и «как понять, что готово».
- Реальный режим не предлагает вымышленные данные.
- Медицинские проекты только сохраняют наблюдения и не дают оценок или рекомендаций.
- Существующие 52 проекта и 17 уровней каждого проекта сохраняются.

---

### Task 1: Защитные тесты содержания

**Files:**
- Modify: `app/lib/preparation.test.ts`
- Modify: `app/content/quests.test.ts`

**Interfaces:**
- Consumes: `buildRealDataChecklist(project)`, `buildQuest(project, mode)`.
- Produces: тесты уникальности, подробности, безопасности и отсутствия универсальных фраз.

- [ ] Добавить тест, который требует восемь подробных пунктов с `steps` и `doneWhen` у каждого проекта.
- [ ] Добавить предметные проверки для `pressure-diary`, бытовых сервисов, ботов, агентов и сайтов.
- [ ] Добавить тест отсутствия фразы «Возьмите подходящий материал из подготовленной папки» во всех реальных маршрутах.
- [ ] Запустить `npm run test:unit -- app/lib/preparation.test.ts app/content/quests.test.ts` и подтвердить ожидаемое падение на текущем универсальном генераторе.

### Task 2: Отдельные профили 52 проектов

**Files:**
- Create: `app/content/preparation/types.ts`
- Create: `app/content/preparation/week-1.ts`
- Create: `app/content/preparation/week-2.ts`
- Create: `app/content/preparation/week-3.ts`
- Create: `app/content/preparation/week-4.ts`
- Create: `app/content/preparation/week-5.ts`
- Create: `app/content/preparation/week-6.ts`
- Create: `app/content/preparation/index.ts`
- Modify: `app/lib/preparation.ts`

**Interfaces:**
- Produces: `getPreparationProfile(slug): ProjectPreparationProfile`.
- Consumes: `ProjectDefinition` для проверки полного покрытия.

- [ ] Описать тип профиля с шестью предметными карточками, безопасностью и запретом секретов.
- [ ] Заполнить явный профиль для каждого `slug`, используя конкретные файлы, поля, примеры и критерии готовности.
- [ ] Переключить `buildRealDataChecklist` на профили и удалить универсальные пункты по типу проекта.
- [ ] Запустить сфокусированные тесты и подтвердить зелёный результат.

### Task 3: Понятный реальный режим

**Files:**
- Modify: `app/content/data-mode.ts`
- Modify: `app/content/quests.test.ts`

**Interfaces:**
- Consumes: `getPreparationProfile(slug)`.
- Produces: реальные команды с конкретным источником и без бессмысленного префикса действия.

- [ ] Зафиксировать тестом конкретную команду дневника давления и шаг проверки телефона без упоминания папки.
- [ ] Переписать преобразование учебных примеров на конкретный `sourceFile` и `sourceExample` профиля.
- [ ] Оставить правило работы с реальными файлами только внутри копируемой команды Codex.
- [ ] Запустить сфокусированные и полные тесты.

### Task 4: Полная проверка и публикация

**Files:**
- Modify only if validation finds a content defect.

**Interfaces:**
- Consumes: all 52 project profiles and both quest modes.
- Produces: verified production deployment.

- [ ] Запустить `npm test`, `npm run lint`, `npm run verify:screens`, `git diff --check`.
- [ ] Собрать сайт и проверить в браузере `pressure-diary`, по одному боту, агенту, простому и сложному сайту.
- [ ] Опубликовать точный проверенный `HEAD` в существующий Sites-проект.

