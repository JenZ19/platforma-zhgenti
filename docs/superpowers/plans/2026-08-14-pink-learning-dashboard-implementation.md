# Pink Learning Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Пересобрать текущий каталог Академии в единый розовый учебный кабинет с продолжением последнего квеста, разделами проектов и портфолио, общей навигацией и новым удобным экраном прохождения квеста.

**Architecture:** `AppEntry` остаётся единственной точкой разбора query-маршрутов и оборачивает главную и квесты в общий `LearningShell`; capture-маршруты продолжают рендериться без оболочки. Новая библиотека `academy-dashboard.ts` безопасно читает старый прогресс и новые device-local данные, а один `AcademyDashboard` формирует desktop/mobile представления из общей модели без дублирования бизнес-логики.

**Tech Stack:** React 19, TypeScript 5.9, Vinext, Vitest + Testing Library, Node test runner, Playwright, CSS без новой runtime-зависимости, Sites для публикации.

## Global Constraints

- Сохранить все существующие квесты, их разное количество уровней, desktop/mobile прогресс, выбор «сервис или ИИ-агент» и Mac/Windows ветки.
- Сохранить прямые ссылки `?quest=<slug>`, `?format=mobile`, `?capture=...`, `?capture-mobile=...` и `?capture-guide=...`.
- Не переписывать содержание квестов на этом этапе.
- Все квесты доступны сразу; недели рекомендуют порядок, но ничего не блокируют.
- Новый визуальный стиль — вариант B «Розовое облако»: светлый розово-сиреневый фон, белые полупрозрачные поверхности, насыщенный розовый градиент и сливово-графитовый текст.
- Обложки проектов остаются оригинальными прототипами результата и не заменяются одинаковыми розовыми иллюстрациями.
- На компьютере используется левое меню; на телефоне — нижняя навигация и зона нажатия не меньше 44×44 px.
- Основной текст внутри квеста остаётся не меньше 18 px на компьютере и 17 px на телефоне.
- Повреждённое значение localStorage не должно ломать другие разделы платформы.
- Повторно открытый пройденный уровень должен позволять перейти дальше; новый уровень прокручивается к началу.
- Реальный ИИ-ответ не имитируется: без бэкенда Феечка сохраняет вопрос и показывает честный маршрут помощи.
- Цвет не является единственным индикатором состояния; статус всегда имеет текст или иконку.

---

## File Structure

### Новые файлы

- `app/lib/academy-dashboard.ts` — безопасное сохранение нового состояния кабинета и построение единой модели проектов.
- `app/lib/academy-dashboard.test.ts` — тесты совместимости, повреждённых данных, продолжения, избранного и портфолио.
- `app/components/LearningShell.tsx` — общий desktop sidebar, mobile bottom navigation, topbar и контейнер Феечки.
- `app/components/DashboardIcon.tsx` — единый набор линейных SVG-иконок кабинета.
- `app/components/AcademyDashboard.tsx` — переключение разделов кабинета и единое состояние главной.
- `app/components/DashboardHome.tsx` — баннер следующего шага, статистика, продолжение и текущая неделя.
- `app/components/DashboardProjectCard.tsx` — единая карточка проекта для всех разделов.
- `app/components/DashboardLibrary.tsx` — «Мои проекты» и «Квесты по неделям».
- `app/components/DashboardPortfolio.tsx` — автоматически сформированное портфолио.
- `app/components/FairyAssistant.tsx` — текст, голосовой ввод и device-local заметки без фальшивого ответа ИИ.
- `app/pink-learning-dashboard.css` — токены и адаптивный стиль варианта «Розовое облако».
- `scripts/dashboard-layout.test.mjs` — проверка наложений, горизонтального скролла и зон нажатия на 375/768/1024/1440 px.

### Изменяемые файлы

- `app/components/AppEntry.tsx` — разделы кабинета в query state, общий shell и фиксация последнего квеста.
- `app/components/Academy.tsx` — тонкая desktop-обёртка над `AcademyDashboard`.
- `app/components/MobileAcademy.tsx` — тонкая mobile-обёртка над `AcademyDashboard`.
- `app/components/Quest.tsx` — центральная карточка шага и правая карта уровней без старого рекламного header/hero.
- `app/components/MobileQuest.tsx` — полноширинный шаг и раскрываемая карта уровней.
- `app/components/ProjectCard.tsx` — удаление старой дублирующей разметки после перехода на `DashboardProjectCard`.
- `app/components/App.test.tsx` — пользовательские сценарии кабинета, квеста и Феечки.
- `app/components/AppRoutes.test.tsx` — прямые ссылки и query-навигация разделов.
- `app/layout.tsx` — подключение новой CSS-системы вместо `tactile-album.css`.
- `scripts/hero-layout.test.mjs` — замена проверки старого альбома проверкой нового баннера.
- `scripts/quest-typography.test.mjs` — сохранение читаемого масштаба внутри новой оболочки.

---

### Task 1: Device-local state and dashboard model

**Files:**
- Create: `app/lib/academy-dashboard.ts`
- Create: `app/lib/academy-dashboard.test.ts`
- Modify: `app/lib/progress.ts`

**Interfaces:**
- Consumes: `CatalogProject`, `QuestSurface`, `StorageLike`, `getCatalogProjectProgress()`, `getProjectLevelCount()`.
- Produces: `DashboardSection`, `DashboardProjectState`, `DashboardSnapshot`, `loadSavedProjects()`, `toggleSavedProject()`, `loadLastActiveProject()`, `saveLastActiveProject()`, `loadDashboardSection()`, `saveDashboardSection()`, `buildDashboardSnapshot()`, `saveQuestionNote()`.

- [ ] **Step 1: Write failing state tests**

```ts
import { describe, expect, it } from "vitest";
import { projects } from "../content/projects";
import { completeStep, createEmptyProgress, progressKey } from "./progress";
import {
  buildDashboardSnapshot,
  loadDashboardSection,
  loadLastActiveProject,
  loadSavedProjects,
  saveDashboardSection,
  saveLastActiveProject,
  toggleSavedProject,
} from "./academy-dashboard";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe("academy dashboard state", () => {
  it("isolates malformed values and preserves old progress", () => {
    const storage = new MemoryStorage();
    storage.setItem("feya-dashboard-v1:saved", "broken");
    storage.setItem(progressKey("pressure-diary"), JSON.stringify(completeStep(createEmptyProgress(), 1)));
    expect(loadSavedProjects(storage)).toEqual([]);
    expect(buildDashboardSnapshot(projects, storage, "desktop").started.map((item) => item.project.slug)).toContain("pressure-diary");
  });

  it("saves one project once and removes it on the next click", () => {
    const storage = new MemoryStorage();
    expect(toggleSavedProject("planner", storage)).toEqual(["planner"]);
    expect(toggleSavedProject("planner", storage)).toEqual([]);
  });

  it("keeps the last active quest per learning format", () => {
    const storage = new MemoryStorage();
    saveLastActiveProject("planner", "desktop", storage);
    saveLastActiveProject("pressure-diary", "mobile", storage);
    expect(loadLastActiveProject("desktop", storage)).toBe("planner");
    expect(loadLastActiveProject("mobile", storage)).toBe("pressure-diary");
  });

  it("restores only a known dashboard section", () => {
    const storage = new MemoryStorage();
    saveDashboardSection("portfolio", storage);
    expect(loadDashboardSection(storage)).toBe("portfolio");
    storage.setItem("feya-dashboard-v1:section", "unknown");
    expect(loadDashboardSection(storage)).toBe("home");
  });

  it("places a finished project in portfolio and recommends the first unfinished week", () => {
    const storage = new MemoryStorage();
    const project = projects.find((item) => item.slug === "pressure-diary")!;
    let progress = createEmptyProgress();
    for (let id = 1; id <= 17; id += 1) progress = completeStep(progress, id, 17);
    storage.setItem(progressKey("pressure-diary"), JSON.stringify(progress));
    const snapshot = buildDashboardSnapshot([project], storage, "desktop", () => "2026-08-14");
    expect(snapshot.completed).toHaveLength(1);
    expect(snapshot.completed[0].completedAt).toBe("2026-08-14");
  });
});
```

- [ ] **Step 2: Run the new tests and verify the missing module failure**

Run: `npm run test:unit -- app/lib/academy-dashboard.test.ts`

Expected: FAIL because `./academy-dashboard` does not exist.

- [ ] **Step 3: Implement safe storage and snapshot derivation**

