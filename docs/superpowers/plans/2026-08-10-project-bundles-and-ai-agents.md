# Project Bundles and Real AI Agents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить 52 повторяющиеся карточки на 38 разных проектов, дать семи бытовым темам выбор «Сервис» или «ИИ-агент» и превратить все бывшие кнопочные боты в содержательные ИИ-агенты с отдельными путями, прогрессом, прототипами и мобильными инструкциями.

**Architecture:** Каталог хранит 38 сущностей: 31 самостоятельный проект и 7 объединённых проектов. Объединённый проект содержит две конкретные ветки `service` и `agent`; только конкретная ветка передаётся в существующие построители квестов. Новый слой маршрутов нормализует старые URL, а новый слой хранения отделяет выбор формата от прогресса и держит состояния компьютера, телефона, сервиса и агента независимо.

**Tech Stack:** Next.js/Vinext, React 19, TypeScript 5.9, Vitest, Testing Library, Playwright, browser `localStorage`, Sites hosting.

## Global Constraints

- В общем каталоге ровно 38 уникальных карточек.
- Ровно семь карточек имеют две ветки: «Сервис» и «ИИ-агент».
- Конкретных путей квестов 45: 9 сервисов, 21 ИИ-агент, 10 простых сайтов, 4 сложных сайта и 1 финальное портфолио.
- В каждой конкретной ветке ровно 17 уровней; каталог считает один выбранный путь на карточку, поэтому общий показатель каталога равен 646 уровням, а генератор экранов обслуживает 765 уровней конкретных путей.
- Сначала выбирается формат результата, затем реальные или вымышленные данные.
- Компьютер, телефон, сервис и ИИ-агент имеют отдельные ключи прогресса, подготовки и оформления.
- Старый прогресс объединяемых карточек не переносится: платформа ещё не выдана ученицам.
- Сброс объединённого проекта удаляет выбор формата и состояния обеих его веток только на текущем устройстве; другие проекты и другая версия устройства сохраняются.
- В публичных карточках, заголовках, промптах и портфолио нет слова «бот». Оно допустимо только в технической фразе про BotFather и Telegram Bot API.
- ИИ-агент принимает свободный текст и голос, извлекает смысл, задаёт один вопрос за раз, выбирает следующий шаг, готовит результат, самопроверяется и передаёт рискованный вопрос человеку.
- Внешние сообщения, публикация, оплата, запись и другие необратимые действия требуют явного подтверждения человека.
- Медицинские проекты только сохраняют наблюдения и не диагностируют, не назначают лечение и не заменяют врача.
- Для реальных данных Codex сам создаёт папки, файлы и поля; ученица отвечает голосом или текстом и ничего служебного не создаёт вручную.
- Все новые зависимости запрещены: изменение выполняется на текущем стеке.
- Перед деплоем обязательны unit-тесты, script-тесты, lint, сборка, проверка PNG, визуальные снимки каталога и живой smoke-тест.

---

## File Structure

### Новые файлы

- `app/content/project-bundles.ts` — семь объединённых карточек и их четырнадцать конкретных веток.
- `app/content/project-routes.ts` — нормализация новых и старых публичных адресов.
- `app/content/agent-contracts.ts` — предметные разговорные контракты всех 21 ИИ-агентов.
- `app/content/project-bundles.test.ts` — состав объединений, число карточек и веток.
- `app/content/project-routes.test.ts` — канонические и старые адреса.
- `app/content/agent-contracts.test.ts` — полнота и уникальность поведения агентов.
- `app/lib/output-format.ts` — сохранение выбора формата и формирование ключей веток.
- `app/lib/output-format.test.ts` — изоляция компьютера/телефона/веток и безопасный разбор данных.
- `app/components/QuestFormatChoice.tsx` — экран «Что вы хотите создать?».
- `app/components/AgentPrototypeScene.tsx` — единый разговорный прототип, наполненный уникальным контрактом конкретного агента.
- `app/agent-prototypes.css` — визуальные темы разговорных прототипов и двойных карточек.

### Основные изменяемые файлы

- `app/content/types.ts` — типы каталога, объединённого проекта, формата и контракта агента.
- `app/content/projects.ts` — 31 самостоятельный проект, 38 карточек каталога и 45 конкретных путей.
- `app/content/quests.ts` — построение конкретной ветки и передача кастомизации в ИИ-агент.
- `app/content/builders/agent.ts` — новый 17-уровневый агентский путь.
- `app/content/customization.ts` — кастомизация каждого ИИ-агента, а не только четырёх сервисов.
- `app/content/preparation/week-2.ts` и `week-3.ts` — новые профили ИИ-агентов без публичных «ботов».
- `app/content/preparation/index.ts` — проверка полноты профилей 45 конкретных путей.
- `app/content/mobile.ts` — ветвь агента на телефоне, свободный ввод/голос и техническое объяснение Telegram.
- `app/lib/progress.ts` — статистика 38 карточек с учётом выбранной ветки.
- `app/components/AppEntry.tsx` — параметр `output`, нормализация старых URL и безопасный fallback.
- `app/components/Academy.tsx`, `MobileAcademy.tsx` — 38 карточек, недельные фильтры и новые цифры.
- `app/components/ProjectCard.tsx`, `ProjectPreview.tsx` — отметка «2 формата внутри» и два мини-прототипа.
- `app/components/Quest.tsx`, `MobileQuest.tsx` — выбор формата до выбора данных, веточные ключи и полный сброс.
- `app/components/ExpectedScene.tsx`, `MobileExpectedScene.tsx` — содержательные разговорные кадры.
- `app/components/MobileActionButton.tsx` — публичная терминология ИИ-агента.
- `app/globals.css` — экран выбора и двойные обложки.
- `app/layout.tsx`, `app/page.tsx` — метаданные «38 проектов».
- `scripts/projects.mjs`, `capture-steps.mjs`, `capture-mobile-steps.mjs`, `verify-screens.mjs`, `capture-site.mjs` — 45 конкретных путей и новые контрольные кадры.
- Текущие тесты `app/components/App.test.tsx`, `app/content/projects.test.ts`, `app/content/quests.test.ts`, `app/content/mobile.test.ts`, `app/lib/progress.test.ts` — новые числа и сценарии.

### Удаляемые файлы после переноса полезных визуальных идей

- `app/content/builders/bot.ts`
- `app/content/bot-prototypes.ts`
- `app/content/bot-prototypes.test.ts`
- `app/components/BotPrototypeScene.tsx`
- `app/bot-prototypes.css`
- `app/content/agent-cover-prototypes.ts`
- `app/content/agent-cover-prototypes.test.ts`
- `app/components/AgentCoverPrototypeScene.tsx`
- `app/agent-cover-prototypes.css`

---

### Task 1: Перестроить реестр в 38 карточек и 45 конкретных путей

**Files:**
- Modify: `app/content/types.ts`
- Create: `app/content/project-bundles.ts`
- Modify: `app/content/projects.ts`
- Create: `app/content/project-bundles.test.ts`
- Modify: `app/content/projects.test.ts`

**Interfaces:**
- Produces: `ProjectFormat`, `CatalogProject`, `ProjectBundleDefinition`, `isProjectBundle()`, `projects`, `questProjects`, `getProject()`, `getQuestProject()`, `resolveProjectVariant()`.
- Consumes: существующие конкретные `ProjectDefinition` и их предметные поля.

- [ ] **Step 1: Написать падающий тест реестра**

```ts
import { describe, expect, it } from "vitest";
import { isProjectBundle, projects, questProjects } from "./projects";

describe("bundled project registry", () => {
  it("contains 38 catalogue cards and 45 concrete quest paths", () => {
    expect(projects).toHaveLength(38);
    expect(new Set(projects.map((item) => item.slug)).size).toBe(38);
    expect(questProjects).toHaveLength(45);
    expect(new Set(questProjects.map((item) => item.slug)).size).toBe(45);
  });

  it("contains exactly seven service-or-agent bundles", () => {
    const bundles = projects.filter(isProjectBundle);
    expect(bundles).toHaveLength(7);
    expect(bundles.map((item) => item.slug)).toEqual([
      "planning", "ideas", "family-budget", "recipes",
      "family-schedule", "habits", "household",
    ]);
    for (const bundle of bundles) {
      expect(bundle.formats.service.kind).toBe("service");
      expect(bundle.formats.agent.kind).toBe("agent");
      expect(bundle.weeks).toEqual([1, 2]);
    }
  });

  it("has no concrete bot kind", () => {
    expect(questProjects.map((item) => item.kind)).not.toContain("bot");
  });
});
```

- [ ] **Step 2: Запустить тест и подтвердить правильное падение**

Run: `npx vitest run app/content/project-bundles.test.ts app/content/projects.test.ts`

Expected: FAIL — нет новых типов/экспортов, а текущий каталог содержит 52 карточки.

- [ ] **Step 3: Добавить точные типы каталога и веток**

```ts
export type ProjectKind =
  | "service"
  | "agent"
  | "simple-site"
  | "advanced-site"
  | "portfolio";

export type ProjectFormat = "service" | "agent";
export type ProjectWeek = 1 | 2 | 3 | 4 | 5 | 6;

export type ProjectDefinition = {
  slug: string;
  title: string;
  week: ProjectWeek;
  kind: ProjectKind;
  track: string;
  symbol: string;
  audience: string;
  outcome: string;
  device: "телефон" | "телефон или ноутбук" | "лучше ноутбук";
  entities: string[];
  features: string[];
  demo: string[];
  safety: string;
  portfolioAngle: string;
};

export type ProjectBundleDefinition = {
  slug: string;
  title: string;
  weeks: readonly [1, 2];
  track: "Сервис или ИИ-агент";
  symbol: string;
  outcome: string;
  device: "телефон или ноутбук";
  formats: Record<ProjectFormat, ProjectDefinition>;
};

export type CatalogProject = ProjectDefinition | ProjectBundleDefinition;
```

- [ ] **Step 4: Создать семь объединений с точными конкретными ветками**

Использовать новые публичные slug карточек и следующие concrete slug:

