# Unique Design Quest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить полностью проходимый desktop- и mobile-квест, который превращает три референса с разными ролями в оригинальный дизайн сервиса или лендинга.

**Architecture:** Новый самостоятельный `ProjectDefinition` подключается к существующим каталогу, прогрессу и data-mode. Предметные 17 уровней живут в отдельном original-quest builder, а уникальный прототип результата — в отдельном React-компоненте и CSS-файле. Общие компоненты Академии, подготовки, мобильного маршрута и capture-скрипты используются без отдельного роутера.

**Tech Stack:** TypeScript, React 19, vinext, Vitest, Playwright capture scripts, CSS.

## Global Constraints

- Ученица не создаёт служебные папки и файлы вручную: это делает Codex после подтверждения ответов.
- Три референса имеют разные роли: структура, настроение, одна деталь.
- Запрещено копировать чужой текст, код, фотографии, логотипы и дизайн один в один.
- Квест проходим с телефона через Telegram, личный Codex и мобильный конструктор.
- `ui-ux-pro-max` используется только при наличии; встроенный чек-лист является полноценной заменой.

---

### Task 1: Реестр и профиль квеста

**Files:**
- Modify: `app/content/projects.ts`
- Modify: `app/content/discovery.ts`
- Modify: `app/content/preparation/week-4.ts`
- Modify: `app/content/customization.ts`
- Test: `app/content/projects.test.ts`
- Test: `app/content/project-bundles.test.ts`
- Test: `app/content/discovery.test.ts`
- Test: `app/lib/customization.test.ts`

**Interfaces:**
- Produces: `ProjectDefinition` со slug `unique-design`, difficulty 2, профиль подготовки и профиль кастомизации.

- [ ] Написать падающие проверки количества 46/53 и наличия `unique-design` в неделе 4.
- [ ] Запустить целевые тесты и увидеть падение из-за отсутствующего проекта.
- [ ] Добавить проект, классификацию, подготовку и оси персонализации.
- [ ] Запустить целевые тесты до зелёного состояния.

### Task 2: Предметные 17 уровней

**Files:**
- Create: `app/content/original-quests/unique-design.ts`
- Modify: `app/content/quests.ts`
- Modify: `app/content/original-quests/mobile.ts`
- Modify: `app/content/original-quests/shared.ts`
- Test: `app/content/original-quests/unique-design.test.ts`

**Interfaces:**
- Produces: `buildUniqueDesignQuest(project, mode, customization): QuestStep[]`.

- [ ] Написать падающие тесты на 17 уникальных уровней, три роли референсов, ссылки, скилл с fallback, реальный режим и клиентскую копию.
- [ ] Убедиться, что тест падает из-за отсутствующего builder.
- [ ] Реализовать 17 подробных уровней через `makeOriginalStep`.
- [ ] Подключить builder в desktop и mobile маршруты.
- [ ] Запустить тесты до зелёного состояния.

### Task 3: Оригинальный прототип результата

**Files:**
- Create: `app/components/DesignReferenceScene.tsx`
- Create: `app/design-reference-scene.css`
- Modify: `app/globals.css`
- Modify: `app/components/ExpectedScene.tsx`
- Modify: `app/components/MobileExpectedScene.tsx`
- Test: `app/components/App.test.tsx`

**Interfaces:**
- Produces: `DesignReferenceScene({step, mobile})` с тремя ролями, собственными решениями и финальной концепцией.

- [ ] Написать падающий компонентный тест на уникальный marker и три подписанные роли.
- [ ] Увидеть падение из-за отсутствующего прототипа.
- [ ] Создать дизайн-стол без чужих логотипов и изображений.
- [ ] Подключить прототип к desktop и mobile capture.
- [ ] Запустить компонентные тесты до зелёного состояния.

### Task 4: Количества, генерация и экранные примеры

**Files:**
- Modify: `app/components/Academy.tsx`
- Modify: `app/components/MobileAcademy.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Modify: `scripts/projects.mjs`
- Modify: `scripts/projects.test.mjs`
- Modify: `scripts/verify-screens.mjs`
- Create: `public/screens/unique-design/step-01.png` … `step-17.png`
- Create: `public/screens-mobile/unique-design/step-01.png` … `step-17.png`
- Create: `public/guides/unique-design/step-01-frame-01.png` … `step-17-frame-03.png`

**Interfaces:**
- Produces: 46 карточек, 53 concrete paths и все изображения нового квеста 1200×800.

- [ ] Обновить падающие проверки количества и capture manifest.
- [ ] Обновить пользовательские числа в desktop, mobile и metadata.
- [ ] Снять только `unique-design` через `CAPTURE_SLUGS=unique-design`.
- [ ] Проверить размеры и наличие каждого нового PNG.

### Task 5: Финальная проверка

**Files:**
- Verify: all modified files and generated assets.

**Interfaces:**
- Consumes: полный квест и все его изображения.
- Produces: готовая локальная версия для просмотра.

- [ ] Запустить `npm run test:scripts`.
- [ ] Запустить `npm run test:unit`.
- [ ] Запустить `npm run lint`.
- [ ] Запустить `npm run build`.
- [ ] Открыть `?quest=unique-design`, проверить режим реальных данных, ссылки, 17 уровней и мобильный маршрут.
- [ ] Проверить отсутствие горизонтального скролла и ошибок браузера.
