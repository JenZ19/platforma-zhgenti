# Variable Complete Quest Journeys Implementation Plan

> **For agentic workers:** Execute inline in this existing dirty checkout. Preserve every pre-existing change and do not commit or reset user work. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give all 49 concrete desktop and mobile quests a complete beginner route whose level count follows the project rather than a universal 17-step template.

**Architecture:** Add a per-project journey passport and a finalization layer that removes only proven repetition, inserts project-specific verification levels, renumbers safely, explains first-use terms, and labels visual evidence. Build mobile routes from the finalized desktop sequence so both modes stay aligned.

**Tech Stack:** TypeScript, React 19, Vitest, Node test runner, Playwright screenshot capture, Vinext.

## Global Constraints

- Preserve all current uncommitted work.
- Keep the programme, 49 routes, personal/client outputs, and project outcomes.
- Use 18 px desktop body copy and at least 17 px at 390 px.
- Use real/prototype/placeholder labels honestly.
- Codex performs safe technical work; learners do not create code or service files manually.
- Never force all quests to the same level count.

---

### Task 1: Lock the variable-route contract with failing tests

**Files:**
- Create: `app/content/journey-plans.test.ts`
- Modify: `app/content/quests.test.ts`
- Modify: `app/content/mobile.test.ts`
- Modify: `scripts/projects.test.mjs`
- Modify: `app/components/App.test.tsx`

- [ ] Add tests covering every concrete slug, several distinct route lengths, final outcome, sequential ids, desktop/mobile parity, honest visual kind, first-use explanations, and named next-step navigation.
- [ ] Run the focused tests and confirm they fail because journey passports, prototype labels, term notes, and variable counts do not exist yet.

### Task 2: Build journey passports and finalize every desktop route

**Files:**
- Create: `app/content/journey-plans.ts`
- Create: `app/content/beginner-language.ts`
- Modify: `app/content/types.ts`
- Modify: `app/content/quests.ts`
- Modify: `app/content/builders/shared.ts`
- Modify: `app/content/builders/agent.ts`
- Modify: `app/content/original-quests/shared.ts`
- Modify: `app/content/setup-quests.ts`

- [ ] Add an explicit passport for all 49 concrete slug values, with project-specific checks and computed level counts.
- [ ] Remove the duplicated «создать проект / подтвердить проект» split only from shared generic routes.
- [ ] Insert project-specific checks before final audit/publication and renumber ids, rewards, screenshots, help text, and guide references safely.
- [ ] Merge the four mutually exclusive API-provider levels into one complete provider-choice level without losing provider links or safety guidance.
- [ ] Add first-use term definitions and default all generated teaching visuals to `prototype` while preserving `real` and `placeholder`.
- [ ] Run focused content tests until green.

### Task 3: Derive mobile routes from the same complete path

**Files:**
- Modify: `app/content/mobile.ts`
- Modify: `app/content/original-quests/mobile.ts`
- Modify: `app/components/MobileExpectedScene.tsx`

- [ ] Build setup, original, agent, service, site, and portfolio mobile routes from finalized desktop steps.
- [ ] Keep phone-specific actions and tools while using the same ids, project checks, term explanations, and final outcome.
- [ ] Add a mobile prototype for project-specific verification levels.
- [ ] Run mobile route tests until green.

### Task 4: Render the full beginner level contract consistently

**Files:**
- Modify: `app/components/Quest.tsx`
- Modify: `app/components/MobileQuest.tsx`
- Modify: `app/components/ExpectedScene.tsx`
- Create: `app/components/JourneyCheckPrototypeScene.tsx`
- Modify: `app/globals.css`

- [ ] Render first-use definitions before the learner meets the term in the action.
- [ ] Show `прототип` alongside existing real-screen and placeholder badges.
- [ ] Render added project checks with a concrete visual prototype and three visible success conditions.
- [ ] Name the actual next level on desktop and mobile buttons.
- [ ] Keep action text at 18 px desktop and 17 px mobile, support text at 16 px, and tap targets at least 44 px.
- [ ] Run component and typography tests until green.

### Task 5: Make capture and verification counts data-driven

**Files:**
- Modify: `scripts/projects.mjs`
- Modify: `scripts/verify-screens.mjs`
- Modify: `scripts/capture-steps.mjs`
- Modify: `scripts/capture-mobile-steps.mjs`
- Modify: `app/components/SetupQuestPrototypeScene.tsx`

- [ ] Read per-project counts from the journey manifest instead of returning 17 for every non-server route.
- [ ] Update API prototype stages for the compact 14-level route.
- [ ] Capture every new or moved desktop and mobile prototype and verify 1200 × 800 assets.

### Task 6: Audit every route and complete visual and build verification

**Files:**
- Modify if needed: route content, tests, capture scenes, and CSS found by the audit.

- [ ] Generate an audit table for all 49 routes: outcome, count, first level, final level, required project checks, duplicate-title status, desktop/mobile parity.
- [ ] Run desktop and 390 px browser smoke checks across representative setup, service, agent, simple-site, advanced-site, and portfolio routes.
- [ ] Run `npm run verify:screens`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run test:scripts`.
- [ ] Run `npm run test:unit`.
- [ ] Run `npm run build`.
- [ ] Review the final diff for accidental loss of pre-existing work and remaining hard-coded universal 17-step assumptions.