| Карточка | Сервис | ИИ-агент | Итоговая формулировка |
|---|---|---|---|
| `planning` — «Планирование» | `planner` | `day-planner-agent` | «Планер с экранами или агент, который собирает реалистичный день в разговоре» |
| `ideas` — «Идеи» | `idea-vault` | `idea-analysis-agent` | «Копилка идей или агент, который группирует мысли и предлагает следующий шаг» |
| `family-budget` — «Семейный бюджет» | `family-expenses` | `expense-agent` | «Сервис с итогами или агент, который понимает расход из обычной фразы» |
| `recipes` — «Рецепты и питание» | `recipe-book` | `meal-planning-agent` | «База рецептов или агент, который уточняет условия и собирает меню с покупками» |
| `family-schedule` — «Семейное расписание» | `child-schedule` | `family-schedule-agent` | «Недельный экран или агент, который принимает события и замечает пересечения» |
| `habits` — «Привычки и активность» | `fitness-tracker` | `habit-agent` | «Трекер отметок или бережный агент ежедневной поддержки» |
| `household` — «Домашние дела» | `home-helper` | `home-organizer-agent` | «Сервис распределения дел или агент, который собирает спокойный домашний план» |

Новые конкретные агенты `expense-agent`, `family-schedule-agent`, `habit-agent` должны иметь `kind: "agent"`, `week: 2`, четыре предметные функции, три безопасных примера и собственное ограничение. Сильные старые агентские определения `day-planner-agent`, `idea-analysis-agent`, `meal-planning-agent`, `home-organizer-agent` становятся ветками, а не отдельными карточками.

- [ ] **Step 5: Оставить 31 самостоятельный проект и переименовать четыре бывших бота**

```ts
const renamedAgents = [
  p({ slug: "lead-agent", title: "ИИ-агент для заявок", week: 3, kind: "agent", track: "ИИ-агенты для работы", symbol: "↗", audience: "для эксперта или мастера, которому нужны аккуратные заявки", outcome: "ИИ-агент, который понимает запрос, уточняет задачу и готовит заявку владельцу", entities: ["запрос", "потребность", "контакт", "заявка"], features: ["понимание свободного запроса", "один уточняющий вопрос", "карточка заявки", "передача владельцу"], demo: ["Хочу консультацию по стратегии", "Удобно связаться в Telegram", "Карточка заявки Анны"], safety: "Собираем только необходимые контакты, объясняем цель и ничего не отправляем владельцу без подтверждения пользователя.", portfolioAngle: "ИИ-агент, который превращает свободный запрос в аккуратную заявку" }),
  p({ slug: "booking-agent", title: "ИИ-агент для записи", week: 3, kind: "agent", track: "ИИ-агенты для работы", symbol: "◷", audience: "для мастера или консультанта с записью по времени", outcome: "ИИ-агент, который понимает пожелание, уточняет услугу и готовит подтверждённую запись", entities: ["услуга", "пожелание", "слот", "запись"], features: ["понимание запроса", "уточнение услуги", "проверка слота", "черновик записи"], demo: ["Можно в пятницу после 14:00?", "Консультация 60 минут", "Черновик: 15 августа, 14:00"], safety: "Агент не выдумывает свободные слоты, не подтверждает запись без живого расписания и явного согласия человека.", portfolioAngle: "разговорный ИИ-агент записи с проверкой расписания и подтверждением" }),
  p({ slug: "brief-agent", title: "ИИ-агент для сбора брифа", week: 3, kind: "agent", track: "ИИ-агенты для работы", symbol: "≡", audience: "для специалиста, которому нужен понятный бриф до начала работы", outcome: "ИИ-агент, который задаёт вопросы по одному и собирает подтверждённую сводку задачи", entities: ["вопрос", "ответ", "пробел", "сводка"], features: ["один вопрос за раз", "понимание свободного ответа", "поиск пробелов", "подтверждённый бриф"], demo: ["Мне нужен сайт, но я не знаю, что написать", "Сайт нужен для консультации", "Готовая сводка брифа"], safety: "Агент не додумывает пропущенные ответы, не просит секреты и не начинает работу до подтверждения сводки.", portfolioAngle: "ИИ-агент, превращающий обычный разговор в рабочий клиентский бриф" }),
  p({ slug: "selector-agent", title: "ИИ-агент-подборщик", week: 3, kind: "agent", track: "ИИ-агенты для работы", symbol: "?", audience: "для проекта с несколькими понятными вариантами услуги или тарифа", outcome: "ИИ-агент, который уточняет критерии и объяснимо подбирает подходящий вариант", entities: ["запрос", "критерий", "вариант", "объяснение"], features: ["уточнение цели", "сравнение вариантов", "объяснение выбора", "следующий шаг"], demo: ["Какой тариф мне выбрать?", "Важнее поддержка", "Подойдёт тариф с куратором"], safety: "Агент использует только подтверждённые условия, показывает критерии выбора и передаёт человеку финансово значимое решение.", portfolioAngle: "прозрачный ИИ-подборщик без скрытого давления и выдуманных условий" }),
];
```

Публичные объединения агентов:

- `consultant-agent` объединяет подбор услуги из `consultant-bot` и ответ по базе из `consultant-agent`;
- `content-agent` объединяет сохранение личного голоса из `personal-content-agent` и работу по материалам эксперта из `content-agent`;
- `online-school-agent` объединяет выдачу разрешённых материалов, FAQ и навигацию по курсу из `material-delivery-bot`, `faq-bot`, `online-school-agent`.

Переместить `study-agent` в неделю 2. Остальные самостоятельные рабочие агенты находятся в неделе 3. Экспортировать:

```ts
export const projects: CatalogProject[] = [...bundles, ...standaloneProjects];
export const questProjects: ProjectDefinition[] = projects.flatMap((project) =>
  isProjectBundle(project) ? [project.formats.service, project.formats.agent] : [project],
);

export function isProjectBundle(project: CatalogProject): project is ProjectBundleDefinition {
  return "formats" in project;
}

export function getProject(slug: string): CatalogProject | undefined {
  return projects.find((project) => project.slug === slug);
}

export function getQuestProject(slug: string): ProjectDefinition | undefined {
  return questProjects.find((project) => project.slug === slug);
}

export function resolveProjectVariant(project: CatalogProject, format?: ProjectFormat): ProjectDefinition | undefined {
  if (!isProjectBundle(project)) return project;
  return format ? project.formats[format] : undefined;
}
```

- [ ] **Step 6: Запустить тесты реестра**

Run: `npx vitest run app/content/project-bundles.test.ts app/content/projects.test.ts`

Expected: PASS — 38 карточек, 45 concrete paths, 7 bundles, 0 `bot` kinds.

- [ ] **Step 7: Закоммитить реестр**

```bash
git add app/content/types.ts app/content/project-bundles.ts app/content/projects.ts app/content/project-bundles.test.ts app/content/projects.test.ts
git commit -m "feat: bundle duplicate course projects"
```

---

### Task 2: Добавить канонические URL и совместимость со всеми старыми ссылками

**Files:**
- Create: `app/content/project-routes.ts`
- Create: `app/content/project-routes.test.ts`

**Interfaces:**
- Consumes: `getProject()`, `getQuestProject()`, `ProjectFormat`.
- Produces: `resolvePublicProjectRoute(slug, output)`, `canonicalQuestQuery()`, маршруты capture по concrete slug.

- [ ] **Step 1: Написать падающие тесты полной таблицы адресов**

```ts
const cases = [
  ["planner", "planning", "service"],
  ["planner-bot", "planning", "agent"],
  ["day-planner-agent", "planning", "agent"],
  ["idea-vault", "ideas", "service"],
  ["idea-bot", "ideas", "agent"],
  ["idea-analysis-agent", "ideas", "agent"],
  ["family-expenses", "family-budget", "service"],
  ["expense-bot", "family-budget", "agent"],
  ["recipe-book", "recipes", "service"],
  ["recipe-bot", "recipes", "agent"],
  ["meal-planning-agent", "recipes", "agent"],
  ["child-schedule", "family-schedule", "service"],
  ["family-reminder-bot", "family-schedule", "agent"],
  ["fitness-tracker", "habits", "service"],
  ["habit-bot", "habits", "agent"],
  ["home-helper", "household", "service"],
  ["home-organizer-agent", "household", "agent"],
  ["consultant-bot", "consultant-agent", undefined],
  ["personal-content-agent", "content-agent", undefined],
  ["material-delivery-bot", "online-school-agent", undefined],
  ["faq-bot", "online-school-agent", undefined],
  ["lead-bot", "lead-agent", undefined],
  ["booking-bot", "booking-agent", undefined],
  ["questionnaire-bot", "brief-agent", undefined],
  ["quiz-bot", "selector-agent", undefined],
] as const;

for (const [oldSlug, slug, output] of cases) {
  expect(resolvePublicProjectRoute(oldSlug)).toMatchObject({ slug, output });
}
expect(resolvePublicProjectRoute("consultant-agent")).toEqual({ slug: "consultant-agent", output: undefined, legacy: false });
expect(resolvePublicProjectRoute("content-agent")).toEqual({ slug: "content-agent", output: undefined, legacy: false });
expect(resolvePublicProjectRoute("online-school-agent")).toEqual({ slug: "online-school-agent", output: undefined, legacy: false });
expect(resolvePublicProjectRoute("missing-project")).toBeUndefined();
```

- [ ] **Step 2: Запустить тест и подтвердить падение**

Run: `npx vitest run app/content/project-routes.test.ts`

Expected: FAIL — модуль маршрутов отсутствует.

- [ ] **Step 3: Реализовать нормализатор и канонический query**

