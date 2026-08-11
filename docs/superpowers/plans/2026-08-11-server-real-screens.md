# Server Real Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace synthetic AdminVPS examples with authentic screens or one explicit placeholder and explain server and SSH key terminology in plain Russian.

**Architecture:** Setup quest steps receive an optional screenshot provenance flag. The existing quest shells render a truthful badge and contain-fit image for real or placeholder assets, while the server lesson data selects which levels show images.

**Tech Stack:** React 19, TypeScript, Vitest, CSS, Poppler, browser screenshots

## Global Constraints

- Never present a generated AdminVPS-like interface as a real screen.
- Use only the public AdminVPS page and user-provided materials as screenshot sources.
- Do not expose passwords, card data, SMS codes, private SSH keys, or new personal information.
- Preserve levels 1 and 8 without screenshots.
- Keep desktop and mobile lesson behavior aligned.

---

### Task 1: Add provenance and content regression tests

**Files:**
- Modify: `app/content/setup-quests.test.ts`
- Modify: `app/components/App.test.tsx`

**Interfaces:**
- Consumes: `buildQuest(getQuestProject("server-152fz"))`.
- Produces: assertions for real levels 2–6, placeholder level 7, hidden levels 1 and 8, and plain-language definitions.

- [ ] Write failing tests that expect `screenshotKind`, real asset paths, no screenshot on levels 1/8, and the terms «отдельный компьютер в дата-центре», «публичная часть», «приватная часть».
- [ ] Run focused tests and confirm they fail before implementation.

### Task 2: Prepare authentic assets

**Files:**
- Create: `public/screens/server-152fz/real-step-02.png`
- Create: `public/screens/server-152fz/real-step-03.jpg`
- Create: `public/screens/server-152fz/real-step-04.png`
- Create: `public/screens/server-152fz/real-step-05.png`
- Create: `public/screens/server-152fz/real-step-06.png`
- Create: `public/screens/server-152fz/placeholder-step-07.svg`

**Interfaces:**
- Consumes: public AdminVPS page, supplied promo screenshot, supplied six-page PDF.
- Produces: five authentic screen assets and one explicitly labelled placeholder.

- [ ] Capture the live Russia/tariff block without clicking «Заказать».
- [ ] Copy the supplied applied-promo screenshot without changing its content.
- [ ] Crop the checkout, server-card and SSH-key screens from the rendered PDF pages.
- [ ] Create a neutral SVG placeholder for the missing backup screen.
- [ ] Visually inspect every final asset for readability and accidental clipping.

### Task 3: Connect assets and terminology

**Files:**
- Modify: `app/content/types.ts`
- Modify: `app/content/setup-quests.ts`
- Modify: `app/content/setup-server-adminvps.ts`
- Modify: `app/components/Quest.tsx`
- Modify: `app/components/MobileQuest.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `screenshotKind?: "real" | "placeholder"` and `screenshot?: string` from setup input.
- Produces: truthful image badge, contain-fit display, real assets on levels 2–6, placeholder on level 7, definitions on levels 1 and 6.

- [ ] Extend types and the setup quest builder with explicit screenshot path and provenance.
- [ ] Update the server step data with the approved asset map and plain-language definitions.
- [ ] Render «реальный экран» or «заглушка для замены» on desktop and mobile.
- [ ] Keep screenshots hidden on levels 1 and 8.
- [ ] Run focused tests and confirm they pass.

### Task 4: Verify all eight levels

**Files:**
- Verify only.

**Interfaces:**
- Consumes: completed server quest.
- Produces: automated and visual verification evidence.

- [ ] Run `npm run lint`.
- [ ] Run `npm test` and confirm all tests and production build pass.
- [ ] Open every desktop and mobile server level, confirm image provenance, definitions, image fit, and zero horizontal overflow.