```ts
import { isProjectBundle } from "../content/projects";
import type { CatalogProject } from "../content/types";
import type { QuestSurface } from "./output-format";
import { getCatalogProjectProgress, getProjectLevelCount, type StorageLike } from "./progress";

const PREFIX = "feya-dashboard-v1";
export type DashboardSection = "home" | "projects" | "weeks" | "portfolio" | "fairy";
const dashboardSections: DashboardSection[] = ["home", "projects", "weeks", "portfolio", "fairy"];

export type DashboardProjectState = {
  project: CatalogProject;
  completedLevels: number;
  totalLevels: number;
  percent: number;
  status: "new" | "started" | "completed";
  saved: boolean;
  completedAt?: string;
};

export type DashboardSnapshot = {
  items: DashboardProjectState[];
  started: DashboardProjectState[];
  completed: DashboardProjectState[];
  saved: DashboardProjectState[];
  currentWeek: number;
  completedLevels: number;
  totalLevels: number;
  next: DashboardProjectState;
};

function readJson<T>(storage: StorageLike, key: string, fallback: T, validate: (value: unknown) => value is T): T {
  try {
    const value: unknown = JSON.parse(storage.getItem(key) ?? "null");
    return validate(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function stringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function loadSavedProjects(storage: StorageLike): string[] {
  return [...new Set(readJson(storage, `${PREFIX}:saved`, [], stringList))];
}

export function toggleSavedProject(slug: string, storage: StorageLike): string[] {
  const saved = loadSavedProjects(storage);
  const next = saved.includes(slug) ? saved.filter((item) => item !== slug) : [...saved, slug];
  storage.setItem(`${PREFIX}:saved`, JSON.stringify(next));
  return next;
}

export function saveLastActiveProject(slug: string, surface: QuestSurface, storage: StorageLike): void {
  storage.setItem(`${PREFIX}:last:${surface}`, slug);
}

export function loadLastActiveProject(surface: QuestSurface, storage: StorageLike): string | undefined {
  return storage.getItem(`${PREFIX}:last:${surface}`) ?? undefined;
}

export function saveDashboardSection(section: DashboardSection, storage: StorageLike): void {
  storage.setItem(`${PREFIX}:section`, section);
}

export function loadDashboardSection(storage: StorageLike): DashboardSection {
  const value = storage.getItem(`${PREFIX}:section`);
  return dashboardSections.includes(value as DashboardSection) ? value as DashboardSection : "home";
}

function completionMap(storage: StorageLike): Record<string, string> {
  return readJson(storage, `${PREFIX}:completed-at`, {}, (value): value is Record<string, string> =>
    Boolean(value) && typeof value === "object" && Object.values(value).every((item) => typeof item === "string"),
  );
}

export function buildDashboardSnapshot(
  projects: CatalogProject[],
  storage: StorageLike,
  surface: QuestSurface,
  today: () => string = () => new Date().toISOString().slice(0, 10),
): DashboardSnapshot {
  const saved = loadSavedProjects(storage);
  const dates = completionMap(storage);
  const items = projects.map((project): DashboardProjectState => {
    const progress = getCatalogProjectProgress(project, storage, surface);
    const totalLevels = getProjectLevelCount(project);
    const status = progress.completed.length === totalLevels ? "completed" : progress.completed.length ? "started" : "new";
    if (status === "completed" && !dates[project.slug]) dates[project.slug] = today();
    return {
      project,
      completedLevels: progress.completed.length,
      totalLevels,
      percent: Math.round((progress.completed.length / totalLevels) * 100),
      status,
      saved: saved.includes(project.slug),
      completedAt: dates[project.slug],
    };
  });
  storage.setItem(`${PREFIX}:completed-at`, JSON.stringify(dates));
  const started = items.filter((item) => item.status === "started");
  const completed = items.filter((item) => item.status === "completed");
  const currentWeek = [1, 2, 3, 4, 5, 6].find((week) => items.some((item) => {
    const weeks = isProjectBundle(item.project) ? item.project.weeks : [item.project.week];
    return weeks.includes(week as 1 | 2) && item.status !== "completed";
  })) ?? 6;
  const lastSlug = loadLastActiveProject(surface, storage);
  const next = items.find((item) => item.project.slug === lastSlug && item.status !== "completed")
    ?? started.at(-1)
    ?? items.find((item) => (isProjectBundle(item.project) ? item.project.weeks.includes(currentWeek as 1 | 2) : item.project.week === currentWeek) && item.status !== "completed")
    ?? items[0];
  return {
    items,
    started,
    completed,
    saved: items.filter((item) => item.saved && item.status === "new"),
    currentWeek,
    completedLevels: items.reduce((sum, item) => sum + item.completedLevels, 0),
    totalLevels: items.reduce((sum, item) => sum + item.totalLevels, 0),
    next,
  };
}
```

- [ ] **Step 4: Export `StorageLike` and run the focused tests**

Modify `app/lib/progress.ts` only if TypeScript reports the existing `StorageLike` type is not exported; the current declaration should remain:

```ts
export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};
```

Run: `npm run test:unit -- app/lib/academy-dashboard.test.ts app/lib/progress.test.ts`

Expected: both files PASS.

- [ ] **Step 5: Commit the state model**

```bash
git add app/lib/academy-dashboard.ts app/lib/academy-dashboard.test.ts app/lib/progress.ts
git commit -m "feat: add learning dashboard state"
```

### Task 2: Shared shell and query navigation

**Files:**
- Create: `app/components/DashboardIcon.tsx`
- Create: `app/components/LearningShell.tsx`
- Modify: `app/components/AppEntry.tsx`
- Modify: `app/components/AppRoutes.test.tsx`

**Interfaces:**
- Consumes: `DashboardSection`, existing `Route`, `Quest`, `MobileQuest`, `Academy`, `MobileAcademy`.
- Produces: `LearningShellProps`, canonical `?section=` and `?q=` navigation, working top search, persistent shell around home and quest routes.

- [ ] **Step 1: Write failing route and shell tests**

```tsx
it("navigates dashboard sections without breaking quest links", async () => {
  render(<AppEntry />);
  fireEvent.click(await screen.findByRole("button", { name: "Мои проекты" }));
  await waitFor(() => expect(window.location.search).toBe("?section=projects"));

  fireEvent.click(screen.getByRole("button", { name: "Квесты по неделям" }));
  await waitFor(() => expect(window.location.search).toBe("?section=weeks"));

  fireEvent.change(screen.getByRole("searchbox", { name: /найти проект/i }), { target: { value: "давление" } });
  fireEvent.submit(screen.getByRole("search"));
  await waitFor(() => expect(window.location.search).toBe("?section=weeks&q=%D0%B4%D0%B0%D0%B2%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5"));
});

it("keeps capture routes outside the learning shell", async () => {
  window.history.replaceState({}, "", "/?capture=planner--step-01");
  const { container } = render(<AppEntry />);
  await waitFor(() => expect(container.querySelector("[data-learning-shell]")).toBeNull());
});
```

- [ ] **Step 2: Run route tests and verify they fail**

Run: `npm run test:unit -- app/components/AppRoutes.test.tsx`

Expected: FAIL because the new navigation buttons and search route do not exist.

- [ ] **Step 3: Add one consistent SVG icon set**

```tsx
import type { ReactNode } from "react";

export type DashboardIconName = "home" | "projects" | "weeks" | "portfolio" | "fairy" | "search";

const paths: Record<DashboardIconName, ReactNode> = {
  home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10.5V20h13v-9.5" /><path d="M9.5 20v-6h5v6" /></>,
  projects: <><path d="M3.5 6.5h6l2 2h9v10.5H3.5z" /><path d="M3.5 9h17" /></>,
  weeks: <><rect x="4" y="5.5" width="16" height="15" rx="3" /><path d="M8 3.5v4M16 3.5v4M4 10h16" /><path d="m8 15 2 2 5-5" /></>,
  portfolio: <><rect x="3.5" y="6.5" width="17" height="13" rx="3" /><path d="M9 6.5V4h6v2.5M3.5 12h17M10 12v2h4v-2" /></>,
  fairy: <><path d="m12 2 1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z" /><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></>,
};

export function DashboardIcon({ name }: { name: DashboardIconName }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
```

- [ ] **Step 4: Implement the reusable shell**

