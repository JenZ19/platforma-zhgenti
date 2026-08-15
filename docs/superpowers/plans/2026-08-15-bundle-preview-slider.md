# Bundle Preview Slider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every split service/agent bundle preview with two full-size, clearly labelled results that alternate automatically and remain manually controllable.

**Architecture:** A focused client component owns the active bundle format, pause state, reduced-motion preference, and timer. `ProjectPreview` continues to own shared card structure and delegates only bundle media to that component. The existing identity registry supplies factual branch labels, while Pink Cloud CSS layers both full-size images instead of splitting the frame.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, CSS, Node test contracts.

## Global Constraints

- Change only the seven bundled project previews; single-result project covers remain unchanged.
- Never render a half-width service/agent collage.
- Replace bundle sticker copy containing «или агент» with a clear topic name.
- Autoplay interval is 4200 ms and pauses on hover or keyboard focus.
- `prefers-reduced-motion: reduce` disables autoplay and visual transition.
- Manual format controls remain available on desktop and mobile.

---

### Task 1: Define factual bundle labels

**Files:**
- Modify: `app/content/project-card-identities.ts`
- Test: `app/content/project-card-identities.test.ts`

**Interfaces:**
- Consumes: `getProjectCardIdentityBySlug(slug)`.
- Produces: bundle topic labels and branch result labels without «или агент».

- [ ] **Step 1: Write the failing registry test**

Assert that every bundle identity omits «или агент» and representative planning identities return «Планирование», «Планер недели», and «План дня».

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm run test:unit -- app/content/project-card-identities.test.ts`

Expected: FAIL because current bundle labels include «или агент».

- [ ] **Step 3: Replace bundle labels with topic names**

Update the seven bundle registry entries to use their project titles. Reuse concrete service and agent identities for the active preview badge.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `npm run test:unit -- app/content/project-card-identities.test.ts`

Expected: all tests pass.

### Task 2: Build the two-result preview

**Files:**
- Create: `app/components/BundlePreviewCarousel.tsx`
- Modify: `app/components/ProjectPreview.tsx`
- Modify: `app/components/App.test.tsx`

**Interfaces:**
- Consumes: `ProjectBundleDefinition` and `getProjectCardIdentityBySlug`.
- Produces: `BundlePreviewCarousel({ project })` with `data-active-format`, two full-size slides, exact format badge, and two accessible controls.

- [ ] **Step 1: Write failing behavior tests**

Test the service-first state, specific labels, manual agent selection, 4200 ms automatic change, and pause on hover.

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: `npm run test:unit -- app/components/App.test.tsx`

Expected: FAIL because the current bundle preview is a static split collage.

- [ ] **Step 3: Implement the minimal client carousel**

Create the component with `useState`, `useEffect`, a 4200 ms interval, reduced-motion detection, hover/focus pause handlers, two images, format badge, and two buttons. Replace the static bundle image pair in `ProjectPreview` and change the figcaption to «Два варианта одного проекта».

- [ ] **Step 4: Run the focused tests and confirm GREEN**

Run: `npm run test:unit -- app/components/App.test.tsx`

Expected: all tests pass.

### Task 3: Replace the split crop with a full-frame transition

**Files:**
- Modify: `app/pink-learning-dashboard.css`
- Modify: `app/globals.css`
- Test: `scripts/project-cards.test.mjs`

**Interfaces:**
- Consumes: `.bundle-preview-carousel`, `.bundle-preview-slide`, `.bundle-preview-format`, `.bundle-preview-dots`.
- Produces: full-frame layered images, visible active state, clear labels, AA-safe controls, responsive layout, and reduced-motion behavior.

- [ ] **Step 1: Replace the legacy CSS assertion with a failing full-frame contract**

Require an absolute layered slide, `width: 100%`, opacity transition, format badge, dots, and reduced-motion override. Reject the old `grid-template-columns: repeat(2, 1fr)` bundle layout.

- [ ] **Step 2: Run the focused script and confirm RED**

Run: `node --test scripts/project-cards.test.mjs`

Expected: FAIL because the current CSS statically splits both images.

- [ ] **Step 3: Implement Pink Cloud slider styles**

Remove the legacy split rules, layer slides over the full preview, style the current format badge and dots, keep the thematic sticker legible, and add mobile and reduced-motion rules.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `node --test scripts/project-cards.test.mjs && npm run test:unit -- app/components/App.test.tsx app/content/project-card-identities.test.ts`

Expected: all focused checks pass.

### Task 4: Verify, merge, publish, and inspect production

**Files:**
- Verify only.

**Interfaces:**
- Consumes: completed branch.
- Produces: merged and deployed production version.

- [ ] **Step 1: Run the complete quality gate**

Run: `npm test && npm run lint && git diff --check`

Expected: script tests, unit tests, build, lint, and diff check pass.

- [ ] **Step 2: Inspect desktop and mobile locally**

Check all seven bundles at desktop width and 375 px: full image, changing badge, manual control, no overflow, no half collage.

- [ ] **Step 3: Commit and merge locally**

Commit the verified implementation, fast-forward the main working branch, and re-run the complete quality gate in the main checkout.

- [ ] **Step 4: Save and deploy the exact merged version**

Push the exact commit to the configured Sites source repository, package that exact build, save a Sites version, and deploy it to production.

- [ ] **Step 5: Inspect production**

Verify the public URL on desktop and phone, including an automatic change and a manual format switch.

