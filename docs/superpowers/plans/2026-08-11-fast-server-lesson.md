# Fast Server Lesson Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сократить квест покупки сервера до восьми полезных уровней и убрать из него повторяющиеся служебные скриншоты.

**Architecture:** Длина квеста берётся из готового массива шагов, а общая статистика — из отдельной таблицы исключений с базовым значением 17. Для серверного квеста данные явно отключают подробную галерею и показывают итоговый прототип только на конкретных шагах интерфейса.

**Tech Stack:** Next.js, React, TypeScript, Vitest, Playwright capture scripts.

## Global Constraints

- Остальные квесты и их прогресс не меняются.
- Полная PDF-инструкция AdminVPS и промокод SUBMARINE123 остаются доступны.
- Сервер не называется достаточным условием соответствия 152-ФЗ.
- Секреты, пароль и приватный SSH-ключ не вводятся в Академию.

---

### Task 1: Зафиксировать короткий контракт урока

**Files:**
- Modify: `app/content/setup-quests.test.ts`
- Modify: `app/components/App.test.tsx`
- Modify: `app/lib/progress.test.ts`

**Interfaces:**
- Consumes: `buildQuest`, `Quest`, `getAcademyStats`
- Produces: проверяемый контракт из 8 уровней, нуля галерей и фактической длины прогресса

- [ ] **Step 1: Write the failing tests**

Добавить проверки: серверный квест имеет 8 уровней; у всех `guide` отсутствует; скриншот результата виден только на четырёх конкретных шагах; прогресс заканчивается на восьмом шаге; общая статистика считает 705 уровней.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run app/content/setup-quests.test.ts app/components/App.test.tsx app/lib/progress.test.ts`

Expected: FAIL на старых 17 уровнях и трёхкадровых галереях.

### Task 2: Сделать длину квеста переменной

**Files:**
- Modify: `app/lib/progress.ts`
- Modify: `app/components/Quest.tsx`
- Modify: `app/components/MobileQuest.tsx`
- Modify: `app/components/ProjectCard.tsx`
- Modify: `app/components/Academy.tsx`
- Modify: `app/components/MobileAcademy.tsx`

**Interfaces:**
- Produces: `getProjectLevelCount(project)`, параметры `totalLevels` для загрузки и завершения прогресса

- [ ] **Step 1: Implement the minimal variable-length progress API**

Сохранить `LEVELS_PER_QUEST = 17` как стандарт, вернуть 8 для `server-152fz`, передать фактическую длину в компоненты и функции прогресса.

- [ ] **Step 2: Run targeted tests**

Run: `npm test -- --run app/lib/progress.test.ts app/components/App.test.tsx`

Expected: PASS.

### Task 3: Переписать серверный квест

**Files:**
- Modify: `app/content/types.ts`
- Modify: `app/content/setup-quests.ts`
- Modify: `app/content/setup-server-adminvps.ts`

**Interfaces:**
- Produces: `SetupStepInput.showGuide`, `SetupStepInput.showScreenshot`, `QuestStep.showScreenshot`

- [ ] **Step 1: Replace 17 verbose steps with 8 outcome steps**

Объединить юридическое введение, покупку, доступ, защиту и финальную проверку; оставить все обязательные ссылки и PDF.

- [ ] **Step 2: Disable generated guide frames for server steps**

`makeStep` создаёт `guide` только при `showGuide !== false`; `Quest` и `MobileQuest` показывают прототип только при `showScreenshot !== false`.

- [ ] **Step 3: Run content and interface tests**

Run: `npm test -- --run app/content/setup-quests.test.ts app/components/App.test.tsx`

Expected: PASS.

### Task 4: Обновить захват экранов и проверить результат

**Files:**
- Modify: `scripts/projects.mjs`
- Modify: `scripts/capture-steps.mjs`
- Modify: `scripts/capture-mobile-steps.mjs`
- Modify: `scripts/capture-original-guides.mjs`
- Modify: `scripts/verify-screens.mjs`
- Modify: `scripts/projects.test.mjs`

**Interfaces:**
- Produces: `projectStepCount(slug)` для захвата 8 серверных и 17 остальных уровней

- [ ] **Step 1: Make capture scripts use per-project step counts**

Убрать `server-152fz` из списка подробных трёхкадровых галерей и пересчитать ожидаемые PNG.

- [ ] **Step 2: Regenerate only eight server desktop and mobile screens**

Run: `QUEST_ORIGIN=http://localhost:55230 CAPTURE_SLUGS=server-152fz FORCE_SCREENS=1 npm run capture:screens`

Run: `QUEST_ORIGIN=http://localhost:55230 CAPTURE_SLUGS=server-152fz FORCE_SCREENS=1 npm run capture:mobile-screens`

- [ ] **Step 3: Run full verification**

Run: `npm test -- --run`

Run: `npm run lint`

Run: `npm run build`

Run: `npm run verify:screens`

Expected: все команды завершаются с кодом 0; серверный урок показывает 8 уровней без блока «Делайте по картинкам».
