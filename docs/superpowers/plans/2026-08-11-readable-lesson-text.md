# Readable Lesson Text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace lesson text walls with readable paragraphs, semantic lists, bold transitions, and an italic result callout across desktop and mobile quests.

**Architecture:** A focused `LessonText` component parses trusted plain strings into typed presentation blocks and renders React nodes without HTML injection. Desktop and mobile quest shells reuse the component for action, reason, and help text; shared CSS supplies responsive typography.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, CSS

## Global Constraints

- Do not rewrite or shorten stored course content.
- Never render course strings through `dangerouslySetInnerHTML`.
- Apply the formatter to every quest on desktop and mobile.
- Preserve prompt formatting inside existing prompt cards.

---

### Task 1: Lock the readable-format contract in tests

**Files:**
- Modify: `app/components/App.test.tsx`

**Interfaces:**
- Consumes: `Quest`, `MobileQuest`, `progressKey`, the `server-152fz` level data.
- Produces: regression coverage for `[data-lesson-copy="action"]`, seven list items, bold `Итог:` and italic result text.

- [ ] **Step 1: Write a failing test**

Seed completed levels 1–7, open level 8 on desktop and mobile, and assert that the action area has paragraphs, seven semantic list items, a strong `Итог:` label, and an italic result.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- --run app/components/App.test.tsx -t "formats long lesson instructions"`

Expected: FAIL because the action is still one `h3` and has no `[data-lesson-copy]` container.

### Task 2: Build and connect the shared formatter

**Files:**
- Create: `app/components/LessonText.tsx`
- Modify: `app/components/Quest.tsx`
- Modify: `app/components/MobileQuest.tsx`
- Modify: `app/globals.css`
- Modify: `app/tactile-album.css`

**Interfaces:**
- Consumes: `text: string`, `variant: "action" | "support"`.
- Produces: `LessonText`, a semantic React renderer with paragraph, list, transition, and result-callout blocks.

- [ ] **Step 1: Parse plain text into safe blocks**

Split sentence boundaries, recognize semicolon lists after a colon when at least three items exist, and recognize the `Итог:` result label. Keep all other text as paragraphs.

- [ ] **Step 2: Render semantic emphasis**

Render list introductions and transition labels with `<strong>`, list items with `<ul><li>`, and result content with `<em>`.

- [ ] **Step 3: Replace raw text nodes in both quest shells**

Use `LessonText` for `step.action`, `step.why`, and `step.help.body`. Leave `step.prompt` untouched.

- [ ] **Step 4: Add responsive typography**

Use readable sans-serif action copy, 21 px desktop and 17 px phone text, comfortable line-height, vertical spacing, a quiet list marker, and a clearly separated result card.

- [ ] **Step 5: Run the focused test and confirm GREEN**

Run: `npm test -- --run app/components/App.test.tsx -t "formats long lesson instructions"`

Expected: PASS for desktop and mobile.

### Task 3: Verify the platform

**Files:**
- Verify only; no planned source changes.

**Interfaces:**
- Consumes: completed Task 2 UI.
- Produces: proof that formatting works without regressions.

- [ ] **Step 1: Run unit and content tests**

Run: `npm test -- --run`

Expected: all tests pass.

- [ ] **Step 2: Run static checks and production build**

Run: `npm run lint && npm run build`

Expected: both commands exit 0.

- [ ] **Step 3: Inspect desktop and mobile visually**

Open `?quest=server-152fz`, navigate to level 8, verify separate paragraphs, the seven-point list, and the result callout at desktop and phone width, with no overlap or horizontal overflow.
