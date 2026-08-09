# First Four Original Quests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the first four household-service quests into four distinct, beginner-safe learning products with saved personalization, bespoke 17-level copy, a client-remake path, project-specific prototypes, and separate computer/mobile instructions.

**Architecture:** Add a small data-driven customization layer for only the four approved slugs. Each slug gets its own profile and quest builder; `buildQuest` and `buildMobileQuest` accept an optional saved selection. The desktop and mobile quest components load selections from local storage, render a dedicated choice wizard on level 2, and rebuild prompts immediately. Dedicated prototype scenes generate all 17 desktop and mobile reference screens for each project.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, vinext, Playwright capture scripts, Sites hosting.

## Global Constraints

- Keep exactly 17 sequential levels per quest.
- Implement only `family-expenses`, `planner`, `idea-vault`, and `child-schedule`; leave the other 48 quest paths unchanged.
- Keep computer and mobile progress, preparation, and customization in separate storage keys.
- Never mix demo wording into real-data mode.
- Keep financial and child projects inside their existing safety boundaries.
- Every level must explain why, give one concrete action, provide a copy-ready Codex command, show a project-specific result, state three observable completion checks, and include recovery help.
- Levels 15–17 must teach a separate client copy, client adaptation, and portfolio/service handoff.
- No manual coding steps for learners.
- Work in the existing clean `feature/course-quest-academy` branch; verify and commit after each project before moving to the next.

---

### Task 1: Saved personalization foundation

**Files:**
- Create: `app/content/customization.ts`
- Create: `app/lib/customization.ts`
- Create: `app/lib/customization.test.ts`
- Create: `app/components/QuestCustomizer.tsx`
- Modify: `app/content/types.ts`
- Modify: `app/components/Quest.tsx`
- Modify: `app/components/MobileQuest.tsx`
- Modify: `app/components/App.test.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `OriginalQuestSlug`, `QuestCustomization`, `QuestCustomizationProfile`, `getCustomizationProfile(slug)`, `defaultCustomization(slug)`, `customizationSummary(slug, selection)`, `loadCustomization(storageSlug, storage)`, `saveCustomization(storageSlug, selection, storage)`, `resetCustomization(storageSlug, storage)`.
- Produces: `<QuestCustomizer profile selection onChange onSave />` with labeled large-choice controls and a custom-value field.
- Consumes later: desktop and mobile quest builders receive `QuestCustomization` and include it in prompts.

- [ ] **Step 1: Write failing storage and profile tests**

Add tests proving that only the four approved slugs return profiles, defaults contain all six axes, desktop/mobile keys differ, malformed storage falls back safely, and resetting one slug does not remove another.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm run test:unit -- app/lib/customization.test.ts`

Expected: FAIL because the customization modules do not exist.

- [ ] **Step 3: Implement types, four exact profiles, summaries, and storage**

Use six saved values: `audience`, `goal`, `name`, `style`, `tone`, `feature`. Store them under `feya-quest:customization:<storageSlug>`. Reject unknown or blank stored values and merge valid data over the project defaults.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `npm run test:unit -- app/lib/customization.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing component tests**

Add a desktop test that opens `family-expenses`, selects real/demo preparation, reaches level 2, changes the name and feature, saves, reloads, and finds the saved summary. Add the same storage-isolation assertion for `mobile:family-expenses`.

- [ ] **Step 6: Run the component tests and verify RED**

Run: `npm run test:unit -- app/components/App.test.tsx`

Expected: FAIL because the level-2 customizer and saved summary are absent.

- [ ] **Step 7: Implement the accessible customizer and component wiring**

Render the customizer only for the approved four slugs and only on level 2. Use `fieldset`, `legend`, labeled radio buttons, visible focus, one `Свой вариант` text field per group, live summary, and `Сохранить мою версию`. Rebuild steps from the saved selection. Resetting a quest also resets its customization.

- [ ] **Step 8: Run focused and full unit tests**

Run: `npm run test:unit`

Expected: 0 failed tests.

- [ ] **Step 9: Commit the foundation**

Run: `git add app && git commit -m "feat: add saved quest personalization"`

---

### Task 2: Original «Учёт расходов семьи» quest

**Files:**
- Create: `app/content/original-quests/shared.ts`
- Create: `app/content/original-quests/family-expenses.ts`
- Create: `app/content/original-quests/original-quests.test.ts`
- Create: `app/components/OriginalServiceScene.tsx`
- Modify: `app/content/quests.ts`
- Modify: `app/content/mobile.ts`
- Modify: `app/components/ExpectedScene.tsx`
- Modify: `app/components/MobileExpectedScene.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `buildFamilyExpensesQuest(project, mode, customization): QuestStep[]`.
- Produces: `buildOriginalMobileQuest(project, mode, customization): MobileQuestStep[] | undefined` for the first approved slug, later extended for three more.
- Produces: `<OriginalServiceScene slug step mobile={false|true} />`.

