# Four Existing Project Quests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить четыре 17-уровневых квеста, которые точно повторяют уже работающие проекты Жени: карусельщика, Threads-агента, модератора вебинаров и семейный хаб здоровья.

**Architecture:** Четыре новые самостоятельные записи входят в текущий реестр проектов. Для трёх Telegram-проектов добавляются предметные контракты агентов, для всех четырёх — отдельные построители квестов и предметные прототипы; общие механизмы выбора данных, кастомизации, прогресса, сброса и desktop/mobile-маршрутов остаются неизменными. Содержание квестов проверяется тестами на обязательные функции исходных проектов и на отсутствие выдуманных возможностей.

**Tech Stack:** Vinext, React 19, TypeScript 5.9, Vitest, Testing Library, Playwright, Sites hosting, статические PNG-кадры курса.

## Global Constraints

- Источник карусельщика: `SUBMARINE маркетинг/_03_БОТЫ_И_СЕРВИСЫ/karusel-pupsik-bot`.
- Источник Threads: `Reloqueen/threads-agent`.
- Источник модератора: `SUBMARINE маркетинг/webinar-moderator-bot`; `vika-moderator-bot` — пример клиентской копии.
- Источник хаба: `Documents/family-health-hub-public`; личная папка `Documents/health-hub` не используется в материалах.
- В каталоге после изменения 42 карточки, 49 конкретных путей, 24 ИИ-агента и 10 сервисов.
- В каждом новом пути ровно 17 уровней; в каталоге 714 уровней, в генераторе concrete-экранов 833 уровня.
- Ученица выбирает реальные или учебные данные до квеста; реальные чек-листы предметны и не требуют ручного создания файлов.
- Публичное название первого проекта — «ИИ-агент каруселей»; Telegram технически называет оболочку ботом только в утверждённом пояснении платформы.
- Карусельщик делает Instagram-карусели через Telegram, не Telegram-карусели и не ZIP-архив, которого нет в актуальном `karusel-pupsik-bot`.
- Threads-агент не публикует автоматически; он отдаёт готовые ветки в Telegram.
- Модератор стартует в `observe`; `assist` и `auto` включаются отдельно, а `auto` использует только утверждённые шаблоны и лимиты оригинала.
- Хаб не диагностирует, не лечит, не выдумывает данные и не загружает медицинские сведения в аналитику или облачную базу Академии.
- На Linux мобильный хаб гарантированно разбирает PDF; встроенный macOS OCR для фотографий недоступен.
- Секреты не входят в тексты квестов, скриншоты, URL, репозиторий или портфолио.
- Все новые обложки показывают финальный интерфейс конкретного продукта, а не абстрактную иллюстрацию.
- Новые зависимости не добавляются.
- Публикация выполняется только после unit/script-тестов, lint, build, проверки PNG и живого smoke-теста.

---

## File Structure

### Новые файлы

- `app/content/original-quests/carousel-agent.ts` — 17 предметных уровней карусельщика.
- `app/content/original-quests/threads-agent.ts` — 17 предметных уровней Threads-агента.
- `app/content/original-quests/webinar-moderator-agent.ts` — 17 предметных уровней модератора.
- `app/content/original-quests/family-health-hub.ts` — 17 предметных уровней хаба.
- `app/content/original-quests/source-project-quests.test.ts` — предметные требования четырёх путей.
- `app/components/SourceProjectPrototypeScene.tsx` — четыре финальных desktop-прототипа и их пошаговые состояния.
- `app/source-project-prototypes.css` — отдельный визуальный язык четырёх прототипов.

### Изменяемые файлы

