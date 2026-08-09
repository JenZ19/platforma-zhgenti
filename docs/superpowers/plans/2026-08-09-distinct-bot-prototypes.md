# Distinct Bot Prototypes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the shared generic bot mockup with 13 recognizably different final-product prototypes and publish the refreshed catalogue.

**Architecture:** Keep `ProjectPreview` pointed at the existing `step-14.png` files. Add a strict bot-prototype registry keyed by project slug, render a dedicated interface composition for every bot inside `ExpectedScene`, and recapture only bot steps 5–14 so both catalogues and quest examples update without changing routes.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Testing Library, Playwright capture scripts, Sites hosting.

## Global Constraints

- Every one of the 13 `bot` projects must have an explicit prototype entry; missing mappings must fail loudly.
- Each final prototype must make its main function understandable at thumbnail size and include a unique function marker.
- Screens remain local, privacy-safe, network-independent PNG files at exactly 1200 × 800.
- Reuse the existing SUBMARINE palette and typography while giving each bot a distinct composition and accent.
- `ProjectPreview` and the public card URL contract remain unchanged.

---

### Task 1: Strict prototype registry

**Files:**
- Create: `app/content/bot-prototypes.ts`
- Create: `app/content/bot-prototypes.test.ts`

**Interfaces:**
- Consumes: `ProjectDefinition` objects from `app/content/projects.ts`.
- Produces: `botPrototypeSlugs`, `BotPrototypeSpec`, and `getBotPrototypeSpec(slug)`.

- [ ] **Step 1: Write the failing registry tests**

Test that all 13 bot slugs have mappings, markers are unique, and unknown slugs throw an actionable error.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run test:unit -- app/content/bot-prototypes.test.ts`

Expected: FAIL because `bot-prototypes.ts` does not exist.

- [ ] **Step 3: Add the minimal typed registry**

Define one explicit spec for each slug with theme, marker, eyebrow, headline, metric, and status copy. Do not provide a generic fallback.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm run test:unit -- app/content/bot-prototypes.test.ts`

Expected: PASS.

### Task 2: Thirteen interface compositions

**Files:**
- Create: `app/components/BotPrototypeScene.tsx`
- Modify: `app/components/ExpectedScene.tsx`
- Modify: `app/components/App.test.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `project: ProjectDefinition`, `step: number`, and the strict registry.
- Produces: `BotPrototypeScene({ project, step })` with a slug-specific `data-prototype-marker`.

- [ ] **Step 1: Write the failing component test**

Render every bot at step 14 and assert its unique marker and meaningful visible content. Assert catalogue previews still use `/screens/<slug>/step-14.png`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run test:unit -- app/components/App.test.tsx`

Expected: FAIL because the dedicated scenes and markers do not exist.

- [ ] **Step 3: Build the dedicated prototypes**

Implement distinct planner, ideas, expenses, recipes, habits, family timeline, lead funnel, booking calendar, questionnaire, quiz, materials library, FAQ centre, and consultant route layouts. Reveal secondary details progressively from steps 5–14.

- [ ] **Step 4: Wire `ExpectedScene` to the new component**

Remove the generic `BotScene` and render `BotPrototypeScene` for `project.kind === "bot"`.

- [ ] **Step 5: Add responsive and thumbnail-safe styling**

Add shared frame styles plus 13 theme/layout blocks, large readable metrics, bounded text, and no horizontal overflow.

- [ ] **Step 6: Run component and full unit tests**

Run: `npm run test:unit`

Expected: 0 failed tests.

### Task 3: Refresh static prototypes and validate

**Files:**
- Regenerate: `public/screens/<bot-slug>/step-05.png` through `step-14.png` for 13 bot slugs.

**Interfaces:**
- Consumes: existing `scripts/capture-steps.mjs` filters.
- Produces: 130 refreshed PNG files used by desktop and mobile catalogues.

- [ ] **Step 1: Start the existing development server**

Run: `npm run dev` and use the printed local URL.

- [ ] **Step 2: Capture only bot steps 5–14**

Run with `FORCE_SCREENS=1`, the 13 comma-separated bot slugs, and steps `5,6,7,8,9,10,11,12,13,14`.

Expected: `Готово 130/130 экранов`.

- [ ] **Step 3: Verify all screenshots**

Run: `npm run verify:screens`.

Expected: all 1902 PNG files are present and 1200 × 800.

- [ ] **Step 4: Run lint and production build**

Run: `npm run lint && npm run build`.

Expected: both commands exit 0.

- [ ] **Step 5: Inspect the catalogue in the browser**

Open week 2 on desktop and mobile, confirm all 13 thumbnails differ and correspond to their project names, and confirm cards still open the correct quests.

### Task 4: Publish the validated version

**Files:**
- Preserve: `.openai/hosting.json`

**Interfaces:**
- Consumes: validated `dist/` output and the existing Sites project.
- Produces: a new deployment at the existing Feya Quest Academy URL.

- [ ] **Step 1: Commit the exact validated source and screenshots**

Commit the registry, component, tests, styles, and 130 PNG files together as the reviewed feature.

- [ ] **Step 2: Package and save one Sites version**

Use the existing `project_id`; do not create a new site.

- [ ] **Step 3: Deploy and poll to completion**

Publish to the existing access level, wait for a successful deployment, then open the returned public URL.

