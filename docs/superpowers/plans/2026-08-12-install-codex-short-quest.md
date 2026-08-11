# Short Install Codex Quest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 17-level mixed-platform installation lesson with one platform selector and a six-level Mac- or Windows-specific quest.

**Architecture:** Add a small local-storage helper and a focused platform-choice component. Pass the selected platform into the setup-quest builder so content, progress, and reset behavior stay isolated per branch while the rest of the academy remains unchanged.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, vinext, Sites hosting.

## Global Constraints

- The learner chooses Mac or Windows before level 1.
- Each branch contains exactly six levels and no three-frame guide gallery.
- Only official OpenAI links and honest real/placeholder screenshot labels are allowed.
- Reset returns this quest to platform selection without touching other projects.
- Desktop and mobile instruction views preserve separate local state.

---

### Task 1: Define the platform content contract

**Files:**
- Modify: `app/content/setup-quests.test.ts`
- Modify: `scripts/projects.test.mjs`

**Interfaces:**
- Consumes: `buildQuest(project, mode, customization, platform)`.
- Produces: failing assertions for six Mac/Windows levels, concise copy, official links, and absent guide galleries.

- [ ] **Step 1: Write the failing content tests**
- [ ] **Step 2: Run the targeted tests and confirm they fail because platform branching is missing**
- [ ] **Step 3: Keep the failure output as the RED evidence**

### Task 2: Persist the selected platform

**Files:**
- Create: `app/lib/setup-platform.ts`
- Create: `app/lib/setup-platform.test.ts`

**Interfaces:**
- Produces: `SetupPlatform`, `loadSetupPlatform`, `saveSetupPlatform`, `resetSetupPlatform`, and `setupPlatformKey`.

- [ ] **Step 1: Write failing storage tests for desktop/mobile isolation and reset**
- [ ] **Step 2: Run the storage test and confirm RED**
- [ ] **Step 3: Implement the minimal storage helper**
- [ ] **Step 4: Run the storage test and confirm GREEN**

### Task 3: Add the Mac/Windows choice screen

**Files:**
- Create: `app/components/InstallCodexPlatformChoice.tsx`
- Modify: `app/components/Quest.tsx`
- Modify: `app/components/MobileQuest.tsx`
- Modify: `app/components/App.test.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `SetupPlatform` and storage helpers.
- Produces: an accessible two-card selector, persisted platform badge, and reset-to-choice behavior.

- [ ] **Step 1: Write failing component tests for choosing, restoring, and resetting Mac/Windows**
- [ ] **Step 2: Run the component test and confirm RED**
- [ ] **Step 3: Implement the selector and connect it to desktop/mobile quests**
- [ ] **Step 4: Add responsive styles and focus states**
- [ ] **Step 5: Run the component tests and confirm GREEN**

### Task 4: Replace the 17 levels with six platform-specific levels

**Files:**
- Modify: `app/content/types.ts`
- Modify: `app/content/quests.ts`
- Modify: `app/content/setup-quests.ts`
- Modify: `app/content/journey-plans.ts`
- Modify: `scripts/projects.mjs`
- Modify: `app/components/SetupQuestPrototypeScene.tsx`

**Interfaces:**
- Consumes: selected `SetupPlatform`.
- Produces: `buildSetupQuest(project, platform)` and six concise steps with no guide arrays.

- [ ] **Step 1: Implement only the content required by the failing tests**
- [ ] **Step 2: Update the declared level counts and prototype total**
- [ ] **Step 3: Run the targeted content tests and confirm GREEN**

### Task 5: Add honest screenshots

**Files:**
- Create: `public/screens/install-codex/real-step-01.jpg`
- Create: `public/screens/install-codex/placeholder-step-02.svg`
- Create: `public/screens/install-codex/placeholder-step-03.svg`
- Create: `public/screens/install-codex/placeholder-step-04.svg`
- Create: `public/screens/install-codex/placeholder-step-05.svg`
- Create: `public/screens/install-codex/placeholder-step-06.svg`

**Interfaces:**
- Produces: one real official page capture plus explicit replacement placeholders; content metadata labels each asset honestly.

- [ ] **Step 1: Capture the official download page without personal data**
- [ ] **Step 2: Create clearly labeled replacement placeholders for unavailable app/system screens**
- [ ] **Step 3: Verify dimensions, file type, and lesson references**

### Task 6: Verify and publish

**Files:**
- Modify: deployment metadata only if the hosting workflow requires it.

**Interfaces:**
- Consumes: the complete six-level quest.
- Produces: passing tests, lint, build, browser verification, and a live deployment.

- [ ] **Step 1: Run targeted tests, then the full unit and script suites**
- [ ] **Step 2: Run lint and production build**
- [ ] **Step 3: Verify Mac selection, Windows selection, screenshots, reset, and responsive layout in the browser**
- [ ] **Step 4: Commit the validated source**
- [ ] **Step 5: Package, save, deploy, poll to success, and open the live URL**