- `app/content/projects.ts` — четыре проекта и 49 slug для снимков.
- `app/content/projects.test.ts`, `project-bundles.test.ts` — новые количества и состав.
- `app/content/agent-contracts.ts` — три точных контракта Telegram-агентов.
- `app/content/quests.ts` — маршрутизация четырёх slug в отдельные построители.
- `app/content/quests.test.ts` — общие гарантии 49 путей и точные ограничения.
- `app/content/customization.ts` — предметные варианты кастомизации.
- `app/content/preparation/index.ts`, `app/lib/preparation.ts` — четыре предметных чек-листа.
- `app/content/mobile.ts`, `app/content/mobile.test.ts` — реальные мобильные ограничения модератора и health hub.
- `app/components/ExpectedScene.tsx`, `MobileExpectedScene.tsx`, `App.test.tsx` — предметные кадры и 42 карточки.
- `app/layout.tsx`, `MobileAcademy.tsx` — 42 проекта и 714 уровней.
- `app/globals.css` — импорт нового CSS.
- `scripts/projects.mjs`, `scripts/projects.test.mjs`, `scripts/verify-screens.mjs` — 49 concrete-путей и 1 990 обязательных PNG.
- `public/og.png` — социальная карточка «42 проекта» в действующем стиле Академии.

---

### Task 1: Расширить реестр и контракты до 49 путей

**Files:**
- Modify: `app/content/projects.ts`
- Modify: `app/content/projects.test.ts`
- Modify: `app/content/project-bundles.test.ts`
- Modify: `app/content/agent-contracts.ts`
- Modify: `app/content/quests.test.ts`

**Interfaces:**
- Produces: проекты `carousel-agent`, `threads-agent`, `webinar-moderator-agent`, `family-health-hub`.
- Produces: три `AgentContract`, доступные через `getAgentContract()`.
- Consumes: текущие `ProjectDefinition`, `agent()` и реестр concrete-путей.

- [ ] **Step 1: Написать падающие тесты состава и точных результатов**

```ts
it("adds four source-backed projects without duplicating existing cards", () => {
  expect(projects).toHaveLength(42);
  expect(questProjects).toHaveLength(49);
  expect(questProjects.filter((item) => item.kind === "agent")).toHaveLength(24);
  expect(questProjects.filter((item) => item.kind === "service")).toHaveLength(10);
  expect(["carousel-agent", "threads-agent", "webinar-moderator-agent", "family-health-hub"]
    .map((slug) => getQuestProject(slug)?.title)).toEqual([
      "ИИ-агент каруселей",
      "ИИ-агент Threads",
      "ИИ-агент — модератор вебинаров",
      "Хаб здоровья семьи",
    ]);
});

it("keeps the three new agents tied to their real result", () => {
  expect(getAgentContract("carousel-agent").resultItems).toEqual([
    "готовые PNG-слайды", "выбранная палитра", "проверенный авторский текст",
  ]);
  expect(getAgentContract("threads-agent").resultItems).toContain("кнопки «Не беру» и «Уже выложила»");
  expect(getAgentContract("webinar-moderator-agent").resultItems).toContain("карточка вопроса в Telegram");
});
```

- [ ] **Step 2: Запустить RED**

Run: `npx vitest run app/content/projects.test.ts app/content/project-bundles.test.ts app/content/quests.test.ts`

Expected: FAIL — четырёх slug и контрактов ещё нет; старые количества 38/45/21/9.

- [ ] **Step 3: Добавить четыре определения в реестр**

Использовать точные поля:

```ts
p({ slug: "carousel-agent", title: "ИИ-агент каруселей", week: 3, kind: "agent", track: "ИИ-агенты для контента", symbol: "▦", audience: "для автора, который делает Instagram-карусели через Telegram", outcome: "личный Telegram-агент: готовый текст → фото → CTA → способ отрисовки → палитра → PNG-слайды", entities: ["текст", "фотография", "CTA", "палитра"], features: ["сохранение авторского текста", "вёрстка или нейрофоны", "11 стилей и Сюрприз", "переделка одного слайда"], demo: ["Пришлите текст поста", "Стиль 1 — вёрстка", "Готово! Отправляю 7 слайдов"], safety: "Агент сохраняет основной текст дословно, не публикует карусель сам, ограничивает доступ и не показывает ключи.", portfolioAngle: "рабочий Telegram-карусельщик с двумя способами отрисовки и личным арт-дирекшеном" }),
p({ slug: "threads-agent", title: "ИИ-агент Threads", week: 3, kind: "agent", track: "ИИ-агенты для контента", symbol: "@", audience: "для автора, которому нужны ежедневные готовые ветки в собственном голосе", outcome: "личный Telegram-агент, который собирает источники и присылает неповторяющиеся ветки Threads", entities: ["профиль", "источник", "факт", "ветка"], features: ["свои и внешние источники", "паспорт голоса и ракурсы", "антиповтор хуков", "перегенерация и ещё пять"], demo: ["10 веток готовы", "❌ Не беру · ✅ Уже выложила", "🔄 Перегенерить · ➕ Ещё 5"], safety: "Агент переписывает чужие материалы с нуля, добавляет источник, не выдумывает факт и не публикует автоматически.", portfolioAngle: "ежедневный Threads-редактор с источниками, антиповтором и обратной связью" }),
p({ slug: "webinar-moderator-agent", title: "ИИ-агент — модератор вебинаров", week: 3, kind: "agent", track: "ИИ-агенты для работы", symbol: "◉", audience: "для онлайн-школы с вебинарами и чатом GetCourse", outcome: "модератор, который читает чат, классифицирует вопросы и передаёт безопасные ответы через Telegram", entities: ["вебинар", "сообщение", "категория", "ответ"], features: ["observe / assist / auto", "карточки вопросов", "утверждённые шаблоны и FAQ", "дайджест и расписание"], demo: ["Режим observe", "📋 Шаблон · 🚫 Пропустить · ➕ В FAQ", "Дайджест вебинара"], safety: "По умолчанию агент только наблюдает; автоответы разрешены только для утверждённых шаблонов с лимитами, без удаления и блокировки людей.", portfolioAngle: "безопасный модератор GetCourse с Telegram-пультом и отдельной клиентской базой" }),
p({ slug: "family-health-hub", title: "Хаб здоровья семьи", week: 1, kind: "service", track: "Бытовые сервисы", symbol: "♡", audience: "для семьи, которая хранит медицинские документы людей и животных", outcome: "закрытый семейный хаб: документы, показатели, графики, напоминания и резервные копии", entities: ["профиль", "документ", "показатель", "напоминание"], features: ["разбор лабораторных PDF", "графики и неразобранные данные", "люди и животные", "пароль и резервная копия"], demo: ["3 профиля семьи", "12 документов", "5 показателей требуют внимания"], safety: "Хаб не диагностирует и не лечит, не выдумывает даты, значения и референсы, не отправляет медицинские данные в аналитику или общую облачную базу.", portfolioAngle: "приватный медицинский архив семьи с честными ограничениями и проверяемыми источниками" }),
```

- [ ] **Step 4: Добавить три контракта в `agentContracts`**

Контракты должны описывать реальный первый запрос, единственный уточняющий вопрос, точное правило решения, название результата, внешнее действие и передачу человеку. `externalAction` соответственно: «публиковать карусель», «публиковать ветку», «писать в чат вебинара или менять режим».

- [ ] **Step 5: Запустить GREEN и общий реестр**

Run: `npx vitest run app/content/projects.test.ts app/content/project-bundles.test.ts app/content/quests.test.ts`

Expected: PASS — 42 карточки, 49 путей, 24 агента, 10 сервисов.

- [ ] **Step 6: Commit**

```bash
git add app/content/projects.ts app/content/projects.test.ts app/content/project-bundles.test.ts app/content/agent-contracts.ts app/content/quests.test.ts
git commit -m "feat: register four source-backed quests"
```

---

### Task 2: Добавить предметную подготовку и кастомизацию