- [ ] **Step 1: Write failing content tests**

Assert 17 exact levels, unique titles, family-budget vocabulary on every level, the saved name/style/feature in levels 2, 5, 9, 10, 15–17, separate `family-expenses-client` copy wording, a detailed eight-question client brief, no demo words in real mode, no bank connection/card data, and prompts longer than 220 characters.

- [ ] **Step 2: Run the content tests and verify RED**

Run: `npm run test:unit -- app/content/original-quests/original-quests.test.ts`

Expected: FAIL because the bespoke builder is absent.

- [ ] **Step 3: Implement all 17 family-expense levels**

Use the approved sequence: final example; saved concept; project data; folder/Codex; personalized passport; working base; add expense; own categories; own visual style; one feature; life scenario; edit/persist/export; phone check; publish; separate client copy; eight-answer client adaptation; two-version portfolio/service card. Each action is one learner action and every prompt names the exact expected budget fields.

- [ ] **Step 4: Implement the family-specific mobile wording**

Replace generic mobile titles/actions/prompts for this slug with the same learning transfer. Telegram/server-folder instructions must not ask the learner to open a local phone folder. Levels 15–17 create and adapt a separate client room/project.

- [ ] **Step 5: Run the content tests and verify GREEN**

Run: `npm run test:unit -- app/content/original-quests/original-quests.test.ts app/content/mobile.test.ts app/content/quests.test.ts`

Expected: PASS.

- [ ] **Step 6: Write failing prototype tests**

Add assertions that `family-expenses` uses budget-specific scenes on setup, constructor, form, category, feature, export, client copy, and portfolio steps instead of the generic service scene.

- [ ] **Step 7: Implement 17 desktop/mobile budget prototypes**

Use a teal/powder finance dashboard with budget, spent, remaining, category bars, expense form, editing state, export card, phone audit, two-copy comparison, client approval list, and portfolio card. Preserve the academy’s typography while making the product scene unmistakably financial.

- [ ] **Step 8: Run unit tests, build, and capture this project only**

Run: `npm run test:unit && npm run build`

Run with a healthy local server: `FORCE_SCREENS=1 CAPTURE_SLUGS=family-expenses npm run capture:steps` and `FORCE_SCREENS=1 CAPTURE_SLUGS=family-expenses npm run capture:mobile`.

Expected: 34 new 1200×800 PNG files and no failed command.

- [ ] **Step 9: Inspect representative captures and commit**

Inspect steps 2, 7, 10, 15, 16, and 17 for desktop and mobile. Confirm no clipping, the chosen project logic is visible, and the client copy differs from the personal copy.

Run: `git add app public/screens/family-expenses public/screens-mobile/family-expenses && git commit -m "feat: make family expenses quest original"`

---

### Task 3: Original «Планер» quest

