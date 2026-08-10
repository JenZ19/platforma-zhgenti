# Quest Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a visible, safe “Сбросить проект и начать с нуля” action available in every desktop and mobile quest.

**Architecture:** Keep storage isolation in the existing `Quest` and `MobileQuest` components. Add one shared presentational reset button, place it directly below each progress bar, and reuse the existing reset helpers for progress, preparation, and customization.

**Tech Stack:** React, TypeScript, localStorage, Vitest, Testing Library, CSS, Vinext, Sites.

## Global Constraints

- The action must affect only the current project and current format.
- Desktop and mobile progress for the same project remain independent.
- The action must be visible before choosing a data mode and during all 17 levels.
- Cancellation preserves all data.
- Confirmation removes progress, data-mode preparation, customization, and temporary UI state.
- The learner returns to the data-mode choice for the same project.
- No new dependency is allowed.

---

### Task 1: Add regression coverage for desktop and mobile reset

**Files:**
- Modify: `app/components/App.test.tsx`

**Interfaces:**
- Consumes: `progressKey(slug)`, `preparationKey(slug)`, `customizationKey(slug)`, `Quest`, and `MobileQuest`.
- Produces: regression tests for visible reset, cancellation, current-project isolation, and desktop/mobile isolation.

- [ ] **Step 1: Write the failing desktop test**

Add a test that seeds `planner` progress, preparation, and customization plus neighboring `recipe-book` progress. Render `Quest`, assert the reset action is visible, cancel once and verify all keys remain, then confirm and verify only the three `planner` keys are removed while `recipe-book` remains. Assert the data-mode heading is visible again.

- [ ] **Step 2: Write the failing mobile test**

Seed `mobile:planner` and desktop `planner`. Render `MobileQuest`, confirm reset, and verify only the `mobile:planner` keys are removed. Assert the mobile data-mode choice is visible again.

- [ ] **Step 3: Verify RED**

Run: `npm run test:unit -- app/components/App.test.tsx`

Expected: FAIL because the top-level button named `Сбросить проект и начать с нуля` does not exist before project setup.

---

### Task 2: Implement one visible reset control in both quest formats

**Files:**
- Create: `app/components/QuestResetButton.tsx`
- Modify: `app/components/Quest.tsx`
- Modify: `app/components/MobileQuest.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `onReset: () => void` and optional `mobile: boolean`.
- Produces: `QuestResetButton`, an always-visible button with accessible text `Сбросить проект и начать с нуля`.

- [ ] **Step 1: Add the shared button**

Create a semantic `<button type="button">` with the main text `Сбросить проект и начать с нуля` and the explanation `Удалятся только прогресс и настройки этого проекта`.

- [ ] **Step 2: Place it under both progress bars**

Render the shared button immediately after `.quest-progress` in `Quest` and after `.mobile-progress` in `MobileQuest`. Remove the old reset links at the bottom so each page has one unambiguous reset action.

- [ ] **Step 3: Make confirmation explicit and reset all current UI state**

Use the confirmation text: `Сбросить проект «…» и начать с нуля? Будут удалены прогресс, ответы и оформление только этого проекта. Остальные проекты сохранятся.` Keep the existing scoped storage keys. Also close help, enlarged screenshots, rewards, and copied states after confirmation.

- [ ] **Step 4: Style for desktop and phone**

Add a calm outlined pill/card below the progress bar, with a circular reset symbol, clear focus styling, at least 44 px touch height on phone, and no competition with the primary level action.

- [ ] **Step 5: Verify GREEN**

Run: `npm run test:unit -- app/components/App.test.tsx`

Expected: the new reset tests and all component tests PASS.

---

### Task 3: Validate and publish

**Files:**
- No source additions beyond Tasks 1–2.

**Interfaces:**
- Consumes: validated current Git commit and existing Sites project configuration.
- Produces: a deployed production version.

- [ ] **Step 1: Run full validation**

Run `npm run test:unit`, `npm run lint`, `npm run build`, `npm run verify:screens`, and `git diff --check`. Every command must exit 0.

- [ ] **Step 2: Commit exact source**

Commit tests, component, quest wiring, and styles as `feat: add visible quest reset`.

- [ ] **Step 3: Publish through the existing Sites project**

Push the exact commit, save one Sites version, deploy it, and poll until the deployment reports `succeeded`.

- [ ] **Step 4: Open the production URL**

Open `https://feya-quest-academy.submarine-edu.chatgpt.site/` in Codex for handoff.