```ts
export type ResolvedProjectRoute = { slug: string; output?: ProjectFormat; legacy: boolean };

const aliases = new Map<string, Omit<ResolvedProjectRoute, "legacy">>([
  ["planner", { slug: "planning", output: "service" }],
  ["planner-bot", { slug: "planning", output: "agent" }],
  ["day-planner-agent", { slug: "planning", output: "agent" }],
  ["idea-vault", { slug: "ideas", output: "service" }],
  ["idea-bot", { slug: "ideas", output: "agent" }],
  ["idea-analysis-agent", { slug: "ideas", output: "agent" }],
  ["family-expenses", { slug: "family-budget", output: "service" }],
  ["expense-bot", { slug: "family-budget", output: "agent" }],
  ["recipe-book", { slug: "recipes", output: "service" }],
  ["recipe-bot", { slug: "recipes", output: "agent" }],
  ["meal-planning-agent", { slug: "recipes", output: "agent" }],
  ["child-schedule", { slug: "family-schedule", output: "service" }],
  ["family-reminder-bot", { slug: "family-schedule", output: "agent" }],
  ["fitness-tracker", { slug: "habits", output: "service" }],
  ["habit-bot", { slug: "habits", output: "agent" }],
  ["home-helper", { slug: "household", output: "service" }],
  ["home-organizer-agent", { slug: "household", output: "agent" }],
  ["consultant-bot", { slug: "consultant-agent" }],
  ["personal-content-agent", { slug: "content-agent" }],
  ["material-delivery-bot", { slug: "online-school-agent" }],
  ["faq-bot", { slug: "online-school-agent" }],
  ["lead-bot", { slug: "lead-agent" }],
  ["booking-bot", { slug: "booking-agent" }],
  ["questionnaire-bot", { slug: "brief-agent" }],
  ["quiz-bot", { slug: "selector-agent" }],
]);

export function resolvePublicProjectRoute(slug: string, output?: string): ResolvedProjectRoute | undefined {
  const direct = getProject(slug);
  if (direct) {
    const safeOutput = isProjectBundle(direct) && (output === "service" || output === "agent") ? output : undefined;
    return { slug, output: safeOutput, legacy: false };
  }
  const alias = aliases.get(slug);
  return alias ? { ...alias, legacy: true } : undefined;
}

export function canonicalQuestQuery(route: ResolvedProjectRoute, mobile: boolean): string {
  const query = new URLSearchParams();
  if (mobile) query.set("format", "mobile");
  query.set("quest", route.slug);
  if (route.output) query.set("output", route.output);
  return `?${query.toString()}`;
}
```

- [ ] **Step 4: Проверить канонический query и повреждённый output**

```ts
expect(canonicalQuestQuery({ slug: "planning", output: "agent", legacy: true }, false))
  .toBe("?quest=planning&output=agent");
expect(canonicalQuestQuery({ slug: "recipes", output: "service", legacy: true }, true))
  .toBe("?format=mobile&quest=recipes&output=service");
expect(resolvePublicProjectRoute("planning", "broken")).toEqual({
  slug: "planning",
  output: undefined,
  legacy: false,
});
```

- [ ] **Step 5: Запустить тесты маршрутов**

Run: `npx vitest run app/content/project-routes.test.ts`

Expected: PASS — 25 legacy alias и 3 сохранённых canonical адреса определены независимо от UI.

- [ ] **Step 6: Закоммитить маршрутизацию**

```bash
git add app/content/project-routes.ts app/content/project-routes.test.ts
git commit -m "feat: preserve legacy quest links"
```

---

### Task 3: Сохранить формат и полностью изолировать состояния веток

**Files:**
- Create: `app/lib/output-format.ts`
- Create: `app/lib/output-format.test.ts`
- Modify: `app/lib/progress.ts`
- Modify: `app/lib/progress.test.ts`
- Modify: `app/lib/customization.ts`
- Modify: `app/lib/customization.test.ts`

**Interfaces:**
- Produces: `outputChoiceKey()`, `parseOutputChoice()`, `loadOutputChoice()`, `saveOutputChoice()`, `resetOutputChoice()`, `branchStorageSlug()`, `resetBundleState()`, `getCatalogProjectProgress()`, `getCatalogStats()` и разделение storage/profile slug для кастомизации.
- Consumes: storage reset helpers из progress/preparation/customization.

- [ ] **Step 1: Написать падающие тесты хранения**

```ts
expect(outputChoiceKey("planning", "desktop")).toBe("feya-academy-output-v1:planning");
expect(outputChoiceKey("planning", "mobile")).toBe("feya-academy-output-v1:mobile:planning");
expect(branchStorageSlug("planning", "service", "desktop")).toBe("planning:service");
expect(branchStorageSlug("planning", "agent", "desktop")).toBe("planning:agent");
expect(branchStorageSlug("planning", "service", "mobile")).toBe("mobile:planning:service");
expect(parseOutputChoice('"service"')).toBe("service");
expect(parseOutputChoice('"broken"')).toBeUndefined();
expect(parseOutputChoice("bad json")).toBeUndefined();
```

Добавить второй тест: сохранить прогресс обеих веток, подготовку, кастомизацию и соседний проект; вызвать `resetBundleState("planning", "desktop", storage)`; убедиться, что шесть branch-ключей и choice удалены, а соседний проект и `mobile:planning:*` остались.

- [ ] **Step 2: Запустить тест и подтвердить падение**

Run: `npx vitest run app/lib/output-format.test.ts app/lib/progress.test.ts`

Expected: FAIL — функций ещё нет.

- [ ] **Step 3: Реализовать безопасное хранение выбора**

```ts
const PREFIX = "feya-academy-output-v1";

export function outputChoiceKey(slug: string, surface: "desktop" | "mobile"): string {
  return `${PREFIX}:${surface === "mobile" ? "mobile:" : ""}${slug}`;
}

export function branchStorageSlug(slug: string, format: ProjectFormat, surface: "desktop" | "mobile"): string {
  return `${surface === "mobile" ? "mobile:" : ""}${slug}:${format}`;
}

export function parseOutputChoice(raw: string | null): ProjectFormat | undefined {
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw);
    return value === "service" || value === "agent" ? value : undefined;
  } catch {
    return undefined;
  }
}
```

`resetBundleState()` должен вызвать `resetProgress`, `resetPreparation`, `resetCustomization` для `service` и `agent`, затем удалить choice; он не итерирует по всему `localStorage` и не использует wildcard.

Изменить сигнатуры кастомизации, чтобы ключ хранения ветки не использовался как slug профиля:

```ts
export function loadCustomization(storageSlug: string, profileSlug: string, storage: StorageLike): QuestCustomization | undefined;
export function saveCustomization(storageSlug: string, profileSlug: string, value: QuestCustomization, storage: StorageLike): void;
```

Standalone-вызовы передают один slug дважды; bundle-вызовы передают `planning:service` как storage slug и `planner` как profile slug.

- [ ] **Step 4: Считать статистику карточки, а не сумму двух веток**

Для объединённого проекта брать сохранённый формат. Если формат ещё не выбран, показывать максимальный прогресс из двух веток, чтобы повреждённый choice не скрывал уже сделанную работу. Карточка считается завершённой, когда завершена выбранная или наиболее продвинутая ветка. Score одной карточки равен score выбранной/наиболее продвинутой ветки, а не сумме двух.

Ожидаемый общий объект пустого каталога:

```ts
{
  totalProjects: 38,
  startedProjects: 0,
  completedProjects: 0,
  completedSteps: 0,
  totalSteps: 646,
  score: 0,
}
```

- [ ] **Step 5: Запустить тесты хранения и статистики**

Run: `npx vitest run app/lib/output-format.test.ts app/lib/progress.test.ts`

Expected: PASS.

- [ ] **Step 6: Закоммитить состояние веток**

```bash
git add app/lib/output-format.ts app/lib/output-format.test.ts app/lib/progress.ts app/lib/progress.test.ts app/lib/customization.ts app/lib/customization.test.ts
git commit -m "feat: isolate bundled quest state"
```

---

### Task 4: Добавить понятный выбор «Сервис или ИИ-агент» в каталог и квест

**Files:**
- Create: `app/components/QuestFormatChoice.tsx`
- Create: `app/components/AppRoutes.test.tsx`
- Modify: `app/components/AppEntry.tsx`
- Modify: `app/components/Quest.tsx`
- Modify: `app/components/MobileQuest.tsx`
- Modify: `app/components/ProjectCard.tsx`
- Modify: `app/components/ProjectPreview.tsx`
- Modify: `app/components/Academy.tsx`
- Modify: `app/components/MobileAcademy.tsx`
- Modify: `app/globals.css`
- Modify: `app/components/App.test.tsx`

**Interfaces:**
- Consumes: bundle types, route `output`, storage helpers.
- Produces: формат до data mode, два мини-прототипа, полный сброс объединения.

- [ ] **Step 1: Написать падающие UI-тесты выбора**

```ts
render(<Quest project={getProject("planning")!} onHome={vi.fn()} />);
expect(screen.getByRole("heading", { name: /что вы хотите создать/i })).toBeInTheDocument();
expect(screen.getByRole("button", { name: /выбрать сервис/i })).toBeInTheDocument();
expect(screen.getByRole("button", { name: /выбрать ИИ-агента/i })).toBeInTheDocument();
expect(screen.queryByRole("heading", { name: /на каких данных/i })).not.toBeInTheDocument();

fireEvent.click(screen.getByRole("button", { name: /не знаю, что выбрать/i }));
expect(screen.getByText(/в сервисе вы нажимаете кнопки/i)).toBeInTheDocument();
expect(screen.getByText(/агент понимает текст и голос/i)).toBeInTheDocument();

fireEvent.click(screen.getByRole("button", { name: /выбрать ИИ-агента/i }));
expect(screen.getByRole("heading", { name: /на каких данных/i })).toBeInTheDocument();
expect(localStorage.getItem(outputChoiceKey("planning", "desktop"))).toBe('"agent"');
```

Добавить аналогичный тест mobile и тест, что самостоятельный `pressure-diary` сразу показывает выбор данных.

- [ ] **Step 2: Запустить тест и подтвердить падение**

Run: `npx vitest run app/components/App.test.tsx`

Expected: FAIL — формат-пикер отсутствует.

- [ ] **Step 3: Создать QuestFormatChoice без технических терминов**

Компонент обязан показывать:

```tsx
<h2>Что вы хотите создать?</h2>
<p>Обе версии решают одну задачу. Отличается только способ общения.</p>

<button aria-label="Выбрать сервис">
  <small>Экран с кнопками</small>
  <h3>Сервис</h3>
  <p>Вы сами добавляете и меняете данные в красивом приложении.</p>
  <b>Выбрать сервис →</b>
</button>

<button aria-label="Выбрать ИИ-агента">
  <small>Разговор текстом или голосом</small>
  <h3>ИИ-агент</h3>
  <p>Вы рассказываете своими словами, а агент уточняет и готовит результат.</p>
  <b>Выбрать ИИ-агента →</b>
</button>
```

Кнопка «Не знаю, что выбрать» раскрывает две строки: «В сервисе вы нажимаете кнопки и сами управляете записями» и «ИИ-агент понимает текст и голос, задаёт вопросы и сам предлагает следующий шаг».