```tsx
"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { DashboardSection } from "../lib/academy-dashboard";
import { DashboardIcon, type DashboardIconName } from "./DashboardIcon";

const items: { id: DashboardSection; label: string; icon: DashboardIconName }[] = [
  { id: "home", label: "Главная", icon: "home" },
  { id: "projects", label: "Мои проекты", icon: "projects" },
  { id: "weeks", label: "Квесты по неделям", icon: "weeks" },
  { id: "portfolio", label: "Портфолио", icon: "portfolio" },
  { id: "fairy", label: "Феечка", icon: "fairy" },
];

export type LearningShellProps = {
  format: "desktop" | "mobile";
  activeSection?: DashboardSection;
  questTitle?: string;
  onNavigate: (section: DashboardSection) => void;
  onSearch: (query: string) => void;
  onFormatChange: () => void;
  searchQuery?: string;
  children: ReactNode;
};

export function LearningShell(props: LearningShellProps) {
  const { activeSection, children, format, onFormatChange, onNavigate, onSearch, questTitle, searchQuery = "" } = props;
  const [search, setSearch] = useState(searchQuery);
  useEffect(() => setSearch(searchQuery), [searchQuery]);
  return (
    <div className={`learning-shell learning-shell-${format}`} data-learning-shell data-visual-theme="pink-cloud">
      <aside className="learning-sidebar" aria-label="Навигация Академии">
        <button className="learning-brand" type="button" onClick={() => onNavigate("home")} aria-label="На главную Академии"><DashboardIcon name="fairy" /><b>SUBMARINE<small>Академия квестов</small></b></button>
        <nav>{items.map((item) => <button type="button" key={item.id} className={activeSection === item.id ? "active" : ""} aria-current={activeSection === item.id ? "page" : undefined} onClick={() => onNavigate(item.id)}><DashboardIcon name={item.icon} />{item.label}</button>)}</nav>
        <button className="format-switch" type="button" onClick={onFormatChange}>{format === "mobile" ? "Открыть версию для компьютера" : "Открыть версию для телефона"}</button>
      </aside>
      <div className="learning-main">
        <header className="learning-topbar"><form role="search" onSubmit={(event) => { event.preventDefault(); onSearch(search); }}><label><DashboardIcon name="search" /><input type="search" aria-label="Найти проект" placeholder="Найти проект…" value={search} onChange={(event) => setSearch(event.target.value)} /></label><button type="submit">Найти</button></form><strong>{questTitle ?? "Мой учебный кабинет"}</strong></header>
        {children}
      </div>
      <nav className="learning-bottom-nav" aria-label="Навигация Академии на телефоне">{items.map((item) => <button type="button" key={item.id} aria-label={item.label} aria-current={activeSection === item.id ? "page" : undefined} onClick={() => onNavigate(item.id)}><DashboardIcon name={item.icon} /><small>{item.label}</small></button>)}</nav>
    </div>
  );
}
```

- [ ] **Step 5: Extend `AppEntry` route state and wrap only home/quest routes**

Add `section: DashboardSection` and `search: string` to the home route, parse only known section values, restore `loadDashboardSection(window.localStorage)` only when the URL has no `section`, and use these exact URL builders:

```ts
const dashboardSections: DashboardSection[] = ["home", "projects", "weeks", "portfolio", "fairy"];

function dashboardUrl(section: DashboardSection, format: "desktop" | "mobile", search = ""): string {
  const query = new URLSearchParams();
  if (format === "mobile") query.set("format", "mobile");
  if (section !== "home") query.set("section", section);
  if (search.trim()) query.set("q", search.trim());
  const value = query.toString();
  return value ? `?${value}` : window.location.pathname;
}

function openSection(section: DashboardSection) {
  const format = route.type === "home" || route.type === "quest" ? route.format : "desktop";
  window.history.pushState({}, "", dashboardUrl(section, format));
  saveDashboardSection(section, window.localStorage);
  setRoute({ type: "home", section, search: "", format });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openSearch(search: string) {
  const format = route.type === "home" || route.type === "quest" ? route.format : "desktop";
  window.history.pushState({}, "", dashboardUrl("weeks", format, search));
  saveDashboardSection("weeks", window.localStorage);
  setRoute({ type: "home", section: "weeks", search, format });
  window.scrollTo({ top: 0, behavior: "smooth" });
}
```

For the shared result, render:

```tsx
return (
  <LearningShell
    format={surface}
    activeSection={route.type === "home" ? route.section : undefined}
    questTitle={route.type === "quest" ? project?.title : undefined}
    onNavigate={openSection}
    onSearch={openSearch}
    searchQuery={route.type === "home" ? route.search : ""}
    onFormatChange={changeFormat}
  >
    {content}
  </LearningShell>
);
```

Keep the three capture branches above this return unchanged.

When any quest route opens, including a direct URL, call `saveLastActiveProject(route.slug, route.format, window.localStorage)`. `changeFormat()` keeps the current quest or dashboard section, changes only the `format` query, and does not overwrite progress from the other surface.

- [ ] **Step 6: Run route tests**

Run: `npm run test:unit -- app/components/AppRoutes.test.tsx`

Expected: PASS, including the existing old-link normalization test.

- [ ] **Step 7: Commit shell and routing**

```bash
git add app/components/DashboardIcon.tsx app/components/LearningShell.tsx app/components/AppEntry.tsx app/components/AppRoutes.test.tsx
git commit -m "feat: add shared academy navigation"
```

### Task 3: Dashboard home and project cards

**Files:**
- Create: `app/components/AcademyDashboard.tsx`
- Create: `app/components/DashboardHome.tsx`
- Create: `app/components/DashboardProjectCard.tsx`
- Modify: `app/components/Academy.tsx`
- Modify: `app/components/MobileAcademy.tsx`
- Modify: `app/components/App.test.tsx`

**Interfaces:**
- Consumes: `DashboardSnapshot`, `DashboardProjectState`, `ProjectPreview`, `toggleSavedProject()`.
- Produces: one shared dashboard for desktop/mobile, `onOpen(slug)`, `onSavedChange(slug)`.

- [ ] **Step 1: Write failing home scenarios**

```tsx
it("shows the last active quest as the single primary action", async () => {
  localStorage.setItem("feya-dashboard-v1:last:desktop", "pressure-diary");
  render(<Academy />);
  expect(await screen.findByRole("heading", { name: /дневник давления/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /продолжить дневник давления/i })).toHaveAttribute("href", "?quest=pressure-diary");
});

it("saves a project for later from its card", async () => {
  render(<Academy />);
  const card = await screen.findByRole("article", { name: /планирование/i });
  fireEvent.click(within(card).getByRole("button", { name: /сохранить на потом/i }));
  expect(JSON.parse(localStorage.getItem("feya-dashboard-v1:saved")!)).toContain("planning");
});

it("uses the same dashboard logic in the mobile academy", async () => {
  window.history.replaceState({}, "", "/?format=mobile");
  render(<AppEntry />);
  expect(await screen.findByText(/ваш следующий шаг/i)).toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: /навигация Академии на телефоне/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused component tests**

Run: `npm run test:unit -- app/components/App.test.tsx`

Expected: FAIL on the missing dashboard UI.

- [ ] **Step 3: Implement the common card**

```tsx
import { getCatalogDiscoveryProfile } from "../content/discovery";
import { isProjectBundle } from "../content/projects";
import type { DashboardProjectState } from "../lib/academy-dashboard";
import { ProjectPreview } from "./ProjectPreview";

