# Quest Data Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить перед каждым квестом отдельный выбор учебных или реальных данных с персональным чек-листом подготовки.

**Architecture:** Новый модуль подготовки хранит режим и отметки отдельно по slug. Чистый генератор создаёт чек-лист из метаданных проекта, а адаптер команд переключает 17 уровней между демонстрационным и реальным режимом. Компонент входа показывается внутри `Quest` до карты уровней.

**Tech Stack:** React 19, TypeScript, localStorage, Vitest, Testing Library, Vinext.

## Global Constraints

- Выбор сохраняется отдельно для каждого квеста.
- Реальный режим не открывает уровни до полного чек-листа.
- Сброс одного квеста не влияет на другие.
- Реальные данные не означают публикацию секретов или частных материалов.
- Существующие 52 проекта, 17 уровней и 884 изображения сохраняются.

---

### Task 1: Модель подготовки и персональные чек-листы

**Files:**
- Create: `app/lib/preparation.ts`
- Create: `app/lib/preparation.test.ts`

**Interfaces:**
- Produces: `DataMode`, `QuestPreparation`, `buildRealDataChecklist(project)`, `loadPreparation`, `savePreparation`, `resetPreparation`.

- [ ] **Step 1: Write failing tests** for isolated keys, safe parsing, six-or-more project-specific checklist items, and demo/real readiness.
- [ ] **Step 2: Run** `npm run test:unit -- app/lib/preparation.test.ts` and confirm failures because the module is missing.
- [ ] **Step 3: Implement** the typed storage helpers and kind-specific checklist builder. Include project entities, functions, `project.safety`, copies-only guidance, and forbidden secrets.
- [ ] **Step 4: Run the focused test** and confirm all preparation tests pass.
- [ ] **Step 5: Commit** `feat: add per-quest data preparation`.

### Task 2: Mode-aware commands and entry screen

**Files:**
- Create: `app/components/QuestPreparation.tsx`
- Modify: `app/components/Quest.tsx`
- Modify: `app/content/quests.ts`
- Create: `app/content/data-mode.ts`
- Modify: `app/components/App.test.tsx`
- Modify: `app/content/quests.test.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: preparation storage and `buildRealDataChecklist(project)`.
- Produces: `adaptQuestToDataMode(steps, project, mode)` and the gated start flow.

- [ ] **Step 1: Write failing UI tests** proving the choice appears, demo starts immediately, real mode shows a checklist, and the start button stays disabled until every item is checked.
- [ ] **Step 2: Write failing content tests** proving real-mode prompts reference the prepared folder and do not require fictional examples.
- [ ] **Step 3: Run focused tests** and confirm failures for the missing flow.
- [ ] **Step 4: Implement the adapter and preparation component**, then connect them to `Quest`; reset clears both keys.
- [ ] **Step 5: Add responsive SUBMARINE styles** without changing existing quest layouts.
- [ ] **Step 6: Run focused and full unit tests** and confirm green.
- [ ] **Step 7: Commit** `feat: gate every quest by its data mode`.

### Task 3: Validation and private republish

**Files:**
- Modify only generated build artifacts during validation; no screenshot regeneration is required.

- [ ] **Step 1: Run** `npm test`, `npm run lint`, and `npm run verify:screens`.
- [ ] **Step 2: Start the production build** and test both paths in the browser, including a 390×844 viewport and isolated choices for two different quests.
- [ ] **Step 3: Commit any final verified correction** if required.
- [ ] **Step 4: Push the exact HEAD, save a new Sites version, and deploy privately** to the existing project ID.