- [ ] **Step 4: Подключить выбор в Quest и MobileQuest**

Порядок вычисления выбора для bundle: route output → сохранённый choice → экран выбора. После выбора вычислить concrete project и branch storage slug. Только после этого загружать preparation/progress/customization. `buildQuest` и `buildMobileQuest` никогда не вызываются для bundle-карточки без concrete branch.

Точные props:

```ts
type QuestProps = {
  project: CatalogProject;
  initialOutput?: ProjectFormat;
  onOutputChange: (output: ProjectFormat) => void;
  onHome: () => void;
};
```

`Quest` и `MobileQuest` передают concrete slug отдельно от branch storage slug:

```ts
const concrete = resolveProjectVariant(project, output);
const storageSlug = isProjectBundle(project)
  ? branchStorageSlug(project.slug, output!, surface)
  : `${surface === "mobile" ? "mobile:" : ""}${project.slug}`;

const profileSlug = concrete?.slug ?? project.slug;
const storedCustomization = loadCustomization(storageSlug, profileSlug, window.localStorage);
```

`AppEntry` расширяет route и подключает нормализатор:

```ts
type Route =
  | { type: "home"; format: "desktop" | "mobile" }
  | { type: "quest"; slug: string; output?: ProjectFormat; format: "desktop" | "mobile" }
  | { type: "capture"; slug: string; step: number }
  | { type: "capture-mobile"; slug: string; step: number }
  | { type: "capture-guide"; slug: string; mode: "real" | "demo"; step: number; frame: number };
```

`?quest=` разрешается через `resolvePublicProjectRoute`; legacy URL заменяется каноническим через `history.replaceState`. `?capture=`, `?capture-mobile=` и `?capture-guide=` используют `getQuestProject(concreteSlug)` напрямую. Неизвестный `?quest=` открывает каталог. `onOutputChange` обновляет route и URL без перезагрузки.

При сбросе bundle показать:

```text
Сбросить проект «Планирование» и начать с нуля?

Будут удалены выбор формата, прогресс, ответы и оформление сервиса и ИИ-агента только в этом проекте. Остальные проекты сохранятся.
```

После подтверждения вернуть экран формата. Для самостоятельного проекта оставить текущую логику.

- [ ] **Step 5: Сделать двойной прототип на семи карточках**

`ProjectPreview` для bundle выводит два `img`:

```tsx
<figure className="project-preview project-preview-bundle">
  <div>
    <img src={`/screens/${project.formats.service.slug}/step-14.png`} alt={`Сервис проекта «${project.title}»`} />
    <img src={`/screens/${project.formats.agent.slug}/step-14.png`} alt={`ИИ-агент проекта «${project.title}»`} />
  </div>
  <figcaption><span>✦</span> 2 формата внутри</figcaption>
</figure>
```

Карточка показывает `Недели 1–2 · Сервис или ИИ-агент`, `2 формата внутри` и `17 уровней в выбранном пути`.

- [ ] **Step 6: Обновить каталог и фильтры**

Фильтр недели использует `project.weeks.includes(week)` для bundle и `project.week === week` для самостоятельного. На desktop и mobile:

- общий каталог — 38 ссылок;
- bundle виден и в неделе 1, и в неделе 2, но в общем каталоге только один раз;
- desktop и mobile статистика — 38 проектов;
- в футере mobile — «Один телефон. Тридцать восемь проектов. Новая профессия.».

- [ ] **Step 7: Добавить адаптивные стили**

Экран выбора: две большие карточки на desktop, одна колонка на ширине до 700 px; минимальная высота кнопки 180 px desktop и 150 px mobile; фокус видим; кликабельна вся карточка. Двойной preview: сервис слева, чат агента справа, подписи не перекрывают изображения, на 390 px обе миниатюры остаются различимыми.

- [ ] **Step 8: Проверить legacy route в подключённом UI**

```ts
window.history.replaceState({}, "", "/?quest=planner-bot");
render(<AppEntry />);
expect(await screen.findByRole("heading", { name: "Планирование" })).toBeInTheDocument();
expect(screen.getByText(/Формат: ИИ-агент/i)).toBeInTheDocument();
expect(window.location.search).toBe("?quest=planning&output=agent");

window.history.replaceState({}, "", "/?quest=missing-project");
render(<AppEntry />);
expect(await screen.findByRole("heading", { name: /выбери проект/i })).toBeInTheDocument();
```

- [ ] **Step 9: Запустить UI-тесты**

Run: `npx vitest run app/components/App.test.tsx app/components/AppRoutes.test.tsx app/lib/progress.test.ts`

Expected: PASS — 38 карточек, 45 картинок в каталоге (31 одиночная + 14 внутри семи двойных), формат до data mode, независимый mobile choice, точный reset.

- [ ] **Step 10: Закоммитить выбор формата**

```bash
git add app/components/QuestFormatChoice.tsx app/components/AppEntry.tsx app/components/AppRoutes.test.tsx app/components/Quest.tsx app/components/MobileQuest.tsx app/components/ProjectCard.tsx app/components/ProjectPreview.tsx app/components/Academy.tsx app/components/MobileAcademy.tsx app/globals.css app/components/App.test.tsx
git commit -m "feat: add service or ai agent choice"
```

---

### Task 5: Создать предметные контракты агентов и кастомизацию всех 45 путей

**Files:**
- Create: `app/content/agent-contracts.ts`
- Create: `app/content/agent-contracts.test.ts`
- Modify: `app/content/types.ts`
- Modify: `app/content/customization.ts`
- Modify: `app/lib/customization.test.ts`
- Modify: `app/components/QuestCustomizer.tsx`

**Interfaces:**
- Produces: `AgentContract`, `agentContracts`, `getAgentContract()` и customization profiles всех concrete paths.
- Consumes: `getQuestProject()` и palette/customization types.

- [ ] **Step 1: Написать падающий тест полноты и уникальности**

```ts
const agents = questProjects.filter((project) => project.kind === "agent");
expect(agents).toHaveLength(21);
expect(agentContracts).toHaveLength(21);
expect(new Set(agentContracts.map((item) => item.slug)).size).toBe(21);

for (const project of agents) {
  const contract = getAgentContract(project.slug);
  expect(contract.requiredFields.length, project.slug).toBeGreaterThanOrEqual(3);
  expect(contract.resultItems.length, project.slug).toBeGreaterThanOrEqual(3);
  expect(contract.selfCheck.length, project.slug).toBeGreaterThanOrEqual(3);
  expect(contract.handoff.length, project.slug).toBeGreaterThan(20);
  expect(contract.inputExample, project.slug).not.toMatch(/нажмите кнопку|выберите кнопку/i);
}

expect(new Set(agentContracts.map((item) => item.inputExample)).size).toBe(21);
expect(new Set(agentContracts.map((item) => item.resultTitle)).size).toBe(21);
```

- [ ] **Step 2: Запустить тест и подтвердить падение**

Run: `npx vitest run app/content/agent-contracts.test.ts app/lib/customization.test.ts`

Expected: FAIL — контрактов нет.

- [ ] **Step 3: Добавить тип контракта**

```ts
export type AgentContract = {
  slug: string;
  theme: string;
  role: string;
  inputExample: string;
  voiceExample: string;
  requiredFields: string[];
  firstQuestion: string;
  answerExample: string;
  decisionRule: string;
  resultTitle: string;
  resultItems: string[];
  selfCheck: string[];
  confirmationRule: string;
  handoff: string;
};

type AgentContractSeed = Pick<
  AgentContract,
  "slug" | "inputExample" | "firstQuestion" |
  "decisionRule" | "resultTitle" | "handoff"
> & { externalAction: string };

function agent(seed: AgentContractSeed): AgentContract {
  const project = getQuestProject(seed.slug);
  if (!project || project.kind !== "agent") throw new Error(`Не найден ИИ-агент ${seed.slug}`);
  const { externalAction, ...base } = seed;
  return {
    ...base,
    theme: seed.slug,
    role: project.title,
    voiceExample: `Голосовое сообщение: ${seed.inputExample}`,
    answerExample: project.demo[1],
    requiredFields: [...project.entities],
    resultItems: project.features.slice(0, 3),
    selfCheck: [
      `Заполнены поля: ${project.entities.join(", ")}`,
      "В ответе нет фактов, которых пользователь не сообщал и которых нет в подтверждённых материалах",
      `Соблюдено ограничение: ${project.safety}`,
    ],
    confirmationRule: `Перед действием «${externalAction}» покажи точный черновик и дождись фразы «Да, подтверждаю».`,
  };
}
```

- [ ] **Step 4: Заполнить точную предметную матрицу**

Каждая строка ниже становится отдельным объектом `AgentContract`; формулировки используются и в промптах, и в прототипах:

| slug | Вход пользователя | Первый вопрос | Правило решения | Итог | Без подтверждения нельзя | Передача человеку |
|---|---|---|---|---|---|---|
| `day-planner-agent` | «До 16:00 работа, в 17:30 врач, ещё купить продукты» | «Какое одно дело сегодня нельзя переносить?» | сначала фиксированное время, затем главное дело, затем запас | «Реалистичный план дня» | менять внешний календарь | конфликт встреч или невыполнимый срок |
| `idea-analysis-agent` | «У меня 12 идей для блога и курса, не понимаю, с чего начать» | «Что важнее на этой неделе: быстро сделать или сильнее продать?» | группировка → критерий → три приоритета → один следующий шаг | «Три идеи на эту неделю» | удалять или публиковать идею | решение требует фактов, которых нет в ответах |
| `expense-agent` | «3450 продукты, вчера вечером» | «Записать это в “Продукты” или в вашу другую категорию?» | извлечь сумму/дату/категорию, уточнить только отсутствующее, подтвердить перед записью | «Расход подготовлен к сохранению» | сохранять или изменять финансовую запись | спорная сумма, чужие банковские данные или финансовый совет |
| `meal-planning-agent` | «Нужно меню на три дня: двое взрослых и ребёнок, без орехов» | «Сколько времени максимум можно готовить в будни?» | ограничения → продукты дома → три блюда → общий список покупок | «Меню на три дня и покупки» | оформлять заказ продуктов | аллергия не подтверждена или запрашивается лечебная диета |
| `family-schedule-agent` | «Во вторник плавание 17:30, в четверг музыка 16:00» | «Для кого поставить символ: Ребёнок А или Ребёнок Б?» | обезличить → проверить время → найти пересечение → подготовить напоминание | «Спокойная семейная неделя» | добавлять событие или отправлять напоминание | адрес, геолокация или полный профиль ребёнка |
| `habit-agent` | «Хочу гулять 20 минут, но часто пропускаю» | «В какое самое лёгкое время прогулка обычно возможна?» | минимальный шаг → мягкое напоминание → отметка без штрафа | «Бережный план привычки» | включать внешние напоминания | боль, ухудшение самочувствия или медицинская рекомендация |
| `home-organizer-agent` | «Заказать воду, разобрать детскую, сменить бельё» | «Что из этого обязательно сделать сегодня?» | срочность → зона → исполнитель → реалистичный повтор | «Домашний план без перегруза» | назначать дело другому человеку | спор между людьми или действие требует чужого согласия |
| `lead-agent` | «Хочу консультацию, не понимаю, какой формат мне подходит» | «Какой результат вы хотите получить после консультации?» | потребность → подходящая услуга → контакт → передача владельцу | «Карточка новой заявки» | отправлять заявку владельцу | обещание результата, оплата или чувствительный запрос |
| `booking-agent` | «Можно записаться в пятницу после 14:00?» | «Какая услуга и длительность вам нужны?» | собрать параметры → сверить только с подключённым расписанием → предложить подтверждённые слоты | «Черновик записи» | подтверждать, переносить или отменять запись | расписание не подключено, слот изменился или нужна отмена |
| `brief-agent` | «Мне нужен сайт, но я не знаю, что написать» | «Кому сайт должен помочь в первую очередь?» | один вопрос за раз → сводка → пробелы → подтверждение | «Понятный бриф проекта» | передавать бриф исполнителю | ответ содержит секреты или противоречие должен решить заказчик |
| `selector-agent` | «Какой тариф мне выбрать?» | «Вам важнее сделать самостоятельно или получить поддержку?» | прозрачные критерии → сравнение → объяснимая рекомендация | «Подбор с объяснением» | оформлять тариф, заявку или оплату | нет подтверждённых условий или решение финансово значимо |
| `study-agent` | «Объясни простыми словами, что такое воронка» | «Вы хотите короткий пример или разбор по шагам?» | объяснение → пример → три вопроса на понимание | «Объяснение и мини-проверка» | выставлять оценку или отправлять результат преподавателю | оценивание, которого нет в правилах курса |
| `content-agent` | «Вот моя история и материалы продукта — собери контент на неделю» | «Что обязательно должно остаться в вашем личном голосе?» | отделить факты от истории → сохранить тон → идеи → черновики → фактчек | «Контент-план в голосе автора» | публиковать или планировать публикацию | нет подтверждения кейса, цифры, отзыва или права публикации |
| `expert-assistant-agent` | «Подготовь план встречи по запросу клиента» | «Какой результат встречи обещан в ваших материалах?» | база эксперта → запрос → план → источники → границы | «План встречи со ссылками на базу» | отправлять материал клиенту | профильное заключение или вопрос вне базы |
| `sales-manager-agent` | «Клиент спрашивает, подойдёт ли ему пакет “Старт”» | «Какую задачу клиент хочет решить сейчас?» | потребность → соответствие условиям → спокойный следующий шаг | «Этичный черновик предложения» | отправлять предложение, скидку, договор или ссылку оплаты | скидка, гарантия, договор или оплата |
| `administrator-agent` | «Есть ли свободное время в пятницу?» | «Какая услуга и длительность вам нужны?» | правила → источник расписания → ответ или передача | «Организационный ответ без выдумок» | подтверждать цену, слот или запись | нет живого расписания, цена не подтверждена или конфликт |
| `consultant-agent` | «Что входит в первый месяц сопровождения?» | «Вам нужен самостоятельный формат или вариант с поддержкой?» | уточнение → ответ только по базе → источник → ограничение | «Ответ по двум подтверждённым источникам» | отправлять индивидуальную рекомендацию как заключение | медицинский, юридический, финансовый или индивидуальный вывод |
| `online-school-agent` | «Где шаблон и что делать после второго урока?» | «Какой курс, модуль и тариф у вас открыт?» | проверить доступ → найти урок/FAQ/материал → дать одно действие → куратор | «Маршрут ученицы до следующего шага» | выдавать закрытый материал или менять доступ | закрытый материал, техническая ошибка или личная проверка работы |
| `event-organizer-agent` | «Вебинар 28 августа, нужно ничего не забыть» | «Какая одна дата или действие уже точно зафиксированы?» | дата → зависимости → ответственные → точки 7 дней/24 часа | «План события и ближайший риск» | отправлять сообщения или менять календарь | отправка сообщения, изменение календаря или неподтверждённый участник |
| `client-care-agent` | «Клиент ждёт макет в пятницу, помоги ответить» | «Какой срок вы действительно можете подтвердить?» | обезличить → обещания → срок → черновик → следующий шаг | «Сводка договорённостей и ответ» | отправлять ответ клиенту | автоматическая отправка или обещание без подтверждения владельца |
| `fairy-team-agent` | «Сделайте пост о курсе по программе и моему голосовому» | «Какой один итог должны передать три феи?» | исследователь собирает → автор пишет → редактор проверяет → один финал | «Один материал после трёх ролей» | публиковать итоговый материал | сомнительный факт, закрытый материал или публикация без автора |

Каждую строку передать в helper `agent()`: slug определяет уникальную тему, project entities становятся `requiredFields`, первые три project features становятся `resultItems`, а safety — третьей строкой `selfCheck`. Столбец «Без подтверждения нельзя» передаётся как `externalAction`; helper превращает его в точный `confirmationRule` с фразой «Да, подтверждаю».

- [ ] **Step 5: Дать каждому из 45 путей собственную кастомизацию**

Сохранить четыре полностью ручных профиля `family-expenses`, `planner`, `idea-vault`, `child-schedule`. Для остальных 41 concrete paths `getCustomizationProfile(slug)` строит профиль из предметных полей проекта, а для агента дополнительно использует контракт.

Каждый профиль возвращает:

- аудитория: текущая аудитория проекта + «для себя» + «для заказчика» + «свой вариант»;
- цель: `contract.resultTitle` + две функции проекта;
- имя: текущее название + два коротких предметных имени; у любого поля остаётся «Свой вариант»;
- стиль: «Чат как переписка», «Карточка результата», «Спокойная рабочая панель»;
- тон: «Мягко и заботливо», «Коротко и нейтрально», «Делово без давления»;
- особенность: первые четыре функции проекта;
- цветовая гамма: текущие шесть готовых палитр или собственная.

Добавить в `QuestCustomizationProfile` поле:

```ts
preview: { caption: string; metric: string; action: string };
```

Для ручных профилей заполнить существующие предметные preview. Для остальных брать `caption` из результата проекта, `metric` из первого demo-примера и `action` из первой функции. `QuestCustomizer` использует `profile.preview`, а не fallback семейного бюджета.

`customizationSummary()` должен называть реальный вид результата: «Я создаю сервис…», «Я создаю ИИ-агента…» или «Я создаю сайт…». Добавить тест, что все 45 concrete paths имеют профиль, шесть осей, preview и palette; отдельно проверить сохранение своей аудитории, имени и палитры для `lead-agent` и отдельного mobile key `mobile:lead-agent`.

- [ ] **Step 6: Запустить тесты контрактов и кастомизации**

Run: `npx vitest run app/content/agent-contracts.test.ts app/lib/customization.test.ts`

Expected: PASS — 21 уникальный контракт и сохраняемая персонализация всех 45 concrete paths.

- [ ] **Step 7: Закоммитить контракты**

```bash
git add app/content/agent-contracts.ts app/content/agent-contracts.test.ts app/content/types.ts app/content/customization.ts app/lib/customization.test.ts app/components/QuestCustomizer.tsx
git commit -m "feat: define unique ai agent contracts"
```

---

### Task 6: Переписать каждый агентский квест как настоящий агентский путь

**Files:**
- Modify: `app/content/builders/agent.ts`
- Modify: `app/content/quests.ts`
- Modify: `app/content/quests.test.ts`
- Modify: `app/content/preparation/week-2.ts`
- Modify: `app/content/preparation/week-3.ts`
- Modify: `app/content/preparation/index.ts`
- Modify: `app/lib/preparation.ts`

**Interfaces:**
- Consumes: `AgentContract`, `QuestCustomization`, data-mode adapter.
- Produces: 17 разных, но структурно согласованных уровней каждого агента.

- [ ] **Step 1: Написать падающие поведенческие тесты**

```ts
for (const project of questProjects.filter((item) => item.kind === "agent")) {
  const steps = buildQuest(project, "demo", defaultCustomization(project.slug));
  const text = stepText(steps);
  const contract = getAgentContract(project.slug);
  expect(steps).toHaveLength(17);
  expect(text, project.slug).toContain(contract.inputExample);
  expect(text, project.slug).toContain(contract.firstQuestion);
  expect(text, project.slug).toContain(contract.resultTitle);
  expect(text, project.slug).toContain(contract.handoff);
  expect(text, project.slug).toMatch(/свободн.+текст|своими словами/i);
  expect(text, project.slug).toMatch(/голос/i);
  expect(text, project.slug).toMatch(/один вопрос за раз/i);
  expect(text, project.slug).toMatch(/самопроверк|проверь результат/i);
  expect(text, project.slug).toMatch(/подтверждаю/i);
  expect(text, project.slug).not.toMatch(/нажмите кнопку.+ветк|кнопочный сценарий/i);
}
```

Добавить точечные тесты `expense-agent`, `booking-agent`, `online-school-agent`, `content-agent`: предметные поля, запрет выдумывать слот/факт/доступ и клиентская копия на уровне 16.

- [ ] **Step 2: Запустить тесты и подтвердить падение**

Run: `npx vitest run app/content/quests.test.ts`

Expected: FAIL — текущий agent builder использует общий проектный шаблон и не содержит контрактов.

- [ ] **Step 3: Реализовать точную карту 17 уровней**

`buildAgentQuest(project, customization)` создаёт уровни:

1. «Увидела живой диалог» — вход, уточнение, результат из контракта.
2. «Собрала своего ИИ-агента» — имя, аудитория, тон, особенность, палитра.
3. «Ответила Codex обычными словами» — один короткий вопрос за раз; реальные и demo данные разделяет существующий adapter.
4. «Codex создал проект сам» — ни одной ручной папки или файла.
5. «Подтвердила паспорт агента» — роль, входы, поля, решение, результат, границы.
6. «Установила мастер-инструкцию» — готовый полный system prompt.
7. «Проверила свободный текст» — `inputExample`, извлечение `requiredFields`.
8. «Проверила голосовое сообщение» — `voiceExample`, текстовая расшифровка и подтверждение смысла.
9. «Агент задал один нужный вопрос» — `firstQuestion`, не анкета целиком.
10. «Агент выбрал следующий шаг» — `decisionRule` и простое объяснение решения.
11. «Получила полезный результат» — `resultTitle` и `resultItems`.
12. «Агент провёл самопроверку» — все `selfCheck` и исправление только найденной ошибки.
13. «Защитила внешние действия» — `confirmationRule`, точная фраза «Да, подтверждаю».
14. «Проверила границу и передачу человеку» — `handoff`.
15. «Запустила личную версию в Telegram» — техническая оболочка + мобильный тест текста/голоса.
16. «Сделала клиентскую копию» — отдельный проект, восемь вопросов по одному, экран «было / станет», никакой правки до подтверждения.
17. «Упаковала две версии в портфолио» — личная и клиентская версии, роль ученицы, ограничения, три безопасных кадра.

Каждый prompt содержит конкретные поля контракта и `customizationSummary`; нельзя подставлять абстрактные «сущность 1» или «функция 2».

- [ ] **Step 4: Сформировать мастер-инструкцию агента без скрытых пробелов**

```ts
function masterPrompt(project: ProjectDefinition, contract: AgentContract, c: QuestCustomization): string {
  return `Создай ИИ-агента «${c.name}» для ${c.audience}. Пользователь пишет свободным текстом или отправляет голосовое. Агент извлекает: ${contract.requiredFields.join(", ")}. Если одного обязательного факта не хватает, задай строго один короткий вопрос: «${contract.firstQuestion}». После ответа действуй по правилу: ${contract.decisionRule}. Подготовь результат «${contract.resultTitle}» со строками: ${contract.resultItems.join("; ")}. Перед показом проверь: ${contract.selfCheck.join("; ")}. Не выполняй внешнее действие без фразы «Да, подтверждаю»: ${contract.confirmationRule}. Передай человеку ситуацию: ${contract.handoff}. Тон: ${c.tone}. Особенность: ${c.feature}. Цветовая гамма: ${paletteDescription(c.palette)}. Не придумывай отсутствующие факты.`;
}
```

- [ ] **Step 5: Переписать профили подготовки без публичного слова «бот»**

`week-2.ts` содержит семь личных agent profiles: `day-planner-agent`, `idea-analysis-agent`, `expense-agent`, `meal-planning-agent`, `family-schedule-agent`, `habit-agent`, `home-organizer-agent`.

`week-3.ts` содержит 14 самостоятельных agent profiles: `study-agent`, `lead-agent`, `booking-agent`, `brief-agent`, `selector-agent`, `content-agent`, `expert-assistant-agent`, `sales-manager-agent`, `administrator-agent`, `consultant-agent`, `online-school-agent`, `event-organizer-agent`, `client-care-agent`, `fairy-team-agent`.

Объединённые профили обязательно включают:

- `consultant-agent`: подбор подходящей услуги + ответ по подтверждённой базе + источник + граница;
- `content-agent`: личный голос + материалы эксперта + запрет выдумывать кейсы/цифры;
- `online-school-agent`: доступ к материалу + FAQ + маршрут по урокам + передача куратору.

`getPreparationProfileSlugs()` в тесте должен совпасть с `questProjects.map(slug)` без лишних публичных старых bot-slug.

- [ ] **Step 6: Обновить реальный режим**

Для agent-пути уровень 3 проводит единственный предметный опрос. Последующие уровни используют подтверждённые ответы и задают только один вопрос, если без него нельзя продолжить. Любой текст «создайте файл», «откройте папку», «подготовьте CSV» должен отсутствовать.

- [ ] **Step 7: Запустить quest/preparation тесты**

Run: `npx vitest run app/content/quests.test.ts app/lib/preparation.test.ts app/content/projects.test.ts`

Expected: PASS — 45 concrete quests × 17 = 765 levels, все agent-контракты присутствуют, real mode не смешан с demo.

- [ ] **Step 8: Закоммитить агентские квесты**

```bash
git add app/content/builders/agent.ts app/content/quests.ts app/content/quests.test.ts app/content/preparation/week-2.ts app/content/preparation/week-3.ts app/content/preparation/index.ts app/lib/preparation.ts app/lib/preparation.test.ts
git commit -m "feat: teach real conversational ai agents"
```

---

### Task 7: Дать каждому неагентскому пути личную и клиентскую версию

**Files:**
- Modify: `app/content/builders/shared.ts`
- Modify: `app/content/builders/service.ts`
- Modify: `app/content/builders/simple-site.ts`
- Modify: `app/content/builders/advanced-site.ts`
- Modify: `app/content/builders/portfolio.ts`
- Modify: `app/content/quests.ts`
- Modify: `app/content/quests.test.ts`
- Modify: `app/components/ExpectedScene.tsx`
- Modify: `app/components/MobileExpectedScene.tsx`

**Interfaces:**
- Consumes: `QuestCustomization`, `customizationSummary()`, concrete project fields.
- Produces: персонализированный мастер-промпт, опубликованная личная версия, восьмивопросный клиентский бриф и карточка двух версий для всех 24 неагентских путей; четыре ручных original services сохраняют свой уже более подробный сценарий.

- [ ] **Step 1: Написать падающие тесты повторения навыка для заказчика**

```ts
const nonAgents = questProjects.filter((project) => project.kind !== "agent");
expect(nonAgents).toHaveLength(24);
const originalSlugs = new Set(["family-expenses", "planner", "idea-vault", "child-schedule"]);
const genericNonAgents = nonAgents.filter((project) => !originalSlugs.has(project.slug));
expect(genericNonAgents).toHaveLength(20);

for (const project of genericNonAgents) {
  const customization = defaultCustomization(project.slug)!;
  const steps = buildQuest(project, "demo", customization);
  const text = stepText(steps);
  expect(text, project.slug).toContain(customization.name);
  expect(text, project.slug).toContain(customization.audience);
  expect(text, project.slug).toContain(customization.palette.name);
  expect(steps[14].title, project.slug).toMatch(/личн.+верси|аудит и публикац/i);
  expect(steps[15].title, project.slug).toMatch(/клиентск.+копи|заказчик/i);
  expect(steps[15].prompt, project.slug).toMatch(/восемь вопросов|8 вопросов/i);
  expect(steps[15].prompt, project.slug).toMatch(/по одному вопросу/i);
  expect(steps[15].prompt, project.slug).toMatch(/было.+станет/is);
  expect(steps[16].prompt, project.slug).toMatch(/личн.+верси.+клиентск.+верси/is);
}

for (const slug of originalSlugs) {
  const project = getQuestProject(slug)!;
  const steps = buildQuest(project, "demo", defaultCustomization(project.slug));
  expect(steps[13].title, slug).toMatch(/опубликовал/i);
  expect(steps[14].title, slug).toMatch(/клиентск.+копи/i);
  expect(steps[15].title, slug).toMatch(/бриф|адаптировал/i);
  expect(steps[16].title, slug).toMatch(/упаковал|портфолио/i);
}
```

Для `graduate-portfolio` клиентская версия означает отдельную копию витрины под выбранную услугу и аудиторию заказчиков, а не выдуманный клиентский проект.

- [ ] **Step 2: Запустить тест и подтвердить падение**

Run: `npx vitest run app/content/quests.test.ts`

Expected: FAIL — общий builder пока публикует на уровне 16 и не создаёт клиентскую копию.

- [ ] **Step 3: Применить кастомизацию ко всем общим построителям**

Добавить в `quests.ts` функцию:

```ts
function applyCustomization(
  steps: QuestStep[],
  project: ProjectDefinition,
  customization?: QuestCustomization,
): QuestStep[] {
  if (!customization) return steps;
  const summary = customizationSummary(project.slug, customization);
  return steps.map((step) => {
    if (![2, 4, 13, 15, 16, 17].includes(step.id)) return step;
    return {
      ...step,
      prompt: step.prompt ? `${step.prompt}\n\nМОЯ ВЕРСИЯ ПРОЕКТА: ${summary}` : undefined,
      help: { ...step.help, prompt: `${step.help.prompt}\n\nСохрани мою версию: ${summary}` },
    };
  });
}
```

Четыре original service builders продолжают использовать собственную глубокую кастомизацию и не получают второй дублирующий блок. Agent builder получает customization напрямую из Task 6.

- [ ] **Step 4: Перенести публикацию личной версии на уровень 15**

Для общего builder уровень 15 становится «Проверила и опубликовала личную версию». Prompt последовательно делает финальный аудит, исправляет только красные строки, убирает секреты, публикует и повторно проходит главный сценарий по готовой ссылке. Для advanced site он останавливается перед доменом/платёжным секретом и передаёт проверку куратору.

- [ ] **Step 5: Сделать уровень 16 клиентской копией**

```ts
const clientBrief = [
  "Кто будет пользоваться проектом?",
  "Какой один результат нужен пользователю?",
  "Какие исходные материалы уже есть?",
  `Какие функции обязательны: ${project.features.join(", ")}?`,
  "Как проект должен разговаривать с пользователем?",
  "Какая цветовая гамма и визуальный характер подходят?",
  "Какая одна особенная функция отличит эту версию?",
  `Какие ограничения и доступы нужно учесть: ${project.safety}?`,
];
```

Prompt: создать `${project.slug}-client` отдельно от личной версии; задавать восемь вопросов строго по одному; принимать голос или текст; отмечать «нужно уточнить» вместо догадки; после восьмого ответа показать «было / станет»; ничего не менять до подтверждения; затем адаптировать только клиентскую копию и прогнать основной сценарий.

- [ ] **Step 6: Сделать уровень 17 карточкой двух версий**