**Files:**
- Create: `app/content/original-quests/planner.ts`
- Modify: `app/content/original-quests/original-quests.test.ts`
- Modify: `app/content/quests.ts`
- Modify: `app/content/mobile.ts`
- Modify: `app/components/OriginalServiceScene.tsx`
- Modify: `app/globals.css`
- Regenerate: `public/screens/planner/*.png`
- Regenerate: `public/screens-mobile/planner/*.png`

**Interfaces:**
- Produces: `buildPlannerQuest(project, mode, customization): QuestStep[]`.

- [ ] **Step 1: Write and run failing planner tests**

Test the 17-level planner vocabulary, saved personalization, today/weekly structure, move/complete/no-duplicate scenario, safe portfolio examples, separate `planner-client` copy, eight-question brief, and real-mode purity.

Run: `npm run test:unit -- app/content/original-quests/original-quests.test.ts`

Expected: FAIL for missing planner builder.

- [ ] **Step 2: Implement and wire the 17 planner levels**

Make every action about planning: calm first screen, one main task, quick add, own zones/priorities/phrasing, selected visual style, one planning feature, reschedule/complete/persist test, mobile thumb test, publish, client copy, client adaptation, and service card.

- [ ] **Step 3: Implement planner-specific desktop/mobile prototypes**

Use an airy lavender/sticky-note system with `Главное сегодня`, quick entry, week rail, move-to-tomorrow state, completed list, client copy comparison, and planner portfolio card.

- [ ] **Step 4: Verify, capture, inspect, and commit planner only**

Run: `npm run test:unit && npm run build`

Run: `FORCE_SCREENS=1 CAPTURE_SLUGS=planner npm run capture:steps` and `FORCE_SCREENS=1 CAPTURE_SLUGS=planner npm run capture:mobile`.

Inspect steps 2, 7, 10, 15, 16, 17 on desktop/mobile.

Run: `git add app public/screens/planner public/screens-mobile/planner && git commit -m "feat: make planner quest original"`

---

### Task 4: Original «Копилка идей» quest

**Files:**
- Create: `app/content/original-quests/idea-vault.ts`
- Modify: `app/content/original-quests/original-quests.test.ts`
- Modify: `app/content/quests.ts`
- Modify: `app/content/mobile.ts`
- Modify: `app/components/OriginalServiceScene.tsx`
- Modify: `app/globals.css`
- Regenerate: `public/screens/idea-vault/*.png`
- Regenerate: `public/screens-mobile/idea-vault/*.png`

**Interfaces:**
- Produces: `buildIdeaVaultQuest(project, mode, customization): QuestStep[]`.

- [ ] **Step 1: Write and run failing idea-vault tests**

Test 17 idea-specific levels, own topics/statuses, quick capture, search/favorite/status/persistence flow, the selected creativity feature, private idea boundary, separate `idea-vault-client` copy, client brief, and real-mode purity.

Run: `npm run test:unit -- app/content/original-quests/original-quests.test.ts`

Expected: FAIL for missing idea-vault builder.

- [ ] **Step 2: Implement and wire all 17 idea-vault levels**

Teach capture → organize → find → choose → next action. Make the learner’s topics, wording, visual style, and one feature shape all later commands. Client adaptation must replace those exact variables without exposing private ideas.

- [ ] **Step 3: Implement idea-vault desktop/mobile prototypes**

Use a coral/cobalt creative board with fast capture, topic chips, status cards, search, favorite, next-small-step, private marker, client copy comparison, and portfolio case.

- [ ] **Step 4: Verify, capture, inspect, and commit idea-vault only**

Run: `npm run test:unit && npm run build`

Run: `FORCE_SCREENS=1 CAPTURE_SLUGS=idea-vault npm run capture:steps` and `FORCE_SCREENS=1 CAPTURE_SLUGS=idea-vault npm run capture:mobile`.

Inspect steps 2, 7, 10, 15, 16, 17 on desktop/mobile.

Run: `git add app public/screens/idea-vault public/screens-mobile/idea-vault && git commit -m "feat: make idea vault quest original"`

---

### Task 5: Original «Расписание ребёнка» quest

