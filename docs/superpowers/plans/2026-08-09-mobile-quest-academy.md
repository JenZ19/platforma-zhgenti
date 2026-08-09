# Mobile Quest Academy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete phone-only copy of all 52 academy quests while preserving the existing desktop academy.

**Architecture:** Add a `format=mobile` route branch that reuses project definitions but builds phone-specific quest content, capability labels, buttons and storage namespaces. Keep the mobile catalogue and quest UI in focused components, and generate a second 884-image screenshot set from a mobile scene renderer. The multi-user Telegram–Codex backend is a separate later implementation and is not part of this plan.

**Tech Stack:** React 19, TypeScript, vinext, Vitest, Testing Library, CSS, Playwright screenshot capture, Sites hosting.

## Global Constraints

- The existing desktop routes and their progress must remain unchanged.
- The mobile routes are `/?format=mobile` and `/?format=mobile&quest=<slug>`.
- All 52 projects expose 17 mobile levels.
- Mobile instructions must not require Terminal, Git, npm, a desktop folder, or manual code editing.
- Real/demo preparation and progress are stored separately for every mobile quest.
- Missing bot configuration must show a safe disabled state, never a broken link.
- The Telegram bot backend, personal device-auth, and server containers are explicitly out of scope for this first deploy.
- External actions are represented honestly as Telegram, Lovable, Chatium, or curator handoff.

---

### Task 1: Mobile quest content model

**Files:**
- Create: `app/content/mobile.ts`
- Create: `app/content/mobile.test.ts`
- Modify: `app/content/types.ts`

**Interfaces:**
- Consumes: `ProjectDefinition`, `DataMode`, and the 52 `projects`.
- Produces: `MobileCapability`, `MobileAction`, `MobileQuestStep`, `getMobileCapability(project)`, and `buildMobileQuest(project, mode)`.

- [ ] **Step 1: Write failing tests for complete mobile coverage**

```ts
it("builds seventeen phone-only steps for every project", () => {
  for (const project of projects) {
    const steps = buildMobileQuest(project, "demo");
    expect(steps).toHaveLength(17);
    expect(steps.map((step) => step.id)).toEqual(Array.from({ length: 17 }, (_, index) => index + 1));
    expect(steps.map((step) => `${step.action} ${step.prompt ?? ""}`).join(" ")).not.toMatch(/терминал|npm|git |папк.+компьютер/i);
  }
});
```

Add tests that every project has a capability label, screenshot path `/screens-mobile/<slug>/step-NN.png`, Telegram action, constructor action, screenshot review action, and curator handoff for advanced sites.

- [ ] **Step 2: Run the focused test and observe RED**

Run: `npm run test:unit -- app/content/mobile.test.ts`

Expected: FAIL because `app/content/mobile.ts` does not exist.

- [ ] **Step 3: Implement the mobile types and builder**

Define:

```ts
export type MobileCapability = "phone-full" | "phone-template" | "curator";
export type MobileTool = "telegram" | "lovable" | "chatium" | "curator";
export type MobileAction = { tool: MobileTool; label: string; href?: string; note?: string };
export type MobileQuestStep = QuestStep & { mobileAction: MobileAction; screenshot: string };
```

Use one 17-step builder with project-specific titles, `project.outcome`, `project.features`, `project.demo`, safety, real/demo wording, and tool selection by `ProjectKind`. Build the Lovable URL with `https://lovable.dev/?autosubmit=true#prompt=` plus `encodeURIComponent(prompt)`. Use Chatium home URL only for Chatium actions. Telegram actions have no `href` until `NEXT_PUBLIC_COURSE_BOT_URL` is configured by the UI layer.

- [ ] **Step 4: Run focused tests and observe GREEN**

Run: `npm run test:unit -- app/content/mobile.test.ts`

Expected: all mobile content tests pass for 52 projects and 884 levels.

- [ ] **Step 5: Commit the content layer**

```bash
git add app/content/mobile.ts app/content/mobile.test.ts app/content/types.ts
git commit -m "feat: add phone-only quest content"
```

---

### Task 2: Mobile catalogue, routing, and quest interaction