**Files:**
- Modify: `app/content/customization.ts`
- Modify: `app/lib/preparation.ts`
- Modify: `app/content/preparation/index.ts`
- Modify: `app/content/quests.test.ts`
- Modify: `app/content/mobile.test.ts`

**Interfaces:**
- Produces: `getCustomizationProfile(slug)` для четырёх проектов.
- Produces: `buildRealDataChecklist(project, surface)` без ручных файлов.
- Consumes: новые проекты и три `AgentContract`.

- [ ] **Step 1: Написать падающие тесты четырёх чек-листов**

```ts
it.each([
  ["carousel-agent", ["утверждённый текст", "фотографии", "CTA", "ник"]],
  ["threads-agent", ["профиль Threads", "свои источники", "внешние источники", "примеры голоса"]],
  ["webinar-moderator-agent", ["тестовый вебинар", "утверждённые шаблоны", "база знаний", "расписание"]],
  ["family-health-hub", ["безопасные копии PDF", "варианты имени", "оригинал бланка", "место резервной копии"]],
])("builds exact real checklist for %s", (slug, phrases) => {
  const project = getQuestProject(slug)!;
  const text = buildRealDataChecklist(project).map((item) => `${item.text} ${item.detail}`).join(" ");
  for (const phrase of phrases) expect(text).toContain(phrase);
  expect(text).not.toMatch(/создайте.*(?:csv|txt|файл)/i);
});
```

- [ ] **Step 2: Запустить RED**

Run: `npx vitest run app/content/quests.test.ts app/content/mobile.test.ts`

Expected: FAIL — generic agent/service чек-листы не содержат нужных материалов.

- [ ] **Step 3: Добавить `buildSourceProjectChecklist()`**

Вернуть по пять коротких пунктов для каждого slug. У модератора отдельно написать, что пароль, токен и API-ключ передаются только в защищённые настройки Codex/сервера и не вставляются в Академию. У хаба запретить копирование реальных документов в портфолио и учебные снимки.

- [ ] **Step 4: Добавить четыре профиля кастомизации**

Каждый профиль предлагает шесть осей и 3–5 готовых вариантов:

- карусель: аудитория, цель, название, арт-дирекшен, тон заголовков, особенность;
- Threads: профиль, цель, имя агента, формат веток, голос, банк ракурсов;
- модератор: тип школы, цель, имя модератора, стиль Telegram-карточек, тон ответа, режим старта;
- health hub: состав семьи, цель, название, спокойная схема экрана, тон предупреждений, один приоритетный раздел.

- [ ] **Step 5: Запустить GREEN**

Run: `npx vitest run app/content/quests.test.ts app/content/mobile.test.ts`

Expected: PASS — real/demo подготовка предметна, ручных служебных файлов нет.

- [ ] **Step 6: Commit**

```bash
git add app/content/customization.ts app/lib/preparation.ts app/content/preparation/index.ts app/content/quests.test.ts app/content/mobile.test.ts
git commit -m "feat: personalize four source project preparations"
```

---

### Task 3: Создать четыре точных 17-уровневых пути

**Files:**
- Create: `app/content/original-quests/carousel-agent.ts`
- Create: `app/content/original-quests/threads-agent.ts`
- Create: `app/content/original-quests/webinar-moderator-agent.ts`
- Create: `app/content/original-quests/family-health-hub.ts`
- Create: `app/content/original-quests/source-project-quests.test.ts`
- Modify: `app/content/quests.ts`

**Interfaces:**
- Each builder: `(project: ProjectDefinition, mode: DataMode, customization: QuestCustomization) => QuestStep[]`.
- Consumes: `makeOriginalStep()` and the current `QuestStep` contract.
- Produces: four arrays with ids 1–17, exact screenshots and subject-specific prompts.

- [ ] **Step 1: Написать падающие тесты обязательной механики**