**Files:**
- Create: `app/content/original-quests/child-schedule.ts`
- Modify: `app/content/original-quests/original-quests.test.ts`
- Modify: `app/content/quests.ts`
- Modify: `app/content/mobile.ts`
- Modify: `app/components/OriginalServiceScene.tsx`
- Modify: `app/globals.css`
- Regenerate: `public/screens/child-schedule/*.png`
- Regenerate: `public/screens-mobile/child-schedule/*.png`

**Interfaces:**
- Produces: `buildChildScheduleQuest(project, mode, customization): QuestStep[]`.

- [ ] **Step 1: Write and run failing child-schedule tests**

Test 17 schedule-specific levels, today/week/items/repetition/edit/persistence flow, selected family-safe feature, explicit absence of full name/address/geolocation/teacher contacts, separate `child-schedule-client` copy, client brief, and real-mode purity.

Run: `npm run test:unit -- app/content/original-quests/original-quests.test.ts`

Expected: FAIL for missing child-schedule builder.

- [ ] **Step 2: Implement and wire all 17 child-schedule levels**

Teach a morning-first, privacy-first schedule. Use neutral symbols or nicknames instead of identity data. Make the exact activity, time, items, repeat, edit, phone, client approval, and portfolio checks visible.

- [ ] **Step 3: Implement child-schedule desktop/mobile prototypes**

Use sunny blue/yellow day cards with `Сегодня`, week rail, `Что взять`, packed state, safe neutral symbols, collision warning, client copy comparison, and sanitized portfolio card.

- [ ] **Step 4: Verify, capture, inspect, and commit child-schedule only**

Run: `npm run test:unit && npm run build`

Run: `FORCE_SCREENS=1 CAPTURE_SLUGS=child-schedule npm run capture:steps` and `FORCE_SCREENS=1 CAPTURE_SLUGS=child-schedule npm run capture:mobile`.

Inspect steps 2, 7, 10, 15, 16, 17 on desktop/mobile.

Run: `git add app public/screens/child-schedule public/screens-mobile/child-schedule && git commit -m "feat: make child schedule quest original"`

---

### Task 6: Four-project regression, visual QA, and deployment

**Files:**
- Modify if needed: `scripts/verify-screens.mjs`
- Modify if needed: tests that assert total quest/screenshot counts
- Modify: `docs/superpowers/plans/2026-08-09-first-four-original-quests.md` checkboxes

**Interfaces:**
- Consumes: all four builders, customization storage, customizer UI, desktop/mobile scenes, and regenerated screenshots.
- Produces: a validated deployed academy version containing exactly the four redesigned quests.

- [ ] **Step 1: Run the complete verification suite**

Run: `npm run lint && npm run test:unit && npm run verify:screens && npm run build`

Expected: every command exits 0; all PNGs are 1200×800.

- [ ] **Step 2: Run interactive browser checks**

For each of the four desktop quests: choose demo mode, edit and save level-2 personalization, confirm the prompt changes, finish a level, confirm scroll returns to top, open a screenshot, jump back home, and reopen the quest to confirm persistence.

For each mobile quest: confirm mobile-specific progress isolation, Telegram/server wording, touch-friendly choice controls, and level 15–17 client flow.

- [ ] **Step 3: Review the requirement checklist**

Compare the implementation with every section of `docs/superpowers/specs/2026-08-09-first-four-original-quests-design.md`. Record and fix any missing requirement before continuing.

- [ ] **Step 4: Commit final verification fixes**

Run: `git add app scripts public docs && git commit -m "fix: complete first four quest review"` only when there are final changes. Do not create an empty commit.

- [ ] **Step 5: Publish the validated build**

Package the successful build, save a new Sites version for the existing project, deploy it, poll until the status is `succeeded`, and open the exact deployed URL in the app browser.

- [ ] **Step 6: Final report**

Return the live URL and four short bullets: what is original in each quest, how customization is saved, how the client copy works, and what the user should review first.