В портфолио показать «Личная версия» и «Клиентская версия / адаптация по тестовому брифу». Для каждой: аудитория, задача, четыре функции, особенность, ссылка, три безопасных кадра. Запретить выдумывать клиента, отзыв, доход и неподтверждённый результат.

- [ ] **Step 7: Обновить финальные expected scenes**

Step 15 показывает аудит + опубликованную личную ссылку; step 16 — две отдельные копии и подтверждённый бриф; step 17 — две карточки портфолио. Конкретное название, функции, аудитория и palette берутся из текущего project/customization, поэтому кадры разных проектов не повторяются по содержанию.

- [ ] **Step 8: Запустить все quest-тесты**

Run: `npx vitest run app/content/quests.test.ts app/components/App.test.tsx`

Expected: PASS — 24 неагентских пути имеют personal/client/portfolio flow; четыре original services сохраняют свои специальные сцены; 21 agent path остаётся зелёным.

- [ ] **Step 9: Закоммитить клиентские копии**

```bash
git add app/content/builders/shared.ts app/content/builders/service.ts app/content/builders/simple-site.ts app/content/builders/advanced-site.ts app/content/builders/portfolio.ts app/content/quests.ts app/content/quests.test.ts app/components/ExpectedScene.tsx app/components/MobileExpectedScene.tsx
git commit -m "feat: add client copy to every quest"
```

---

### Task 8: Переписать мобильный путь и терминологию Telegram

**Files:**
- Modify: `app/content/mobile.ts`
- Modify: `app/content/mobile.test.ts`
- Modify: `app/components/MobileActionButton.tsx`
- Modify: `app/components/MobileExpectedScene.tsx`
- Modify: `app/components/App.test.tsx`

**Interfaces:**
- Consumes: concrete project, agent contract, branch storage slug.
- Produces: мобильные шаги, которые реально выполняются через Telegram/Codex/Чатиум.

- [ ] **Step 1: Написать падающие mobile-тесты**

Для каждого agent-пути проверить:

```ts
const steps = buildMobileQuest(project, "real", defaultCustomization(project.slug));
const text = stepText(steps);
expect(text).toContain(getAgentContract(project.slug).inputExample);
expect(text).toContain(getAgentContract(project.slug).firstQuestion);
expect(text).toMatch(/голосом или текстом/i);
expect(text).toMatch(/один вопрос за раз/i);
expect(text).toMatch(/Да, подтверждаю/i);
expect(text).not.toMatch(/подготовьте.+файл|создайте.+папку/i);
```

Добавить тест публичной терминологии: собрать строки `projects`, всех desktop/mobile steps и видимых компонентов; после удаления точной разрешённой фразы «Telegram называет оболочку ботом, но внутри неё работает ваш ИИ-агент» не должно остаться `бот`, `бота`, `боты`, `ботом`, `ботов`.

- [ ] **Step 2: Запустить тесты и подтвердить падение**

Run: `npx vitest run app/content/mobile.test.ts app/components/App.test.tsx`

Expected: FAIL — текущий mobile builder содержит kind `bot` и кнопочный текст.

- [ ] **Step 3: Удалить `bot` из mobile maps**

```ts
const capabilityByKind: Record<ProjectKind, MobileCapabilityInfo> = {
  service: { id: "phone-full", label: "Полностью с телефона", detail: "Telegram и мобильный конструктор" },
  agent: { id: "phone-full", label: "Полностью с телефона", detail: "Текст, голос и проверка через Telegram" },
  "simple-site": { id: "phone-full", label: "Полностью с телефона", detail: "Сборка и публикация в Lovable" },
  "advanced-site": { id: "curator", label: "С помощью куратора", detail: "Домен, платежи и секреты проверяет куратор" },
  portfolio: { id: "phone-template", label: "С телефона по шаблону", detail: "Готовая мобильная витрина работ" },
};
```

Для агента использовать Чатиум; для сервиса/сайта Lovable. В Telegram-action note: «Фея откроет именно этот проект и этот уровень».

- [ ] **Step 4: Добавить точное техническое объяснение**

В единственном месте подключения:

```tsx
<p>
  Telegram называет оболочку ботом, но внутри неё работает ваш ИИ-агент.
  Технические шаги BotFather и Telegram Bot API выполнит куратор по инструкции.
</p>
```

Не использовать слово «бот» в названиях результата, кнопках карточки, статусах и портфолио.

- [ ] **Step 5: Передать предметный agent contract в мобильные уровни**

Уровни 4–8 показывают свободный ввод, голос, извлечённые поля и один уточняющий вопрос. Уровни 13–16 проверяют полный разговор, подтверждение внешнего действия, передачу человеку и клиентскую копию. `MobileExpectedScene` показывает конкретный `inputExample`, `firstQuestion`, `resultTitle`, `selfCheck`, а не одинаковую сцену для всех агентов.

- [ ] **Step 6: Синхронизировать personal/client flow остальных мобильных путей**

Для service/site/portfolio уровень 15 выполняет аудит и безопасную публикацию личной версии, уровень 16 создаёт `${project.slug}-client` через восемь вопросов по одному, уровень 17 упаковывает обе версии. Для advanced site на уровне 15 кнопка ведёт к куратору для домена, платежей и секретов; уровень 16 остаётся безопасной копией без реального платёжного ключа.

- [ ] **Step 7: Запустить mobile/UI тесты**

Run: `npx vitest run app/content/mobile.test.ts app/components/App.test.tsx`

Expected: PASS — 765 mobile levels, 21 предметный агентский путь, единственное допустимое техническое употребление «ботом».

- [ ] **Step 8: Закоммитить mobile path**

```bash
git add app/content/mobile.ts app/content/mobile.test.ts app/components/MobileActionButton.tsx app/components/MobileExpectedScene.tsx app/components/App.test.tsx
git commit -m "feat: make mobile quests agent first"
```

---

### Task 9: Сделать уникальные разговорные прототипы и убрать старую визуальную систему ботов

**Files:**
- Create: `app/components/AgentPrototypeScene.tsx`
- Create: `app/agent-prototypes.css`
- Modify: `app/components/ExpectedScene.tsx`
- Modify: `app/components/ProjectPreview.tsx`
- Modify: `app/globals.css`
- Modify: `app/components/App.test.tsx`
- Modify: `app/content/first-cover-prototypes.ts`
- Modify: `app/content/third-cover-prototypes.ts`
- Delete: `app/components/BotPrototypeScene.tsx`
- Delete: `app/content/bot-prototypes.ts`
- Delete: `app/content/bot-prototypes.test.ts`
- Delete: `app/content/builders/bot.ts`
- Delete: `app/bot-prototypes.css`
- Delete: `app/content/agent-cover-prototypes.ts`
- Delete: `app/content/agent-cover-prototypes.test.ts`
- Delete: `app/components/AgentCoverPrototypeScene.tsx`
- Delete: `app/agent-cover-prototypes.css`

**Interfaces:**
- Consumes: `AgentContract`, customization palette, concrete agent project.
- Produces: уникальный marker и содержимое каждого agent prototype.

- [ ] **Step 1: Написать падающий тест 21 прототипа**

```ts
const agents = questProjects.filter((item) => item.kind === "agent");
const { container } = render(<>{agents.map((project) => <ExpectedScene key={project.slug} project={project} step={14} />)}</>);

for (const project of agents) {
  const contract = getAgentContract(project.slug);
  const scene = container.querySelector(`[data-agent-prototype="${project.slug}"]`);
  expect(scene, project.slug).not.toBeNull();
  expect(scene, project.slug).toHaveTextContent(contract.inputExample);
  expect(scene, project.slug).toHaveTextContent(contract.firstQuestion);
  expect(scene, project.slug).toHaveTextContent(contract.resultTitle);
}
expect(new Set(agents.map((item) => getAgentContract(item.slug).theme)).size).toBe(21);
```

- [ ] **Step 2: Запустить тест и подтвердить падение**

Run: `npx vitest run app/components/App.test.tsx`

Expected: FAIL — нет нового scene/marker.

- [ ] **Step 3: Реализовать разговорный прототип**

`AgentPrototypeScene` содержит пять различимых частей:

```tsx
<div className={`agent-prototype agent-theme-${contract.theme}`} data-agent-prototype={project.slug}>
  <header><span>{project.symbol}</span><div><b>{project.title}</b><small>ИИ-агент · текст и голос</small></div><i>онлайн</i></header>
  <main>
    <div className="agent-message user">{contract.inputExample}</div>
    <div className="agent-message assistant"><b>Один вопрос</b>{contract.firstQuestion}</div>
    <div className="agent-message user voice"><span>▶</span>{contract.voiceExample}</div>
    <section className="agent-result">
      <small>ГОТОВЫЙ РЕЗУЛЬТАТ</small>
      <h4>{contract.resultTitle}</h4>
      {contract.resultItems.map((item) => <p key={item}><span>✓</span>{item}</p>)}
    </section>
    <footer><span>✓ Самопроверка пройдена</span><b>Рискованный вопрос → человеку</b></footer>
  </main>
</div>
```

На шагах 7–14 постепенно показывать вход, вопрос, голос, результат, self-check и handoff. 21 `theme` задаёт собственные accent/background/ink, но структура остаётся узнаваемой как разговор.

- [ ] **Step 4: Удалить маршрутизацию старых прототипов**

В `ExpectedScene.Visual` после специализированных четырёх сервисов и до cover registries:

```tsx
if (project.kind === "agent") return <AgentPrototypeScene project={project} step={step} />;
```

Удалить imports и ветки `BotPrototypeScene`, `AgentCoverPrototypeScene`, `hasAgentCoverPrototype`. Из `first-cover-prototypes` убрать `day-planner-agent`; из `third-cover-prototypes` убрать `online-school-agent`, потому что они теперь обслуживаются новым разговорным scene. Сайтовые entries сохранить. Удалить imports `bot-prototypes.css` и `agent-cover-prototypes.css` из `globals.css`, затем подключить `agent-prototypes.css`.

- [ ] **Step 5: Убедиться, что семь двойных карточек различимы**

На bundle-card слева всегда интерфейс сервиса (формы/карточки), справа всегда разговор агента (сообщения/голос/результат). Alt-тексты называют конкретную тему и формат. Ни один bundle не использует одинаковую пару concrete slugs.

- [ ] **Step 6: Запустить visual unit-тесты**

