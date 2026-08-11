# Quest Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sort catalogue cards by week and difficulty, then let a beginner filter them by difficulty, goal keywords, and free-text synonyms.

**Architecture:** A focused `discovery.ts` module owns manual per-quest metadata and pure catalogue filtering/sorting functions. Desktop and mobile catalogues consume the same functions, while cards only render the resolved profile. Existing project and progress types remain unchanged.

**Tech Stack:** TypeScript, React 19, Vitest, Testing Library, existing CSS.

## Global Constraints

- Preserve 45 catalogue cards and 52 concrete quest paths.
- Default order is week 1 through week 6, then difficulty 1 through 4, then stable source order.
- Difficulty labels are exactly `Стартовый`, `Лёгкий`, `Средний`, `Продвинутый`.
- Goal filters are exactly `Для себя`, `Семья и быт`, `Здоровье`, `Контент`, `Для клиентов`, `Для заработка`, `Сайты и сервисы`, `ИИ-агенты`, `Настройка`.
- Bundle cards show the min-to-max difficulty range and match any level inside that range.
- Existing progress and customization localStorage keys must not change.

---

### Task 1: Discovery metadata and pure selectors

**Files:**
- Create: `app/content/discovery.ts`
- Create: `app/content/discovery.test.ts`

**Interfaces:**
- Consumes: `CatalogProject`, `ProjectDefinition`, `isProjectBundle`, and `questProjects`.
- Produces: `Difficulty = 1 | 2 | 3 | 4`, `GoalKeyword`, `QuestDiscoveryProfile`, `CatalogDiscoveryProfile`, `getQuestDiscoveryProfile(slug)`, `getCatalogDiscoveryProfile(project)`, `filterAndSortProjects(projects, filters)`.

- [ ] **Step 1: Write failing coverage and sorting tests**

```ts
it("classifies every concrete quest", () => {
  expect(questProjects.every((project) => getQuestDiscoveryProfile(project.slug).keywords.length >= 2)).toBe(true);
});

it("sorts by week and then difficulty", () => {
  const result = filterAndSortProjects(projects, { week: 0, difficulty: 0, goal: "Все цели", query: "" });
  expect(result.map((project) => project.slug).slice(0, 3)).toEqual(["install-codex", "planning", "ideas"]);
  for (let index = 1; index < result.length; index += 1) {
    const previous = getCatalogDiscoveryProfile(result[index - 1]);
    const current = getCatalogDiscoveryProfile(result[index]);
    expect(previous.firstWeek < current.firstWeek || (previous.firstWeek === current.firstWeek && previous.minDifficulty <= current.minDifficulty)).toBe(true);
  }
});

it("finds a project by keyword synonym", () => {
  expect(filterAndSortProjects(projects, { week: 0, difficulty: 0, goal: "Все цели", query: "мама" }).map((item) => item.slug)).toContain("family-schedule");
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm run test:unit -- app/content/discovery.test.ts`

Expected: FAIL because `./discovery` does not exist.

- [ ] **Step 3: Implement the discovery model**

Create exact types and a complete record keyed by all 52 concrete slugs:

```ts
export type Difficulty = 1 | 2 | 3 | 4;
export type GoalKeyword = "Для себя" | "Семья и быт" | "Здоровье" | "Контент" | "Для клиентов" | "Для заработка" | "Сайты и сервисы" | "ИИ-агенты" | "Настройка";
export type GoalFilter = "Все цели" | GoalKeyword;

export type QuestDiscoveryProfile = {
  difficulty: Difficulty;
  keywords: GoalKeyword[];
  synonyms: string[];
};

export const difficultyLabels: Record<Difficulty, string> = {
  1: "Стартовый",
  2: "Лёгкий",
  3: "Средний",
  4: "Продвинутый",
};
```

Use these exact difficulty groups:

```ts
const difficultyGroups: Record<Difficulty, string[]> = {
  1: ["install-codex", "family-expenses", "planner", "idea-vault", "child-schedule", "pressure-diary", "fitness-tracker", "recipe-book", "personal-organizer", "home-helper", "portfolio-site"],
  2: ["day-planner-agent", "home-organizer-agent", "meal-planning-agent", "study-agent", "idea-analysis-agent", "expense-agent", "family-schedule-agent", "habit-agent", "lead-agent", "brief-agent", "selector-agent", "content-agent", "expert-assistant-agent", "event-organizer-agent", "client-care-agent", "expert-site", "beauty-site", "photographer-site", "designer-site", "consultation-site", "event-site"],
  3: ["api-keys", "family-health-hub", "booking-agent", "sales-manager-agent", "administrator-agent", "consultant-agent", "online-school-agent", "carousel-agent", "threads-agent", "psychologist-site", "course-site", "small-shop-site", "expert-pro-site", "service-pro-site", "graduate-portfolio"],
  4: ["server-152fz", "fairy-team-agent", "webinar-moderator-agent", "school-pro-site", "catalog-pro-site"],
};
```

Build keywords deterministically from explicit slug sets: setup slugs get `Настройка`; week-one and paired household slugs get `Для себя` and `Семья и быт`; `pressure-diary`, `fitness-tracker`, `habit-agent`, and `family-health-hub` get `Здоровье`; content/carousel/Threads/course/event slugs get `Контент`; every week-three business agent and every site gets `Для клиентов`; week-three through week-six commercial work gets `Для заработка`; site and service kinds get `Сайты и сервисы`; agent kinds get `ИИ-агенты`. Add keyword-level synonym arrays so `Семья и быт` includes `мама`, `ребёнок`, `семья`, `дом`; `Контент` includes `рилс`, `пост`, `карусель`, `threads`; `Для клиентов` includes `клиент`, `заказчик`, `заявка`; `Сайты и сервисы` includes `сайт`, `лендинг`, `приложение`; `ИИ-агенты` includes `бот`, `помощник`, `агент`.

Implement bundle aggregation and stable filtering:

```ts
export function filterAndSortProjects(items: CatalogProject[], filters: DiscoveryFilters): CatalogProject[] {
  return items
    .map((project, index) => ({ project, index, profile: getCatalogDiscoveryProfile(project) }))
    .filter(({ project, profile }) => matchesWeek(project, filters.week) && matchesDifficulty(profile, filters.difficulty) && matchesGoal(profile, filters.goal) && matchesQuery(project, profile, filters.query))
    .sort((a, b) => a.profile.firstWeek - b.profile.firstWeek || a.profile.minDifficulty - b.profile.minDifficulty || a.index - b.index)
    .map(({ project }) => project);
}
```

- [ ] **Step 4: Run focused tests**

Run: `npm run test:unit -- app/content/discovery.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the content model**

```bash
git add app/content/discovery.ts app/content/discovery.test.ts
git commit -m "feat: rank quests by difficulty and goals"
```

### Task 2: Desktop catalogue controls and cards

**Files:**
- Modify: `app/components/Academy.tsx`
- Modify: `app/components/ProjectCard.tsx`
- Modify: `app/components/App.test.tsx`

**Interfaces:**
- Consumes: `difficultyLabels`, `goalKeywords`, `getCatalogDiscoveryProfile`, `filterAndSortProjects`.
- Produces: accessible week, difficulty, goal, search, and reset controls; visible difficulty and keyword chips.

- [ ] **Step 1: Add failing interface tests**

```tsx
it("filters desktop projects by difficulty and goal", () => {
  render(<Academy />);
  fireEvent.click(screen.getByRole("button", { name: "Стартовый" }));
  fireEvent.click(screen.getByRole("button", { name: "Семья и быт" }));
  const catalogue = screen.getByRole("region", { name: /каталог проектов/i });
  expect(within(catalogue).getByText("Семейный бюджет")).toBeInTheDocument();
  expect(within(catalogue).queryByText("Покупаем сервер по 152-ФЗ")).not.toBeInTheDocument();
});