```ts
const expected = {
  "carousel-agent": ["не меньше 40", "фото", "CTA", "вёрстка", "нейрофоны", "11", "Сюрприз", "Переделать один слайд"],
  "threads-agent": ["свои источники", "чужие", "Источник", "500", "Не беру", "Уже выложила", "Перегенерить", "Ещё 5"],
  "webinar-moderator-agent": ["observe", "assist", "auto", "/status", "/mode", "/watch", "/digest", "approved: true", "30 авто-ответов"],
  "family-health-hub": ["PDF", "референс", "неразобран", "5–10 значений", "не ставит диагноз", "пароль", "integrity_check", "macOS OCR"],
};

for (const [slug, phrases] of Object.entries(expected)) {
  const steps = buildQuest(getQuestProject(slug)!, "real", defaultCustomization(slug)!);
  expect(steps).toHaveLength(17);
  expect(steps.map((step) => step.id)).toEqual(Array.from({ length: 17 }, (_, i) => i + 1));
  const text = steps.map((step) => [step.title, step.why, step.action, step.prompt, ...step.expected].join(" ")).join(" ");
  for (const phrase of phrases) expect(text).toContain(phrase);
}
```

Добавить негативные проверки: карусель не обещает ZIP или автопубликацию; Threads не обещает автопубликацию; модератор не удаляет и не блокирует участников; хаб не даёт диагноз/лечение и не обещает OCR фотографий на Linux.

- [ ] **Step 2: Запустить RED**

Run: `npx vitest run app/content/original-quests/source-project-quests.test.ts`

Expected: FAIL — отдельные построители отсутствуют.

- [ ] **Step 3: Реализовать путь карусельщика**

Уровни: финальный альбом → личная версия → интервью → Codex создаёт проект → безопасный Telegram-доступ → текст 40+ символов → фото → CTA → способ отрисовки → палитра → раскладка фото → готовые PNG → повторная сборка/один слайд → телефон → публикация агента → отдельная клиентская копия → кейс.

- [ ] **Step 4: Реализовать путь Threads**

Уровни: финальный ежедневный комплект → профиль → интервью → Codex создаёт проект → Telegram-доступ → свои источники → внешние источники и атрибуция → ручные факты → голос и банк ракурсов → расписание → `/now` → проверка ветки и лимитов → статусы/антиповтор → `regen`/`more` → публикация агента → клиентская копия → кейс.

- [ ] **Step 5: Реализовать путь модератора**

Уровни: финальная карточка → школа и режим → интервью → Codex создаёт проект → отдельный сотрудник GetCourse → Telegram-пульт → база знаний и шаблоны → комнаты/расписание → безопасный вход → калибровка → тест `observe` → карточки/FAQ/дайджест → `assist` → строго контролируемый `auto` → мониторинг → клиентская копия по примеру Вики → кейс.

- [ ] **Step 6: Реализовать путь health hub**

Уровни: финальная сводка → состав и приоритет → интервью → Codex разворачивает чистый `healthtablo` → локальный/закрытый запуск → профили и алиасы → PDF во входящие → «Разобрать всё» → ручное назначение неизвестного → сверка 5–10 значений → графики/внимание → документы и семейные разделы → напоминания → пароль/резервная копия/мобильный доступ → личная установка → чистая клиентская копия без данных → кейс.

- [ ] **Step 7: Подключить построители в `buildQuest()`**

```ts
const sourceBuilders = {
  "carousel-agent": buildCarouselAgentQuest,
  "threads-agent": buildThreadsAgentQuest,
  "webinar-moderator-agent": buildWebinarModeratorAgentQuest,
  "family-health-hub": buildFamilyHealthHubQuest,
} as const;
```

До generic switch проверить slug и вызвать соответствующий builder.

- [ ] **Step 8: Запустить GREEN и общие тесты квестов**

Run: `npx vitest run app/content/original-quests/source-project-quests.test.ts app/content/quests.test.ts`

Expected: PASS — каждый путь содержит 17 предметных уровней и не обещает лишнего.