Run: `npx vitest run app/components/App.test.tsx app/content/first-cover-prototypes.test.ts app/content/third-cover-prototypes.test.ts`

Expected: PASS — 21 agent scenes уникальны по slug/theme/content; 38 cards используют правильные final prototypes.

- [ ] **Step 7: Закоммитить прототипы**

```bash
git add -A app/components app/content app/agent-prototypes.css app/globals.css app/bot-prototypes.css
git commit -m "feat: replace bot mockups with agent conversations"
```

---

### Task 10: Обновить генерацию 45 путей и переснять все затронутые экраны

**Files:**
- Modify: `scripts/projects.mjs`
- Modify: `scripts/capture-steps.mjs`
- Modify: `scripts/capture-mobile-steps.mjs`
- Modify: `scripts/verify-screens.mjs`
- Modify: `scripts/capture-site.mjs`
- Modify: `scripts/capture-selection.test.mjs`
- Regenerate: `public/screens/**`
- Regenerate: `public/screens-mobile/**`
- Regenerate: `artifacts/academy-desktop.png`
- Regenerate: `artifacts/academy-mobile.png`
- Regenerate: `artifacts/quest-mobile.png`

**Interfaces:**
- Consumes: 45 concrete slug из `projects.ts`.
- Produces: 1530 общих PNG + 120 home-helper guide PNG + 204 original guide PNG = 1854 проверенных PNG.

- [ ] **Step 1: Написать падающий script-тест манифеста**

`projectSlugs()` должен возвращать 45 concrete paths, не 38 card slugs и не legacy aliases. Тест проверяет exact set новых concrete slugs и отсутствие `planner-bot`, `idea-bot`, `expense-bot`, `recipe-bot`, `habit-bot`, `family-reminder-bot`, четырёх переименованных bot slug и трёх удалённых duplicate slug.

- [ ] **Step 2: Запустить script-тест**

Run: `npm run test:scripts`

Expected: FAIL — helper всё ещё ожидает 52.

- [ ] **Step 3: Сделать явный capture manifest**

В `projects.ts` экспортировать явный литеральный массив рядом с `questProjects`:

```ts
export const questAssetSlugs = [
  "planner", "day-planner-agent", "idea-vault", "idea-analysis-agent",
  "family-expenses", "expense-agent", "recipe-book", "meal-planning-agent",
  "child-schedule", "family-schedule-agent", "fitness-tracker", "habit-agent",
  "home-helper", "home-organizer-agent", "pressure-diary", "personal-organizer",
  "study-agent", "lead-agent", "booking-agent", "brief-agent", "selector-agent",
  "content-agent", "expert-assistant-agent", "sales-manager-agent", "administrator-agent",
  "consultant-agent", "online-school-agent", "event-organizer-agent", "client-care-agent",
  "fairy-team-agent", "expert-site", "psychologist-site", "beauty-site",
  "photographer-site", "designer-site", "consultation-site", "course-site",
  "event-site", "small-shop-site", "portfolio-site", "expert-pro-site",
  "school-pro-site", "service-pro-site", "catalog-pro-site", "graduate-portfolio",
] as const;
```

Unit-тест требует `questAssetSlugs` равным `questProjects.map(project => project.slug)`. `scripts/projects.mjs` извлекает строки только из блока `export const questAssetSlugs = [...] as const;` регулярным выражением `/export const questAssetSlugs = \[([\s\S]*?)\] as const;/` и после парсинга требует 45 уникальных значений; остальные `slug:` в файле игнорируются.

- [ ] **Step 4: Обновить capture route и ожидаемые количества**

- desktop/mobile screens: `45 × 17 × 2 = 1530`;
- home-helper guides: 120;
- четыре original service guides: 204;
- общий verify count: 1854;
- размер каждого PNG: 1200×800.

`capture-site.mjs` открывает mobile quest `?format=mobile&quest=planning&output=agent`, а не старый `family-expenses` alias.

- [ ] **Step 5: Запустить приложение для capture**

Run: `npm run dev`

Expected: сервер доступен на `http://localhost:3000`, процесс остаётся запущенным в PTY.

- [ ] **Step 6: Принудительно переснять все 45 concrete paths**

Run: `FORCE_SCREENS=1 npm run capture:steps`

Expected: `Готово 765/765 экранов`.

Run: `FORCE_SCREENS=1 npm run capture:mobile`

Expected: `Готово 765/765 мобильных экранов`.

Повторно снять подробные guide-кадры только для неизменившихся concrete service slugs, если их DOM или текст изменился:

Run: `npm run capture:home-helper-guide && npm run capture:original-guides`

- [ ] **Step 7: Проверить PNG и визуальные артефакты**

Run: `npm run verify:screens`

Expected: `Проверено 1854 PNG-экранов: 1530 общих, 120 подробных home-helper и 204 кадра четырёх оригинальных квестов, все 1200x800.`

Run: `npm run capture:site`

Expected: сохранены три контрольных снимка.

Визуально открыть через `view_image`:

- `artifacts/academy-desktop.png` — 38 карточек, bundle показывает два формата;
- `artifacts/academy-mobile.png` — нет горизонтальной прокрутки на 390 px;
- `artifacts/quest-mobile.png` — сначала формат, потом данные; агентский экран читается одной рукой;
- по одному `step-14.png` всех семи service-веток и семи agent-веток — содержание соответствует теме;
- по одному `step-07.png`, `step-09.png`, `step-11.png`, `step-14.png` для `expense-agent`, `booking-agent`, `content-agent`, `online-school-agent` — видны свободный ввод, один вопрос, результат и handoff.

- [ ] **Step 8: Закоммитить генератор и актуальные экраны**

```bash
git add scripts public/screens public/screens-mobile public/guides artifacts
git commit -m "chore: regenerate bundled quest screens"
```

---

### Task 11: Финальная проверка, метаданные и деплой

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Modify: `public/og.png` only if rendered text still says 52
- Verify: all source, tests, build and live site

**Interfaces:**
- Consumes: completed feature and generated assets.
- Produces: deployed Sites version and live smoke evidence.

- [ ] **Step 1: Обновить публичные цифры**

Metadata:

```ts
openGraph: {
  title: "38 проектов. Одна новая профессия.",
  description: "Выберите сервис или ИИ-агента, пройдите 17 шагов и добавьте готовую работу в портфолио.",
}
```

`app/page.tsx` description: «38 разных проектов курса SUBMARINE: готовые команды, короткие уровни и понятный результат на каждом шаге.» Проверить `public/og.png`; если на нём есть 52, пересобрать с 38 и визуально открыть.

- [ ] **Step 2: Просканировать запрещённые публичные слова и старые цифры**

Run:

```bash
rg -n '52 проекта|Пятьдесят два|готовый бот|Бот-планер|Бот-' app public scripts
```

Expected: нет публичных совпадений; допустимы только legacy alias в `project-routes.ts`, техническая фраза Telegram и удаляемые Git history не учитываются.

- [ ] **Step 3: Запустить полный локальный quality gate**

Run: `npm run test:scripts`

Expected: PASS.

Run: `npm run test:unit`

Expected: PASS, включая 38 cards / 45 concrete paths / 21 agent contracts / legacy routes / reset.

Run: `npm run lint`

Expected: exit 0.

Run: `npm run build`

Expected: exit 0, production output создан.

Run: `npm run verify:screens`

Expected: 1854 PNG, все 1200×800.

- [ ] **Step 4: Провести browser smoke локальной production-сборки**

Проверить desktop и 390 px mobile:

1. каталог показывает 38 карточек;
2. `planning` без output показывает format choice;
3. service → data mode → 17 levels;
4. reset возвращает format choice;
5. agent → data mode → 17 разных agent levels;
6. `?quest=planner-bot` превращается в `?quest=planning&output=agent`;
7. `?format=mobile&quest=recipe-bot` превращается в `?format=mobile&quest=recipes&output=agent`;
8. unknown slug открывает каталог;
9. следующие уровни поднимают страницу наверх;
10. console не содержит ошибок.

- [ ] **Step 5: Закоммитить финальные metadata/QA изменения**

```bash
git add app/layout.tsx app/page.tsx public/og.png
git commit -m "chore: update academy project count"
```

- [ ] **Step 6: Опубликовать через Sites hosting**

Использовать существующий `.openai/hosting.json` с project id `appgprj_6a77c23635108191a0da1fd62725e272`. Запустить штатный Sites deploy для текущего проекта; не создавать новый Sites project и не менять домен.

Expected live URL: `https://feya-quest-academy.submarine-edu.chatgpt.site/`.

- [ ] **Step 7: Проверить живой сайт после деплоя**

Повторить на live URL пункты 1–8 из локального smoke, дополнительно проверить:

- HTTP 200 главной страницы и canonical old links;
- загрузку service/agent `step-14.png` без 404;
- desktop/mobile визуально совпадают с контрольными кадрами;
- точный deployed version/commit записан в финальном отчёте.

- [ ] **Step 8: Закоммитить только если deploy добавил разрешённый hosting manifest change**

Run: `git status --short`

Expected: чистое дерево. Не коммитить `.env`, токены, локальные базы, `.wrangler`, `.next`, `dist` или зависимости.

---

## Final Acceptance Checklist

- [ ] 38 уникальных карточек в desktop и mobile.
- [ ] 7 двойных карточек, видимых в неделях 1 и 2.
- [ ] 45 concrete paths и 765 desktop/mobile levels.
- [ ] 21 ИИ-агент с уникальным предметным контрактом.
- [ ] Формат выбирается до данных.
- [ ] Progress/data/customization изолированы по branch и device.
- [ ] Reset bundle очищает обе branch только текущего device.
- [ ] Все 28 старых URL открывают правильный новый проект/формат: 25 legacy alias и 3 сохранённых canonical agent URL.
- [ ] Публичного «бот» нет вне технической фразы Telegram.
- [ ] 14 веток bundle имеют разные прототипы и скриншоты.
- [ ] 31 standalone card имеет свой соответствующий прототип.
- [ ] Реальные данные собираются голосом/текстом; ручных служебных файлов нет.
- [ ] Медицинские, детские, платежные и внешние действия соблюдают границы.
- [ ] Tests, lint, build, 1854 PNG verify и browser smoke проходят.
- [ ] Live Sites deployment проверен на canonical и legacy URL.