it("shows difficulty and keywords on a card", () => {
  render(<ProjectCard project={getQuestProject("install-codex")!} />);
  expect(screen.getByText("Стартовый")).toBeInTheDocument();
  expect(screen.getByText("Настройка")).toBeInTheDocument();
});
```

- [ ] **Step 2: Confirm the tests fail**

Run: `npm run test:unit -- app/components/App.test.tsx`

Expected: FAIL because the controls and chips do not exist.

- [ ] **Step 3: Replace the local filter implementation**

Add `difficulty` and `goal` state, use `filterAndSortProjects`, display `Найдено: N`, and add a reset button that sets week, difficulty, goal, and query to their defaults.

```tsx
const [difficulty, setDifficulty] = useState<DifficultyFilter>(0);
const [goal, setGoal] = useState<GoalFilter>("Все цели");
const visible = useMemo(() => filterAndSortProjects(projects, { week, difficulty, goal, query }), [week, difficulty, goal, query]);
```

- [ ] **Step 4: Render card metadata**

Resolve the catalogue profile once and show the range plus the first three keywords:

```tsx
const discovery = getCatalogDiscoveryProfile(project);
<span className={`difficulty-badge difficulty-${discovery.minDifficulty}`}>{formatDifficulty(discovery)}</span>
<div className="project-keywords">{discovery.keywords.slice(0, 3).map((keyword) => <span key={keyword}>{keyword}</span>)}</div>
```

- [ ] **Step 5: Run desktop tests**

Run: `npm run test:unit -- app/components/App.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit desktop discovery UI**

```bash
git add app/components/Academy.tsx app/components/ProjectCard.tsx app/components/App.test.tsx
git commit -m "feat: add desktop quest discovery filters"
```

### Task 3: Mobile catalogue controls and cards

**Files:**
- Modify: `app/components/MobileAcademy.tsx`
- Modify: `app/components/App.test.tsx`

**Interfaces:**
- Consumes: the same discovery selectors as desktop.
- Produces: horizontally scrollable accessible filters and compact card metadata.

- [ ] **Step 1: Add a failing mobile filter test**

```tsx
it("filters the mobile catalogue with the shared discovery model", () => {
  render(<MobileAcademy onOpen={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Продвинутый" }));
  expect(screen.getByText("Покупаем сервер по 152-ФЗ")).toBeInTheDocument();
  expect(screen.queryByText("Устанавливаем Codex")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Confirm the test fails**

Run: `npm run test:unit -- app/components/App.test.tsx`

Expected: FAIL because mobile has no difficulty control.

- [ ] **Step 3: Implement shared filtering and compact metadata**

Use the same state values and `filterAndSortProjects` call as desktop. Render difficulty and three keywords before the card footer. When no cards match, render the same reset action as desktop.

- [ ] **Step 4: Run the interface suite**

Run: `npm run test:unit -- app/components/App.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit mobile discovery UI**

```bash
git add app/components/MobileAcademy.tsx app/components/App.test.tsx
git commit -m "feat: add mobile quest discovery filters"
```

### Task 4: Discovery styling and visual QA

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: CSS classes from Tasks 2 and 3.
- Produces: consistent four-level palette, readable chips, horizontal mobile overflow.

- [ ] **Step 1: Add styles**

Use green for level 1, gold for level 2, coral for level 3, and dark plum for level 4. Keep text contrast AA, use `overflow-x: auto` on mobile filter rows, and ensure selected filters have both color and border changes.

- [ ] **Step 2: Run lint, unit tests, and build**

Run: `npm run lint`

Expected: PASS.

Run: `npm run test:unit`

Expected: all tests PASS.

Run: `npm run build`

Expected: build completes with no errors.

- [ ] **Step 3: Capture and inspect wide and mobile catalogues**

Open `/` at 1200×800 and `/?format=mobile` at 390×844. Verify week order, difficulty order, chip wrapping, empty state, and reset behavior.

- [ ] **Step 4: Commit styling**

```bash
git add app/globals.css
git commit -m "style: polish quest discovery controls"
```