- [ ] **Step 9: Commit**

```bash
git add app/content/original-quests app/content/quests.ts
git commit -m "feat: add four exact source project paths"
```

---

### Task 4: Нарисовать четыре уникальных финальных прототипа

**Files:**
- Create: `app/components/SourceProjectPrototypeScene.tsx`
- Create: `app/source-project-prototypes.css`
- Modify: `app/components/ExpectedScene.tsx`
- Modify: `app/components/MobileExpectedScene.tsx`
- Modify: `app/globals.css`
- Modify: `app/components/App.test.tsx`

**Interfaces:**
- Produces: `hasSourceProjectPrototype(slug)` and `SourceProjectPrototypeScene`.
- Consumes: `ProjectDefinition`, `step`, existing 1200×800 capture canvas.

- [ ] **Step 1: Написать падающий компонентный тест**

```ts
for (const [slug, marker] of [
  ["carousel-agent", "data-carousel-master"],
  ["threads-agent", "data-threads-batch"],
  ["webinar-moderator-agent", "data-webinar-question"],
  ["family-health-hub", "data-health-family"],
] as const) {
  window.history.replaceState({}, "", `/?capture=${slug}--step-14`);
  const { unmount } = render(<App />);
  expect(document.querySelector(`[${marker}]`)).toBeInTheDocument();
  unmount();
}
```

- [ ] **Step 2: Запустить RED**

Run: `npx vitest run app/components/App.test.tsx`

Expected: FAIL — четыре предметных сцены отсутствуют.

- [ ] **Step 3: Реализовать сцены**

- карусель: Telegram-мастер, 4 шага выбора и ряд разных 4:5 PNG;
- Threads: три поста одной ветки, источник, статусы и кнопки набора;
- модератор: GetCourse-сообщение, категория, Telegram-карточка, черновик и действия;
- health hub: семейные профили, панель внимания, график и документы без ФИО/диагнозов.

В desktop-сценах контент меняется по уровню; на шаге 14 всегда виден финальный результат. В mobile-сценах те же сущности помещаются в телефон без горизонтальной прокрутки.

- [ ] **Step 4: Добавить адаптивный CSS и reduced motion**

CSS использует существующие переменные платформы, но четыре разные палитры: карамельно-чернильная, чёрно-лаймовая Threads, сине-коралловая модератора, молочно-зелёная health hub. Интерактивные элементы визуально не меньше 44 px в мобильном прототипе.

- [ ] **Step 5: Запустить GREEN**

Run: `npx vitest run app/components/App.test.tsx`

Expected: PASS — четыре уникальных data-marker отображаются.

- [ ] **Step 6: Commit**

```bash
git add app/components/SourceProjectPrototypeScene.tsx app/source-project-prototypes.css app/components/ExpectedScene.tsx app/components/MobileExpectedScene.tsx app/globals.css app/components/App.test.tsx
git commit -m "feat: add four source project prototypes"
```

---