export function DashboardProjectCard({ item, onOpen, onSave }: { item: DashboardProjectState; onOpen: (slug: string) => void; onSave: (slug: string) => void }) {
  const { project } = item;
  const discovery = getCatalogDiscoveryProfile(project);
  const week = isProjectBundle(project) ? "Недели 1–2" : `Неделя ${project.week}`;
  return (
    <article className="dashboard-project-card" aria-label={project.title}>
      <ProjectPreview project={project} />
      <div className="dashboard-card-body">
        <div className="dashboard-card-labels"><span>{week}</span><span>{discovery.label}</span><span>{project.device}</span></div>
        <h3>{project.title}</h3><p>{project.outcome}</p>
        <div className="dashboard-progress" aria-label={`Пройдено ${item.completedLevels} из ${item.totalLevels}`}><i><b style={{ width: `${item.percent}%` }} /></i><span>{item.completedLevels}/{item.totalLevels}</span></div>
        <footer><button type="button" className={item.saved ? "saved" : ""} aria-label={item.saved ? `Убрать ${project.title} из сохранённых` : `Сохранить на потом: ${project.title}`} onClick={() => onSave(project.slug)}>{item.saved ? "Сохранено ✓" : "На потом"}</button><a href={`?quest=${project.slug}`} onClick={(event) => { event.preventDefault(); onOpen(project.slug); }}>{item.status === "new" ? "Начать" : "Продолжить"} →</a></footer>
      </div>
    </article>
  );
}
```

- [ ] **Step 4: Implement the home layout**

```tsx
export function DashboardHome({ snapshot, onOpen, onSave }: { snapshot: DashboardSnapshot; onOpen: (slug: string) => void; onSave: (slug: string) => void }) {
  const next = snapshot.next;
  const weekItems = snapshot.items.filter((item) => isProjectBundle(item.project) ? item.project.weeks.includes(snapshot.currentWeek as 1 | 2) : item.project.week === snapshot.currentWeek).slice(0, 4);
  return (
    <main className="dashboard-home">
      <section className="next-quest-banner"><div><p>Ваш следующий шаг</p><h1>{next.project.title}</h1><span>{next.project.outcome}</span><a href={`?quest=${next.project.slug}`} onClick={(event) => { event.preventDefault(); onOpen(next.project.slug); }} aria-label={`Продолжить ${next.project.title}`}>{next.status === "new" ? "Начать квест" : "Продолжить"} →</a></div><ProjectPreview project={next.project} /></section>
      <section className="dashboard-stat-grid" aria-label="Ваш прогресс"><article><span>Текущая неделя</span><strong>{snapshot.currentWeek}</strong></article><article><span>Пройдено уровней</span><strong>{snapshot.completedLevels}</strong></article><article><span>Готово проектов</span><strong>{snapshot.completed.length}</strong></article></section>
      {snapshot.started.length > 0 && <section className="dashboard-row"><header><div><p>Продолжить</p><h2>Начатые проекты</h2></div></header><div className="dashboard-card-grid">{snapshot.started.slice(-3).reverse().map((item) => <DashboardProjectCard key={item.project.slug} item={item} onOpen={onOpen} onSave={onSave} />)}</div></section>}
      <section className="dashboard-row"><header><div><p>Неделя {snapshot.currentWeek}</p><h2>Рекомендуемый порядок</h2></div><span>Можно выбрать любой проект</span></header><div className="dashboard-card-grid">{weekItems.map((item) => <DashboardProjectCard key={item.project.slug} item={item} onOpen={onOpen} onSave={onSave} />)}</div></section>
    </main>
  );
}
```

- [ ] **Step 5: Build one dashboard controller and thin format wrappers**

`AcademyDashboard` loads the snapshot after mount, refreshes it after each save, and dispatches sections. `Academy.tsx` and `MobileAcademy.tsx` must reduce to these wrappers:

```tsx
export function Academy({ section = "home", searchQuery = "", onOpen = () => undefined }: { section?: DashboardSection; searchQuery?: string; onOpen?: (slug: string) => void }) {
  return <AcademyDashboard section={section} searchQuery={searchQuery} onOpen={onOpen} format="desktop" />;
}
```

```tsx
export function MobileAcademy({ section = "home", searchQuery = "", onOpen }: { section?: DashboardSection; searchQuery?: string; onOpen: (slug: string) => void }) {
  return <AcademyDashboard section={section} searchQuery={searchQuery} onOpen={onOpen} format="mobile" />;
}
```

Use the real `projects` array and `buildDashboardSnapshot(projects, window.localStorage, format)`; do not create a second mobile catalogue model.

- [ ] **Step 6: Run home tests**

Run: `npm run test:unit -- app/components/App.test.tsx app/lib/academy-dashboard.test.ts`

Expected: PASS for primary action, project saving, desktop/mobile reuse and the existing unique-cover assertions.

- [ ] **Step 7: Commit the dashboard home**

```bash
git add app/components/AcademyDashboard.tsx app/components/DashboardHome.tsx app/components/DashboardProjectCard.tsx app/components/Academy.tsx app/components/MobileAcademy.tsx app/components/App.test.tsx
git commit -m "feat: build pink learning dashboard home"
```

### Task 4: My Projects, weekly library, and automatic portfolio

**Files:**
- Create: `app/components/DashboardLibrary.tsx`
- Create: `app/components/DashboardPortfolio.tsx`
- Modify: `app/components/AcademyDashboard.tsx`
- Modify: `app/components/App.test.tsx`

**Interfaces:**
- Consumes: `DashboardSnapshot.items/started/completed/saved`, existing `filterAndSortProjects()` and discovery profiles.
- Produces: project tabs without duplication, six week accordions, search/filter empty states, portfolio cards.

- [ ] **Step 1: Write failing section tests**

```tsx
it("does not duplicate a started project in the saved-for-later group", async () => {
  localStorage.setItem("feya-dashboard-v1:saved", JSON.stringify(["pressure-diary"]));
  localStorage.setItem(progressKey("pressure-diary"), JSON.stringify(completeStep(createEmptyProgress(), 1)));
  window.history.replaceState({}, "", "/?section=projects");
  render(<AppEntry />);
  expect(await screen.findByRole("heading", { name: "Начатые" })).toBeInTheDocument();
  expect(screen.getAllByRole("article", { name: /дневник давления/i })).toHaveLength(1);
});

it("shows six openable weeks and resets an empty search", async () => {
  window.history.replaceState({}, "", "/?section=weeks");
  render(<AppEntry />);
  expect(await screen.findAllByRole("button", { name: /неделя [1-6]/i })).toHaveLength(6);
  fireEvent.change(screen.getByRole("searchbox", { name: /найти проект/i }), { target: { value: "несуществующий проект" } });
  expect(screen.getByText(/ничего не найдено/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /сбросить фильтры/i }));
  expect(screen.queryByText(/ничего не найдено/i)).not.toBeInTheDocument();
});

