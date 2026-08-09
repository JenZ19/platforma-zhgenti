# Home Helper Click-by-Click Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the desktop `home-helper` quest into the first complete click-by-click beginner guide with a teaching screenshot for every physical action.

**Architecture:** Extend `QuestStep` with an optional `guide` array and keep existing quest builders compatible. Build a dedicated, mode-aware `home-helper` guide on top of the shared 17-step quest, render microsteps inside `Quest`, and capture safe annotated UI scenes through a dedicated route.

**Tech Stack:** React 19, TypeScript, vinext, Vitest, Testing Library, CSS, Playwright screenshot capture, Sites hosting.

## Global Constraints

- One physical action equals one guide frame.
- `home-helper` keeps exactly 17 top-level levels.
- Every level has at least three guide frames.
- Every frame has an application, action, exact expected result, fallback, and screenshot.
- Real mode contains no `вымышлен` or `демонстрацион` wording in any guide field.
- The guide creates and opens `home-helper` before asking the learner to use it.
- The questionnaire sequence shows copy, Codex input, paste, send, and result as separate frames.
- Existing 51 quests and the mobile academy remain compatible.

---

### Task 1: Guide content model and mode-aware home-helper content

**Files:**
- Modify: `app/content/types.ts`
- Create: `app/content/home-helper-guide.ts`
- Modify: `app/content/quests.ts`
- Modify: `app/content/quests.test.ts`

**Interfaces:**
- Produces `QuestGuideFrame` and `buildHomeHelperGuide(project, mode, baseSteps)`.
- `buildQuest(getProject("home-helper"), mode)` returns 17 levels with `guide.length >= 3`.

- [ ] Add failing tests for the guide count, sequential frame IDs, required fields, creation-before-open order, questionnaire copy/paste/send order, and real-mode wording.
- [ ] Run `npm run test:unit -- app/content/quests.test.ts` and observe failures caused by missing `guide`.
- [ ] Add the type and dedicated builder with explicit real/demo branches.
- [ ] Run the focused test and observe green.
- [ ] Commit with `feat: add beginner home helper guide`.

### Task 2: Microstep walkthrough interface

**Files:**
- Create: `app/components/QuestGuide.tsx`
- Modify: `app/components/Quest.tsx`
- Modify: `app/components/App.test.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- `QuestGuide` receives `frames: QuestGuideFrame[]` and renders a numbered vertical walkthrough.

- [ ] Add a failing component test that `home-helper` real mode renders «Делайте по картинкам», the Codex project-opening frame, the questionnaire copy frame, and one «Готово, если» per frame.
- [ ] Run the focused component test and observe red.
- [ ] Build the semantic walkthrough with large screenshot cards, copy buttons for exact text, clear checks, and fallback boxes.
- [ ] Add responsive styles and keyboard-accessible image enlargement.
- [ ] Run the focused tests and observe green.
- [ ] Commit with `feat: show click by click quest frames`.

### Task 3: Annotated teaching scenes and screenshot capture

**Files:**
- Create: `app/components/HomeHelperGuideScene.tsx`
- Modify: `app/components/AppEntry.tsx`
- Create: `scripts/capture-home-helper-guide.mjs`
- Modify: `scripts/verify-screens.mjs`
- Modify: `package.json`
- Generate: `public/guides/home-helper/<mode>/step-NN-frame-NN.png`

**Interfaces:**
- Route `?capture-guide=home-helper--<mode>--step-NN--frame-NN` renders one annotated safe interface scene.

- [ ] Extend verification first and observe missing-image failures.
- [ ] Render safe Finder, Codex, browser, preview, and portfolio scenes with one arrow target per image.
- [ ] Capture every referenced frame at 1200×800.
- [ ] Run screenshot verification and observe green.
- [ ] Commit with `feat: add home helper teaching screenshots`.

### Task 4: QA and private publication

**Files:**
- Modify only files needed for defects found during QA.

- [ ] Run `npm test && npm run lint && npm run verify:screens`.
- [ ] Browser-test `?quest=home-helper` in real mode: create/open sequence, questionnaire sequence, screenshot enlargement, and progress to the next level.
- [ ] Confirm production contains the guide and no console errors.
- [ ] Save and deploy a new private Sites version.
- [ ] Keep the feature branch and published source state intact.