**Files:**
- Create: `app/components/MobileAcademy.tsx`
- Create: `app/components/MobileQuest.tsx`
- Create: `app/components/MobileActionButton.tsx`
- Modify: `app/components/AppEntry.tsx`
- Modify: `app/components/App.test.tsx`
- Modify: `app/components/QuestPreparation.tsx`
- Modify: `app/components/ProjectCard.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `buildMobileQuest`, `getMobileCapability`, existing preparation/progress helpers.
- Produces: separate mobile catalogue and quest routes; storage namespace `mobile:<slug>`; safe external action buttons.

- [ ] **Step 1: Write failing route and interaction tests**

Add tests that `?format=mobile` renders `Академия с телефона`, opens `?format=mobile&quest=family-expenses`, asks for real/demo data, stores progress under `feya-academy-progress-v1:mobile:family-expenses`, leaves desktop storage untouched, and renders a disabled Telegram button with `Бот подключается куратором` when no bot URL is configured.

- [ ] **Step 2: Run the focused test and observe RED**

Run: `npm run test:unit -- app/components/App.test.tsx`

Expected: FAIL because the mobile route and components do not exist.

- [ ] **Step 3: Implement format-aware routing**

Extend `Route` with `format: "desktop" | "mobile"` and `capture-mobile`. Preserve `format=mobile` when opening a quest and returning home. Render `MobileAcademy` and `MobileQuest` only for the mobile format.

- [ ] **Step 4: Implement the mobile catalogue**

Render the 52 project cards, mobile progress stats, week/search filters, capability badges, and a clear link back to the computer version. Use `mobile:${project.slug}` when reading progress.

- [ ] **Step 5: Implement mobile quest interactions**

Reuse `QuestPreparation` with mobile copy that asks real/demo separately. Render one large action button per step. For Telegram, combine configured bot URL with `?start=q_<slug>_<step>`; if the configuration is absent, use a disabled button and the configured-safe message. For Lovable and Chatium, use external links with `target="_blank"` and `rel="noreferrer"`. Curator actions render as non-external help cards.

- [ ] **Step 6: Add touch-first responsive styles**

Use a single-column 390px layout, buttons at least 48px high, bottom sticky action area, capability badge styles, Telegram/Lovable/Chatium colors inside the existing Feya palette, and no horizontal overflow.

- [ ] **Step 7: Run focused tests and observe GREEN**

Run: `npm run test:unit -- app/components/App.test.tsx app/content/mobile.test.ts`

Expected: all mobile route, isolation, preparation, and action tests pass.

- [ ] **Step 8: Commit the interface**

```bash
git add app/components app/globals.css
git commit -m "feat: add mobile quest academy interface"
```

---

### Task 3: Mobile expected-result scenes and 884 screenshots

**Files:**
- Create: `app/components/MobileExpectedScene.tsx`
- Modify: `app/components/AppEntry.tsx`
- Modify: `scripts/projects.mjs`
- Create: `scripts/capture-mobile-steps.mjs`
- Modify: `scripts/verify-screens.mjs`
- Modify: `package.json`
- Generate: `public/screens-mobile/<slug>/step-01.png` through `step-17.png`

**Interfaces:**
- Consumes: `ProjectDefinition`, step ID, the `capture-mobile` route.
- Produces: mobile Telegram/Lovable/Chatium/curator scenes and a verified 884-image set at 1200×800.

- [ ] **Step 1: Write failing screenshot verification**

Extend verification to require both desktop and mobile sets. Expected totals are 884 desktop PNG files and 884 mobile PNG files, each exactly 1200×800.

- [ ] **Step 2: Run verification and observe RED**

Run: `npm run verify:screens`

Expected: FAIL with 884 missing mobile screenshots.

- [ ] **Step 3: Implement mobile scene renderer**

Create phone-shaped scenes for connection, data choice, Telegram project room, Feya questionnaire, Codex queue/result, Lovable/Chatium handoff, screenshot review, correction, mobile audit, publication, curator handoff, and portfolio card. Every scene must show the project title and the current level result.

- [ ] **Step 4: Add the capture route and capture script**

Parse `?capture-mobile=<slug>--step-NN`, render `MobileExpectedScene`, capture with three Playwright workers, and write to `public/screens-mobile/<slug>/step-NN.png`.

- [ ] **Step 5: Generate all mobile screenshots**

Run the production server on `http://localhost:3000`, then run `npm run capture:mobile`.

Expected: `Готово 884/884 экранов`.

- [ ] **Step 6: Verify both screenshot sets**

Run: `npm run verify:screens`

Expected: 1768 PNG files verified, split as 884 desktop and 884 mobile.

- [ ] **Step 7: Commit the visual evidence**

```bash
git add app/components/MobileExpectedScene.tsx app/components/AppEntry.tsx scripts package.json package-lock.json public/screens-mobile
git commit -m "feat: add mobile quest result screens"
```

---

### Task 4: Full QA and private deployment

**Files:**
- Modify only files required by discovered defects.

**Interfaces:**
- Consumes: complete mobile academy implementation.
- Produces: verified and privately deployed update of the existing Sites project.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm test && npm run lint && npm run verify:screens`

Expected: unit tests pass, vinext build succeeds, lint has no errors, and 1768 screenshots verify.

- [ ] **Step 2: Browser-test the mobile flow**

At 390×844, verify home → mobile catalogue → family-expenses → real/demo choice → first action → next project. Confirm no horizontal overflow, no console errors, separate progress keys, and safe disabled Telegram behavior.

- [ ] **Step 3: Commit any QA fixes**

```bash
git add -u app scripts package.json package-lock.json
git commit -m "fix: polish mobile quest flow"
```

Skip this commit when QA finds no defects.

- [ ] **Step 4: Publish the exact validated source**

Push the branch head to the existing Sites source, package the same commit, save one new version, deploy privately, and wait for deployment status `succeeded`.

- [ ] **Step 5: Open the deployed mobile academy**

Open `https://feya-quest-academy.submarine-edu.chatgpt.site/?format=mobile` and retain it as the deliverable tab.