it("automatically shows a completed project in portfolio", async () => {
  const total = getProjectLevelCount("server-152fz");
  localStorage.setItem(progressKey("server-152fz"), JSON.stringify({ version: 1, activeStep: total, completed: Array.from({ length: total }, (_, index) => index + 1), score: total * 10 }));
  window.history.replaceState({}, "", "/?section=portfolio");
  render(<AppEntry />);
  expect(await screen.findByRole("article", { name: /покупаем сервер/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the component tests and verify the missing sections**

Run: `npm run test:unit -- app/components/App.test.tsx`

Expected: FAIL because the three dashboard sections are not implemented.

- [ ] **Step 3: Implement My Projects and weekly library**

`DashboardLibrary` accepts `mode: "projects" | "weeks"` and `initialQuery: string`. Its local query synchronises from `initialQuery` when the URL search changes. For projects, create three labelled groups and render only:

```ts
const groups = [
  { id: "started", title: "Начатые", items: snapshot.started },
  { id: "completed", title: "Готовые", items: snapshot.completed },
  { id: "saved", title: "На потом", items: snapshot.saved },
];
```

For weeks, render buttons `Неделя 1` through `Неделя 6`, default the open week to `snapshot.currentWeek`, filter with the existing discovery functions, and show this exact empty state:

```tsx
<section className="dashboard-empty"><span aria-hidden="true">⌕</span><h2>Ничего не найдено</h2><p>Сбросьте фильтры или попробуйте другое слово.</p><button type="button" onClick={resetFilters}>Сбросить фильтры</button></section>
```

- [ ] **Step 4: Implement portfolio with an honest empty state**

```tsx
export function DashboardPortfolio({ snapshot, onOpen }: { snapshot: DashboardSnapshot; onOpen: (slug: string) => void }) {
  if (!snapshot.completed.length) return <main className="dashboard-section"><header><p>Моя витрина</p><h1>Портфолио</h1></header><section className="dashboard-empty"><span aria-hidden="true">◇</span><h2>Здесь появится первая готовая работа</h2><p>Завершите любой квест — проект добавится сюда автоматически.</p></section></main>;
  return <main className="dashboard-section"><header><p>Моя витрина</p><h1>Портфолио</h1></header><div className="portfolio-grid">{snapshot.completed.map((item) => <article key={item.project.slug} aria-label={item.project.title}><ProjectPreview project={item.project} /><div><span>Готово {item.completedAt}</span><h2>{item.project.title}</h2><p>{isProjectBundle(item.project) ? item.project.outcome : item.project.audience}</p><button type="button" onClick={() => onOpen(item.project.slug)}>Открыть проект →</button></div></article>)}</div></main>;
}
```

- [ ] **Step 5: Dispatch all dashboard sections from `AcademyDashboard`**

Use an exhaustive switch over `DashboardSection`. The `fairy` branch at this checkpoint renders an honest introduction without an input form; Task 5 replaces this exact branch with the working assistant:

```tsx
case "fairy":
  return <main className="dashboard-section"><header><p>Помощь внутри платформы</p><h1>Феечка</h1></header><section className="dashboard-empty"><DashboardIcon name="fairy" /><h2>Соберите вопрос по текущему проекту</h2><p>Сформулируйте, на каком экране вы остановились, что нажали и что увидели. Так вопрос будет проще передать куратору.</p></section></main>;
```

- [ ] **Step 6: Run dashboard section tests**

Run: `npm run test:unit -- app/components/App.test.tsx app/components/AppRoutes.test.tsx`

Expected: PASS for project deduplication, six weeks, reset, portfolio and query navigation.

- [ ] **Step 7: Commit dashboard sections**

```bash
git add app/components/DashboardLibrary.tsx app/components/DashboardPortfolio.tsx app/components/AcademyDashboard.tsx app/components/App.test.tsx
git commit -m "feat: add project library and portfolio"
```

### Task 5: Fairy text, voice input, and saved project notes

**Files:**
- Create: `app/components/FairyAssistant.tsx`
- Modify: `app/lib/academy-dashboard.ts`
- Modify: `app/lib/academy-dashboard.test.ts`
- Modify: `app/components/LearningShell.tsx`
- Modify: `app/components/AcademyDashboard.tsx`
- Modify: `app/components/App.test.tsx`

**Interfaces:**
- Consumes: current quest slug or `"academy"`, optional browser `SpeechRecognition`.
- Produces: `QuestionNote`, `loadQuestionNotes()`, `saveQuestionNote()`, floating and full-page assistant modes.

- [ ] **Step 1: Write failing note and no-fake-answer tests**

```ts
it("saves questions per project and recovers from broken note storage", () => {
  const storage = new MemoryStorage();
  storage.setItem("feya-dashboard-v1:notes:planner", "broken");
  saveQuestionNote("planner", "Как добавить календарь?", storage, () => "2026-08-14T12:00:00.000Z");
  expect(loadQuestionNotes("planner", storage)).toEqual([{ id: "2026-08-14T12:00:00.000Z", text: "Как добавить календарь?", createdAt: "2026-08-14T12:00:00.000Z" }]);
});
```

```tsx
it("saves a Fairy question without inventing an AI reply", async () => {
  window.history.replaceState({}, "", "/?section=fairy");
  render(<AppEntry />);
  fireEvent.change(await screen.findByRole("textbox", { name: /вопрос феечке/i }), { target: { value: "Не понимаю следующий шаг" } });
  fireEvent.click(screen.getByRole("button", { name: /сохранить вопрос/i }));
  expect(screen.getByText(/вопрос сохранён/i)).toBeInTheDocument();
  expect(screen.queryByText(/ответ ИИ/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm run test:unit -- app/lib/academy-dashboard.test.ts app/components/App.test.tsx`

Expected: FAIL because note helpers and assistant are missing.

- [ ] **Step 3: Add safe note persistence**

```ts
export type QuestionNote = { id: string; text: string; createdAt: string };

function questionNotes(value: unknown): value is QuestionNote[] {
  return Array.isArray(value) && value.every((item) => Boolean(item) && typeof item === "object" && typeof (item as QuestionNote).id === "string" && typeof (item as QuestionNote).text === "string" && typeof (item as QuestionNote).createdAt === "string");
}

export function loadQuestionNotes(scope: string, storage: StorageLike): QuestionNote[] {
  return readJson(storage, `${PREFIX}:notes:${scope}`, [], questionNotes);
}

export function saveQuestionNote(scope: string, text: string, storage: StorageLike, now = () => new Date().toISOString()): QuestionNote[] {
  const trimmed = text.trim();
  if (!trimmed) return loadQuestionNotes(scope, storage);
  const createdAt = now();
  const next = [...loadQuestionNotes(scope, storage), { id: createdAt, text: trimmed, createdAt }];
  storage.setItem(`${PREFIX}:notes:${scope}`, JSON.stringify(next));
  return next;
}
```

- [ ] **Step 4: Implement the assistant UI and capability check**

`FairyAssistant` must show a textarea, microphone button only when `window.SpeechRecognition || window.webkitSpeechRecognition` exists, and the exact confirmation:

```tsx
<p role="status">Вопрос сохранён на этом устройстве. Покажите его куратору или вставьте в ChatGPT/Codex.</p>
```

Speech recognition writes the transcript into the textarea but never submits automatically. The floating trigger in `LearningShell` opens the same component with the current quest scope; the full `fairy` section uses scope `academy`.

- [ ] **Step 5: Run assistant tests**

Run: `npm run test:unit -- app/lib/academy-dashboard.test.ts app/components/App.test.tsx`

Expected: PASS; no element claims that the AI answered.

- [ ] **Step 6: Commit Fairy assistance**

```bash
git add app/components/FairyAssistant.tsx app/lib/academy-dashboard.ts app/lib/academy-dashboard.test.ts app/components/LearningShell.tsx app/components/AcademyDashboard.tsx app/components/App.test.tsx
git commit -m "feat: add honest Fairy project notes"
```

### Task 6: Desktop quest workspace

**Files:**
- Modify: `app/components/Quest.tsx`
- Modify: `app/components/App.test.tsx`

**Interfaces:**
- Consumes: unchanged quest builders, preparation, customization, progress and screenshot data.
- Produces: center step card, right level map, fixed actions, `data-quest-workspace="desktop"`.

- [ ] **Step 1: Write failing desktop workspace tests**

```tsx
it("renders one desktop step with purpose, action, result and level map", () => {
  const { container } = render(<Quest project={getQuestProject("pressure-diary")!} onHome={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
  expect(container.querySelector('[data-quest-workspace="desktop"]')).not.toBeNull();
  expect(screen.getByRole("navigation", { name: /карта уровней/i })).toBeInTheDocument();
  expect(screen.getByText("Зачем")).toBeInTheDocument();
  expect(screen.getByText("Что сделать")).toBeInTheDocument();
  expect(screen.getByText("Готово, если")).toBeInTheDocument();
});

it("continues from a reopened completed desktop step and scrolls to top", () => {
  localStorage.setItem(progressKey("pressure-diary"), JSON.stringify({ version: 1, activeStep: 1, completed: [1], score: 10 }));
  render(<Quest project={getQuestProject("pressure-diary")!} onHome={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /продолжить/i }));
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  expect(screen.getByText(/уровень 2/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run desktop quest tests and verify failure**

Run: `npm run test:unit -- app/components/App.test.tsx`

Expected: FAIL on the new semantic workspace and labels.

- [ ] **Step 3: Replace the old hero/rail arrangement without changing quest data**

Render the ready quest state as:

```tsx
<main className="quest-workspace" data-quest-workspace="desktop">
  <article className="quest-step-card">
    <header className="quest-step-heading"><p>{step.eyebrow} · уровень {step.id} из {totalLevels}</p><h1>{step.title}</h1></header>
    <section className="quest-purpose"><h2>Зачем</h2><LessonText text={step.why} kind="why" /></section>
    <BeginnerTerms terms={step.beginnerTerms} />
    <section className="quest-action"><h2>Что сделать</h2><LessonText text={step.action} variant="action" kind="action" /></section>
    {step.prompt && <section className="quest-prompt"><header><h2>Готовая команда для Codex</h2><span>Скопируйте целиком</span></header><pre>{step.prompt}</pre><button type="button" onClick={() => copy(step.prompt!, "main")}>{copied === "main" ? "Скопировано ✓" : "Скопировать команду"}</button></section>}
    {step.guide && <QuestGuide frames={step.guide} />}
    <QuestLinks links={step.links} />
    <section className="quest-result"><div><h2>Готово, если</h2>{step.showScreenshot !== false && <span>{screenshotBadge}</span>}</div>{step.showScreenshot !== false && <button type="button" className={`reference-shot screenshot-${step.screenshotKind ?? "prototype"}`} onClick={() => setImageOpen(true)} aria-label="Увеличить пример результата"><img src={step.screenshot} alt={screenshotAlt} /><span>Увеличить</span></button>}<ul>{step.expected.map((item) => <li key={item}><span aria-hidden="true">✓</span>{item}</li>)}</ul></section>
    {helpOpen && <section className="help-card"><span aria-hidden="true">?</span><div><h2>{step.help.title}</h2><LessonText text={step.help.body} kind="help" /><div className="help-copy"><p>{step.help.prompt}</p><button type="button" onClick={() => copy(step.help.prompt, "help")}>{copied === "help" ? "Скопировано ✓" : "Скопировать команду помощи"}</button></div></div></section>}
    <footer className="quest-step-actions"><button type="button" onClick={() => openStep(step.id - 1)} disabled={step.id === 1}>← Назад</button><button type="button" onClick={finishStep}>{progress.completed.includes(step.id) ? step.id === lastLevel ? "Квест пройден ✦" : "Продолжить →" : step.id === lastLevel ? "Завершить квест ✦" : "Я сделала — продолжить →"}</button></footer>
  </article>
  <aside className="quest-level-panel"><div><span>Прогресс</span><strong>{progress.completed.length}/{totalLevels}</strong></div><nav aria-label="Карта уровней">{steps.map((item) => { const unlocked = isStepUnlocked(progress, item.id); const done = progress.completed.includes(item.id); return <button type="button" key={item.id} disabled={!unlocked} aria-current={item.id === step.id ? "step" : undefined} aria-label={`Уровень ${item.id}: ${item.title}${unlocked ? "" : ", закрыт"}`} onClick={() => openStep(item.id)}><span>{done ? "✓" : item.id}</span><b>{item.title}</b></button>; })}</nav></aside>
</main>
```

Preserve preparation, format choice, server offer, customization, real/placeholder screenshot labels, reset logic and all existing helper prompts above or inside this ready-state block.

- [ ] **Step 4: Ensure every step-changing function scrolls to top**

Use one helper from both the level map and actions:

```ts
function openStep(id: number) {
  const next = { ...progress, activeStep: id };
  setProgress(next);
  saveProgress(storageSlug, next, window.localStorage);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
```

- [ ] **Step 5: Run desktop quest regressions**

Run: `npm run test:unit -- app/components/App.test.tsx app/components/AppRoutes.test.tsx`

Expected: PASS for new workspace plus existing server, install, reset, screenshot, format-choice and direct-route tests.

- [ ] **Step 6: Commit desktop quest workspace**

```bash
git add app/components/Quest.tsx app/components/App.test.tsx
git commit -m "feat: redesign desktop quest workspace"
```

### Task 7: Mobile quest workspace

**Files:**
- Modify: `app/components/MobileQuest.tsx`
- Modify: `app/components/App.test.tsx`

**Interfaces:**
- Consumes: same quest state and helpers as desktop, mobile-specific progress namespace.
- Produces: full-width step, collapsible level sheet, bottom-safe actions, `data-quest-workspace="mobile"`.

- [ ] **Step 1: Write failing mobile workspace tests**

```tsx
it("keeps the mobile step full width and opens its level map on demand", () => {
  const { container } = render(<MobileQuest project={getQuestProject("pressure-diary")!} onHome={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
  expect(container.querySelector('[data-quest-workspace="mobile"]')).not.toBeNull();
  expect(screen.queryByRole("navigation", { name: /карта уровней/i })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /открыть карту уровней/i }));
  expect(screen.getByRole("navigation", { name: /карта уровней/i })).toBeInTheDocument();
});

it("continues from a reopened completed mobile step", () => {
  localStorage.setItem(progressKey("mobile:pressure-diary"), JSON.stringify({ version: 1, activeStep: 1, completed: [1], score: 10 }));
  render(<MobileQuest project={getQuestProject("pressure-diary")!} onHome={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /продолжить/i }));
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
});
```

- [ ] **Step 2: Run mobile tests and verify failure**

Run: `npm run test:unit -- app/components/App.test.tsx`

Expected: FAIL on the missing mobile workspace and collapsible map.

- [ ] **Step 3: Refactor the ready state to the shared information order**

Add `const [mapOpen, setMapOpen] = useState(false);` and one step opener:

```ts
function openMobileStep(id: number) {
  if (!isStepUnlocked(progress, id)) return;
  const next = { ...progress, activeStep: id };
  setProgress(next);
  saveProgress(storageSlug, next, window.localStorage);
  setMapOpen(false);
  setHelpOpen(false);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
```

Use the same visible order as desktop: title → why → terms → what to do → prompt → guide/screenshot → `Готово, если` → help → actions. Keep the mobile-specific `MobileActionButton`, screenshot modal and capability badge. Replace the always-visible horizontal rail and old card with:

```tsx
<main className="mobile-quest-workspace" data-quest-workspace="mobile">
  <button className="mobile-level-map-trigger" type="button" aria-expanded={mapOpen} onClick={() => setMapOpen((value) => !value)}>Уровень {step.id} из {totalLevels} · Открыть карту уровней</button>
  {mapOpen && <aside className="mobile-level-sheet"><header><h2>Карта уровней</h2><button type="button" onClick={() => setMapOpen(false)} aria-label="Закрыть карту уровней">×</button></header><nav aria-label="Карта уровней">{steps.map((item) => { const unlocked = isStepUnlocked(progress, item.id); const done = progress.completed.includes(item.id); return <button type="button" key={item.id} disabled={!unlocked} aria-current={item.id === step.id ? "step" : undefined} aria-label={`Уровень ${item.id}: ${item.title}${unlocked ? "" : ", закрыт"}`} onClick={() => openMobileStep(item.id)}><span>{done ? "✓" : item.id}</span><b>{item.title}</b></button>; })}</nav></aside>}
  <article className="mobile-quest-step-card">
    <header><p>{step.eyebrow} · уровень {step.id} из {totalLevels}</p><h1>{step.title}</h1></header>
    <section className="mobile-why"><h2>Зачем</h2><LessonText text={step.why} kind="why" /></section>
    <BeginnerTerms terms={step.beginnerTerms} />
    <section className="mobile-do"><h2>Что сделать</h2><LessonText text={step.action} variant="action" kind="action" /><MobileActionButton action={step.mobileAction} projectSlug={project.slug} step={step.id} /></section>
    {step.prompt && <section className="mobile-prompt"><header><h2>Готовая команда для Codex</h2><span>Скопируйте целиком</span></header><p>{step.prompt}</p><button type="button" onClick={() => copyPrompt(step.prompt!, "main")}>{copied === "main" ? "Скопировано ✓" : "Скопировать команду"}</button></section>}
    <QuestLinks links={step.links} />
    {step.guide && <QuestGuide frames={step.guide} />}
    <section className="mobile-result"><div><h2>Готово, если</h2>{step.showScreenshot !== false && <span>{screenshotBadge}</span>}</div>{step.showScreenshot !== false && <button type="button" className={`screenshot-${step.screenshotKind ?? "prototype"}`} onClick={() => setImageOpen(true)} aria-label="Увеличить мобильный пример"><img src={step.screenshot} alt={screenshotAlt} /><span>Увеличить</span></button>}<ul>{step.expected.map((item) => <li key={item}><span aria-hidden="true">✓</span>{item}</li>)}</ul></section>
    {helpOpen && <section className="mobile-help"><span aria-hidden="true">?</span><div><h2>{step.help.title}</h2><LessonText text={step.help.body} kind="help" /><div className="mobile-help-prompt"><p>{step.help.prompt}</p><button type="button" onClick={() => copyPrompt(step.help.prompt, "help")}>{copied === "help" ? "Скопировано ✓" : "Скопировать команду помощи"}</button></div></div></section>}
    <footer className="mobile-quest-step-actions"><button type="button" onClick={() => openMobileStep(step.id - 1)} disabled={step.id === 1}>← Назад</button><button type="button" onClick={finishStep}>{progress.completed.includes(step.id) ? step.id === lastLevel ? "Квест пройден ✦" : "Продолжить →" : step.id === lastLevel ? "Завершить квест ✦" : "Я сделала — продолжить →"}</button></footer>
  </article>
</main>
```

- [ ] **Step 4: Keep actions reachable above the global bottom navigation**

The mobile action footer uses `position: sticky; bottom: calc(72px + env(safe-area-inset-bottom));` in Task 8 and contains `Назад` plus the same continuation labels as desktop.

- [ ] **Step 5: Run mobile and route regressions**

Run: `npm run test:unit -- app/components/App.test.tsx app/components/AppRoutes.test.tsx app/content/mobile.test.ts`

Expected: PASS with separate mobile progress, no format cross-contamination and the new map behavior.

- [ ] **Step 6: Commit mobile quest workspace**

```bash
git add app/components/MobileQuest.tsx app/components/App.test.tsx
git commit -m "feat: redesign mobile quest workspace"
```

### Task 8: Pink Cloud visual system and responsive safeguards

**Files:**
- Create: `app/pink-learning-dashboard.css`
- Create: `scripts/dashboard-layout.test.mjs`
- Modify: `app/layout.tsx`
- Modify: `scripts/hero-layout.test.mjs`
- Modify: `scripts/quest-typography.test.mjs`

**Interfaces:**
- Consumes: semantic class names from Tasks 2–7.
- Produces: WCAG-readable pink cloud theme, responsive shell and layout regression tests.

- [ ] **Step 1: Generate and record the design-system recommendation**

Run the required design-system and React guidance searches, then use the output only to validate tokens and component patterns. Do not add a UI runtime library and do not replace project prototype covers.

```bash
python3 /Users/jenniferzelenova/.codex/skills/ui-ux-pro-max/scripts/search.py "education learning dashboard women beginners pink cloud glassmorphism accessible" --design-system --persist -p "SUBMARINE Quest Academy" -f markdown
python3 /Users/jenniferzelenova/.codex/skills/ui-ux-pro-max/scripts/search.py "responsive dashboard navigation accessibility state" --stack react
```

- [ ] **Step 2: Write failing layout checks**

Create this executable route-and-layout test:

```js
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { after, before, test } from "node:test";
import { chromium } from "@playwright/test";

const root = path.resolve(import.meta.dirname, "..");
const port = 4178;
const origin = `http://127.0.0.1:${port}`;
let server;

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Dashboard test server did not start");
}

before(async () => {
  server = spawn("npm", ["run", "dev", "--", "--port", String(port)], { cwd: root, env: process.env, stdio: "ignore" });
  await waitForServer();
});

after(() => server?.kill("SIGTERM"));

test("dashboard and quests do not overlap or overflow", async () => {
  const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const routes = ["/", "/?section=projects", "/?section=weeks", "/?quest=pressure-diary", "/?format=mobile"];
  try {
    for (const width of [375, 768, 1024, 1440]) {
      for (const route of routes) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.goto(`${origin}${route}`, { waitUntil: "networkidle" });
        const demo = page.getByRole("button", { name: /работать на вымышленных данных/i });
        if (await demo.count()) await demo.first().click();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        assert.ok(overflow <= 1, `${route} at ${width}px has ${overflow}px horizontal overflow`);
        if (width <= 767) {
          const undersized = await page.locator("button:visible, a:visible").evaluateAll((nodes) => nodes.filter((node) => {
            const box = node.getBoundingClientRect();
            return box.width < 44 || box.height < 44;
          }).map((node) => node.getAttribute("aria-label") || node.textContent?.trim()));
          assert.deepEqual(undersized, [], `${route} at ${width}px has undersized controls`);
        }
        const sidebar = page.locator(".learning-sidebar");
        const main = page.locator(".learning-main");
        const bottom = page.locator(".learning-bottom-nav");
        if (width >= 1024) {
          const sideBox = await sidebar.boundingBox();
          const mainBox = await main.boundingBox();
          assert.ok(sideBox && mainBox && sideBox.x + sideBox.width <= mainBox.x, `${route} at ${width}px overlaps sidebar and content`);
          assert.equal(await bottom.evaluate((node) => getComputedStyle(node).display), "none");
        }
        if (width <= 767) assert.notEqual(await bottom.evaluate((node) => getComputedStyle(node).display), "none");
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
});
```

- [ ] **Step 3: Run script tests and verify failure against the old CSS**

Run: `npm run test:scripts`

Expected: FAIL on missing Pink Cloud selectors or layout behavior.

- [ ] **Step 4: Implement exact theme tokens and foundation styles**

Start `app/pink-learning-dashboard.css` with:

```css
:root {
  --cloud-bg: #f8f4fb;
  --cloud-bg-rose: #fff2f7;
  --cloud-surface: rgba(255, 255, 255, 0.86);
  --cloud-surface-solid: #ffffff;
  --cloud-border: rgba(91, 55, 80, 0.12);
  --cloud-text: #2d2430;
  --cloud-muted: #756777;
  --cloud-pink: #ec4f93;
  --cloud-pink-dark: #c92e74;
  --cloud-pink-soft: #ffd7e8;
  --cloud-success: #337a5b;
  --cloud-error: #b9364e;
  --cloud-gradient: linear-gradient(135deg, #f05a9f 0%, #d83f8c 48%, #bb3f93 100%);
  --cloud-shadow: 0 18px 60px rgba(75, 42, 68, 0.10);
  --cloud-radius-lg: 28px;
  --cloud-radius-md: 20px;
  --cloud-body: 17px;
}

* { box-sizing: border-box; }
html { background: var(--cloud-bg); color: var(--cloud-text); }
body { margin: 0; font-family: Manrope, Inter, ui-sans-serif, system-ui, sans-serif; background: radial-gradient(circle at 80% 0%, #ffe1ee 0, transparent 34%), var(--cloud-bg); }
:focus-visible { outline: 3px solid #9b2868; outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; } }

.learning-shell { min-height: 100vh; display: grid; grid-template-columns: 264px minmax(0, 1fr); color: var(--cloud-text); }
.learning-sidebar { position: sticky; top: 0; height: 100vh; padding: 28px 20px; background: rgba(255,255,255,.78); border-right: 1px solid var(--cloud-border); backdrop-filter: blur(24px); z-index: 20; }
.learning-brand, .learning-sidebar nav button, .format-switch { width: 100%; min-height: 48px; border: 0; border-radius: 16px; background: transparent; color: var(--cloud-text); display: flex; align-items: center; gap: 12px; padding: 0 14px; cursor: pointer; text-align: left; }
.learning-brand { margin-bottom: 34px; }
.learning-brand > svg { color: var(--cloud-pink); }
.learning-brand b { display: grid; font-size: 15px; letter-spacing: .08em; }
.learning-brand small { color: var(--cloud-muted); font-size: 11px; letter-spacing: 0; }
.learning-sidebar nav { display: grid; gap: 8px; }
.learning-sidebar nav button:hover, .learning-sidebar nav button.active { background: var(--cloud-pink-soft); color: var(--cloud-pink-dark); }
.format-switch { position: absolute; left: 20px; bottom: 24px; width: calc(100% - 40px); border: 1px solid var(--cloud-border); font-size: 13px; }
.learning-main { min-width: 0; padding: 24px clamp(20px, 3vw, 52px) 64px; }
.learning-topbar { min-height: 64px; display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
.learning-topbar form { flex: 1; max-width: 720px; display: flex; gap: 10px; }
.learning-topbar label { min-width: 0; flex: 1; height: 52px; display: flex; align-items: center; gap: 10px; padding: 0 16px; border: 1px solid var(--cloud-border); border-radius: 18px; background: var(--cloud-surface); }
.learning-topbar input { width: 100%; border: 0; outline: 0; background: transparent; color: var(--cloud-text); font: inherit; }
.learning-topbar form button { min-width: 88px; border: 0; border-radius: 16px; background: var(--cloud-text); color: #fff; font-weight: 700; cursor: pointer; }
.learning-bottom-nav { display: none; }
.next-quest-banner { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(280px, .9fr); gap: 30px; min-height: 320px; padding: clamp(28px, 4vw, 52px); border-radius: var(--cloud-radius-lg); color: #fff; background: var(--cloud-gradient); box-shadow: var(--cloud-shadow); overflow: hidden; }
.next-quest-banner > div { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; }
.next-quest-banner h1 { margin: 8px 0 12px; max-width: 720px; font-size: clamp(34px, 4vw, 58px); line-height: 1.02; overflow-wrap: anywhere; }
.next-quest-banner a { min-height: 48px; display: inline-flex; align-items: center; margin-top: 24px; padding: 0 22px; border-radius: 16px; background: #fff; color: var(--cloud-pink-dark); font-weight: 800; text-decoration: none; }
.next-quest-banner .project-preview { min-width: 0; align-self: center; border-radius: 22px; transform: rotate(1.5deg); box-shadow: 0 24px 60px rgba(65,16,49,.28); }
.dashboard-stat-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin: 20px 0 40px; }
.dashboard-stat-grid article, .dashboard-project-card, .portfolio-grid article, .quest-step-card, .quest-level-panel { border: 1px solid var(--cloud-border); background: var(--cloud-surface); box-shadow: var(--cloud-shadow); backdrop-filter: blur(18px); }
.dashboard-stat-grid article { min-height: 120px; padding: 22px; border-radius: var(--cloud-radius-md); }
.dashboard-stat-grid span { color: var(--cloud-muted); }
.dashboard-stat-grid strong { display: block; margin-top: 10px; font-size: 34px; }
.dashboard-card-grid, .portfolio-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
.dashboard-project-card { min-width: 0; border-radius: var(--cloud-radius-md); overflow: hidden; }
.dashboard-card-body { padding: 20px; }
.dashboard-card-body h3, .portfolio-grid h2 { overflow-wrap: anywhere; }
.dashboard-card-labels { display: flex; flex-wrap: wrap; gap: 6px; }
.dashboard-card-labels span { padding: 6px 9px; border-radius: 999px; background: var(--cloud-bg-rose); color: var(--cloud-muted); font-size: 12px; }
.dashboard-progress { display: flex; align-items: center; gap: 10px; margin-top: 18px; }
.dashboard-progress i { flex: 1; height: 7px; border-radius: 99px; background: #eee6ed; overflow: hidden; }
.dashboard-progress b { display: block; height: 100%; background: var(--cloud-gradient); }
.dashboard-card-body footer { display: flex; justify-content: space-between; gap: 10px; margin-top: 18px; }
.dashboard-card-body footer button, .dashboard-card-body footer a, .portfolio-grid button { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; border-radius: 13px; padding: 0 14px; cursor: pointer; }
.dashboard-card-body footer a, .portfolio-grid button { border: 0; background: var(--cloud-text); color: #fff; text-decoration: none; }
.dashboard-card-body footer button { border: 1px solid var(--cloud-border); background: #fff; color: var(--cloud-text); }
.dashboard-card-body footer button.saved { border-color: var(--cloud-success); color: var(--cloud-success); }
.quest-workspace { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 24px; align-items: start; }
.quest-step-card, .quest-level-panel { border-radius: var(--cloud-radius-lg); }
.quest-step-card { min-width: 0; padding: clamp(22px, 4vw, 48px); font-size: 18px; line-height: 1.65; }
.quest-level-panel { position: sticky; top: 24px; max-height: calc(100vh - 48px); padding: 18px; overflow: auto; }
.quest-level-panel nav { display: grid; gap: 8px; margin-top: 16px; }
.quest-level-panel nav button { min-height: 48px; display: grid; grid-template-columns: 30px 1fr; align-items: center; gap: 8px; border: 0; border-radius: 13px; background: transparent; color: var(--cloud-text); text-align: left; cursor: pointer; }
.quest-level-panel nav button[aria-current="step"] { background: var(--cloud-pink-soft); color: var(--cloud-pink-dark); }
.quest-step-actions { position: sticky; bottom: 12px; display: grid; grid-template-columns: minmax(120px, .35fr) minmax(220px, 1fr); gap: 12px; margin-top: 28px; padding: 10px; border-radius: 18px; background: rgba(255,255,255,.92); box-shadow: 0 12px 30px rgba(75,42,68,.14); backdrop-filter: blur(18px); }
.quest-step-actions button { min-height: 52px; border: 1px solid var(--cloud-border); border-radius: 14px; background: #fff; color: var(--cloud-text); font-weight: 800; cursor: pointer; }
.quest-step-actions button:last-child { border: 0; background: var(--cloud-gradient); color: #fff; }
.mobile-quest-workspace { min-width: 0; }
.mobile-level-map-trigger { width: 100%; min-height: 48px; margin-bottom: 12px; border: 1px solid var(--cloud-border); border-radius: 16px; background: var(--cloud-surface); color: var(--cloud-text); font-weight: 800; cursor: pointer; }
.mobile-level-sheet { position: fixed; z-index: 80; left: 10px; right: 10px; bottom: calc(82px + env(safe-area-inset-bottom)); max-height: 70vh; padding: 18px; border: 1px solid var(--cloud-border); border-radius: 24px; background: #fff; box-shadow: var(--cloud-shadow); overflow: auto; }
.mobile-level-sheet header { display: flex; align-items: center; justify-content: space-between; }
.mobile-level-sheet header button, .mobile-level-sheet nav button { min-height: 44px; border: 0; border-radius: 13px; background: transparent; color: var(--cloud-text); cursor: pointer; }
.mobile-level-sheet header button { min-width: 44px; font-size: 24px; }
.mobile-level-sheet nav { display: grid; gap: 8px; }
.mobile-level-sheet nav button { width: 100%; display: grid; grid-template-columns: 30px 1fr; align-items: center; gap: 8px; text-align: left; }
.mobile-level-sheet nav button[aria-current="step"] { background: var(--cloud-pink-soft); color: var(--cloud-pink-dark); }
.mobile-quest-step-card { min-width: 0; padding: 22px 18px; border: 1px solid var(--cloud-border); border-radius: var(--cloud-radius-lg); background: var(--cloud-surface); box-shadow: var(--cloud-shadow); font-size: 17px; line-height: 1.65; }
.mobile-quest-step-actions { position: sticky; bottom: calc(82px + env(safe-area-inset-bottom)); display: grid; grid-template-columns: minmax(88px, .4fr) minmax(0, 1fr); gap: 8px; margin-top: 24px; padding: 8px; border-radius: 16px; background: rgba(255,255,255,.94); box-shadow: 0 12px 30px rgba(75,42,68,.14); }
.mobile-quest-step-actions button { min-height: 48px; border: 1px solid var(--cloud-border); border-radius: 13px; background: #fff; color: var(--cloud-text); font-weight: 800; cursor: pointer; }
.mobile-quest-step-actions button:last-child { border: 0; background: var(--cloud-gradient); color: #fff; }

@media (max-width: 1180px) {
  .dashboard-card-grid, .portfolio-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .quest-workspace { grid-template-columns: minmax(0, 1fr) 240px; }
}

@media (max-width: 767px) {
  .learning-shell { display: block; }
  .learning-sidebar, .learning-topbar { display: none; }
  .learning-main { padding: 18px 14px calc(104px + env(safe-area-inset-bottom)); }
  .learning-bottom-nav { position: fixed; z-index: 50; left: 10px; right: 10px; bottom: calc(8px + env(safe-area-inset-bottom)); min-height: 72px; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); padding: 8px; border: 1px solid var(--cloud-border); border-radius: 22px; background: rgba(255,255,255,.94); box-shadow: var(--cloud-shadow); backdrop-filter: blur(24px); }
  .learning-bottom-nav button { min-width: 44px; min-height: 56px; display: grid; place-items: center; gap: 2px; border: 0; border-radius: 14px; background: transparent; color: var(--cloud-muted); cursor: pointer; }
  .learning-bottom-nav button[aria-current="page"] { background: var(--cloud-pink-soft); color: var(--cloud-pink-dark); }
  .learning-bottom-nav small { max-width: 100%; overflow: hidden; text-overflow: ellipsis; font-size: 9px; white-space: nowrap; }
  .next-quest-banner { grid-template-columns: 1fr; min-height: 0; padding: 24px 20px; }
  .next-quest-banner h1 { font-size: 34px; }
  .dashboard-stat-grid { grid-template-columns: 1fr; }
  .dashboard-card-grid, .portfolio-grid { grid-template-columns: 1fr; }
  .quest-workspace { display: block; }
  .quest-level-panel { display: none; }
  .quest-step-card { padding: 22px 18px; font-size: 17px; }
  .quest-step-actions { bottom: calc(82px + env(safe-area-inset-bottom)); grid-template-columns: minmax(96px, .4fr) 1fr; }
  .quest-step-actions button, .mobile-quest-step-actions button, .dashboard-card-body footer button, .dashboard-card-body footer a, .portfolio-grid button { min-height: 44px; }
}
```

- [ ] **Step 5: Connect the new stylesheet**

In `app/layout.tsx` replace:

```ts
import "./tactile-album.css";
```

with:

```ts
import "./pink-learning-dashboard.css";
```

Keep `globals.css` for legacy capture scenes and prototype styling.

- [ ] **Step 6: Update typography and hero script contracts**

Change `scripts/quest-typography.test.mjs` to read `.quest-step-card` and `.mobile-quest-step-card` while retaining exact 18 px and 17 px body assertions. Replace the old album-overlap markup in `hero-layout.test.mjs` with `.next-quest-banner` and assert its copy and preview stay in separate grid columns from 1024 through 2048 px.

- [ ] **Step 7: Run layout, unit, lint and build checks**

Run:

```bash
npm run test:scripts
npm run test:unit
npm run lint
npm run build
```

Expected: all commands exit 0; no layout test reports overflow, overlap or undersized mobile controls.

- [ ] **Step 8: Commit the visual system**

```bash
git add app/pink-learning-dashboard.css app/layout.tsx scripts/dashboard-layout.test.mjs scripts/hero-layout.test.mjs scripts/quest-typography.test.mjs
git commit -m "feat: apply pink cloud learning design"
```

### Task 9: Full verification, browser QA, and production deployment

**Files:**
- Modify only if a verified regression is found: files owned by Tasks 1–8.
- Read: `.openai/hosting.json`

**Interfaces:**
- Consumes: completed implementation, existing screenshot verifier and Sites hosting configuration.
- Produces: verified build, live Sites version and checked production routes.

- [ ] **Step 1: Run the complete automated suite**

Run:

```bash
npm test
npm run lint
npm run verify:screens
```

Expected: script tests, unit tests, production build, lint and screen verification all exit 0. Existing capture routes must still render every expected screen.

- [ ] **Step 2: Perform focused browser QA**

Check these routes in the in-app browser at desktop and mobile widths:

```text
/
/?section=projects
/?section=weeks
/?section=portfolio
/?section=fairy
/?quest=server-152fz
/?quest=install-codex
/?format=mobile&quest=pressure-diary
```

Verify: no overlap, no horizontal scroll, search resets, save/unsave works, the hero continues the last project, completed work appears in portfolio, revisited levels continue, and every next step scrolls to top.

- [ ] **Step 3: Verify repository scope before publishing**

Run:

```bash
git status --short
git diff --check
git log --oneline -10
```

Expected: no unintended source changes; `.superpowers/` remains untracked and is not added; `git diff --check` exits 0.

- [ ] **Step 4: Save and deploy with Sites**

Activate `sites:sites-building` to validate the existing Sites project, then `sites:sites-hosting` to save a new source version from the committed branch and deploy it to the configured production site in `.openai/hosting.json`. If Sites reports `We couldn't fetch the saved Site source`, optimise the staged PNG archive, create and push a new source commit, save that version, then deploy the saved version.

- [ ] **Step 5: Verify production, not only the deployment response**

Open and check:

```text
https://feya-quest-academy.submarine-edu.chatgpt.site/
https://feya-quest-academy.submarine-edu.chatgpt.site/?section=projects
https://feya-quest-academy.submarine-edu.chatgpt.site/?quest=server-152fz
https://feya-quest-academy.submarine-edu.chatgpt.site/?format=mobile&quest=pressure-diary
```

Expected: the Pink Cloud shell is visible, routes resolve, original project prototypes load, desktop/mobile progress survives refresh, and no console error blocks navigation.

- [ ] **Step 6: Record the final deployment commit**

If deployment created a source-only optimisation commit, ensure it is pushed. Otherwise no extra empty commit is required. Report the deployed Sites version and live URL.

---

## Coverage Map

- Главная, следующий квест, статистика, продолжение и текущая неделя: Tasks 1 and 3.
- Мои проекты, сохранённое без дублей, недели, поиск, фильтры и пустые состояния: Task 4.
- Автоматическое портфолио и дата завершения: Tasks 1 and 4.
- Общая desktop/mobile навигация и совместимые query-маршруты: Task 2.
- Феечка, голос, заметки и честное поведение без ИИ-бэкенда: Task 5.
- Центральный шаг, карта уровней, читаемый порядок, повторный переход и scroll-to-top: Tasks 6 and 7.
- Вариант B «Розовое облако», адаптивность, фокус, reduced motion и 44×44 px: Task 8.
- Старые прогрессы, capture-маршруты, оригинальные обложки, сборка и production: Tasks 1, 2 and 9.