### Task 5: Обновить каталог, метаданные и генератор снимков

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/components/MobileAcademy.tsx`
- Modify: `app/components/App.test.tsx`
- Modify: `scripts/projects.mjs`
- Modify: `scripts/projects.test.mjs`
- Modify: `scripts/verify-screens.mjs`
- Modify: `public/og.png`

**Interfaces:**
- Produces: 42 карточки, 49 уникальных обложек, 714 catalog-levels.
- Produces: 1 990 проверяемых PNG: 1 666 main/mobile screens + 324 существующих guide screens.

- [ ] **Step 1: Написать падающие тесты чисел и manifest**

Обновить ожидания: 42 карточки, 49 превью, 49 slug, новые четыре slug находятся в конце соответствующих недель, удалённые legacy slug отсутствуют.

- [ ] **Step 2: Запустить RED**

Run: `npm run test:scripts && npx vitest run app/components/App.test.tsx`

Expected: FAIL — scripts всё ещё требуют 45, UI — 38/646.

- [ ] **Step 3: Обновить числа и метаданные**

Заменить пользовательские числа на 42 проекта и 714 уровней. `captureProjectSlugs` и script manifest содержат ровно 49 concrete slug.

- [ ] **Step 4: Обновить `og.png`**

Сгенерировать одну социальную карточку в действующем стиле Академии с точным текстом «42 проекта. Одна новая профессия.» и четырьмя предметными мини-прототипами. Проверить изображение глазами; при ошибочном тексте выполнить не более одной повторной генерации.

- [ ] **Step 5: Запустить GREEN**

Run: `npm run test:scripts && npx vitest run app/components/App.test.tsx`

Expected: PASS — catalog/render/capture числа согласованы.

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx app/components/MobileAcademy.tsx app/components/App.test.tsx scripts/projects.mjs scripts/projects.test.mjs scripts/verify-screens.mjs public/og.png
git commit -m "chore: expand academy to 42 projects"
```

---

### Task 6: Сгенерировать кадры, проверить и опубликовать

**Files:**
- Create: `public/screens/{carousel-agent,threads-agent,webinar-moderator-agent,family-health-hub}/step-01.png..step-17.png`
- Create: `public/screens-mobile/{carousel-agent,threads-agent,webinar-moderator-agent,family-health-hub}/step-01.png..step-17.png`
- Modify: Sites version only after validated source commit.

**Interfaces:**
- Consumes: capture manifest with 49 paths.
- Produces: deployed existing Sites URL with four new catalogue cards.

- [ ] **Step 1: Сгенерировать все main и mobile кадры**

Run: `npm run capture:steps && npm run capture:mobile`

Expected: 1 666 PNG основных путей; новые 136 файлов имеют размер 1200×800.

- [ ] **Step 2: Оптимизировать PNG без изменения размеров**

Использовать существующую безопасную команду оптимизации репозитория только для `public/screens` и `public/screens-mobile`; затем повторно проверить размеры.

- [ ] **Step 3: Полная свежая проверка**

Run: `npm run test:scripts && npm run test:unit && npm run lint && npm run build && npm run verify:screens`

Expected: exit 0; 0 failing tests; 1 990 обязательных PNG присутствуют и имеют 1200×800.

- [ ] **Step 4: Локальный browser QA**

Открыть каталог и четыре квеста. Проверить: 42 карточки; четыре разные обложки; real/demo выбор; desktop/mobile пути; сброс только текущего проекта; шаг «Дальше» поднимает страницу наверх; 390 px без горизонтального скролла; консоль без ошибок.

- [ ] **Step 5: Commit exact validated source and assets**

```bash
git add public/screens public/screens-mobile
git commit -m "chore: add four quest screenshot sets"
```

- [ ] **Step 6: Опубликовать существующий Sites-проект**

Собрать архив штатным `package-site.sh`, сохранить новую версию для существующего `project_id`, развернуть на прежнем публичном адресе и дождаться `succeeded`.

- [ ] **Step 7: Живой smoke-test**

На опубликованном URL проверить каталог, прямые ссылки четырёх квестов, загрузку `step-14.png`, мобильный URL и отсутствие ошибок консоли. Только после этого сообщать о завершении.

---

## Self-Review

- Spec coverage: четыре источника, точные функции, кастомизация, real/demo, телефон/компьютер, клиентская копия, портфолио, обложки, снимки и деплой покрыты Tasks 1–6.
- Placeholder scan: `TODO`, `TBD`, «аналогично» и неопределённые шаги отсутствуют.
- Type consistency: четыре builder имеют одинаковую сигнатуру; четыре slug совпадают в реестре, контрактах, квестах, компонентах и capture manifest.
- Safety: секреты, личные медицинские файлы, автопубликация Threads, несуществующий ZIP карусельщика и опасные автоответы исключены тестами.
