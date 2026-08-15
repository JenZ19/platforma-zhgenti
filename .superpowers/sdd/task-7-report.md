# Task 7 report: mobile quest workspace

## Status

Implemented the mobile ready-state workspace as one full-width step with a level map that is absent from the accessibility tree until opened. Preparation, output selection, real-data checklists, setup choices, customization, project links, guides, screenshots, contextual help, reset behavior, and the isolated `mobile:` progress namespace remain intact.

## TDD evidence

### RED

```text
npm run test:unit -- app/components/App.test.tsx
Test Files  1 failed (1)
Tests  8 failed | 100 passed (108)
```

The intended failures covered the missing mobile workspace marker and full-width card, hidden/open map, current/locked/completed states, map closure and focus restoration, completed-step revisit/continue/back behavior, smooth scrolling, mobile progress isolation and final completion date, ordered content preservation, and accessible screenshot/guide dialogs.

### Focused GREEN

```text
npm run test:unit -- app/components/App.test.tsx app/components/AppRoutes.test.tsx app/content/mobile.test.ts
Test Files  3 passed (3)
Tests  137 passed (137)
```

Existing mobile expectations changed only where Task 7 explicitly replaces the contract: the fixed continuation label, hidden map, smooth step opener, and desktop-aligned `why -> optional terms -> action` order.

## Implemented behavior

- Only a ready quest renders `data-quest-workspace="mobile"`; preparation and format/setup choices stay outside the workspace.
- The step card is the sole persistent lesson surface. The old horizontal level rail is removed.
- `Открыть карту уровней` exposes a labelled sheet with textual current, completed, available, and locked states. Its visible `Закрыть` button is keyboard-native and restores focus to the trigger; selecting a level also closes the sheet and restores safe focus.
- One guarded `openMobileStep()` handles map selection, Back, completed-step Continue, and the next target after completion. It rejects invalid/locked targets, saves only the mobile branch, closes map/help/screenshot state, and smooth-scrolls to the top.
- A reopened completed level continues without re-blocking. Back is disabled on level 1. The final action records `completedAt`, becomes `Квест пройден`, and is disabled, matching desktop semantics.
- Ready content follows the desktop order: title, why, optional terms, action and `MobileActionButton`, optional prompt, guide, project links, `Готово, если`, help, and bottom actions.
- The mobile capability badge, project-specific action, data mode, output/setup badges, customization, AdminVPS offer/PDF, honest real/prototype/placeholder labels, and all existing setup/server/bundle routes remain available.
- Mobile result screenshots now use the same native-dialog lifecycle as desktop: visible labelled close control, Escape/native cancel handling, exact opener focus restoration, and a safe fallback when `showModal` is unavailable. Shared `QuestGuide` dialogs retain the same Task 6 accessibility behavior.

## Full verification

```text
npm run test:unit
Test Files  23 passed (23)
Tests  276 passed (276)
Duration  13.88s
```

```text
npm run test:scripts
tests 7
pass 7
fail 0
```

```text
npm run lint
exit 0
```

```text
npm run build
Build complete. Run `vinext start` to start the production server.
exit 0
```

```text
git diff --check
exit 0
```

## Files

- Updated `app/components/MobileQuest.tsx`.
- Updated `app/components/App.test.tsx` with mobile workspace, map, navigation, isolation, completion, content, focus, and dialog regressions.
- Added this coordination report.

## Concerns

- Task 7 exposes semantic hooks only; sticky bottom-safe styling and final responsive Pink Cloud presentation remain assigned to Task 8.
- The successful build retains the existing Node `punycode` deprecation and large-client-chunk warnings.
- JSDOM retains its existing native-navigation notices in unrelated modified-link tests; all tests pass.

## Review follow-up

### RED

```text
npm run test:unit -- app/components/App.test.tsx -t "marks mobile levels|resets transient mobile"
Test Files  1 failed (1)
Tests  2 failed | 107 skipped (109)
```

The regressions proved that transient map/help/dialog state could survive when React reused `MobileQuest` for another quest route, and that an active completed map item exposed only `Пройден` instead of both current and completed state.

### Fixes

- `MobileQuestBody` is keyed by the exact `storageSlug`, so quest, bundle-output, and setup-platform branch changes remount transient UI state while persisted branch state reloads from its existing namespace.
- A completed active level now visibly says `Сейчас · пройден`, keeps `aria-current="step"`, and exposes both `текущий` and `пройден` in its accessible name.
- The content-order regression now asserts every mandatory node explicitly, includes the step heading, preserves optional terms in the sequence, and adds a project-specific server fixture proving prompt → links → result order.

### Review GREEN

```text
npm run test:unit -- app/components/App.test.tsx -t "marks mobile levels|resets transient mobile"
Test Files  1 passed (1)
Tests  2 passed | 107 skipped (109)
```

Final post-review verification:

```text
Focused mobile/routes/content: 3 files passed, 138 tests passed
Full unit: 23 files passed, 277 tests passed
Scripts: 7 passed, 0 failed
Lint: exit 0
Build: complete, exit 0
git diff --check: exit 0
```

## Final heading-order follow-up

### RED

```text
npm run test:unit -- app/components/App.test.tsx -t "keeps the mobile step h1"
Test Files  1 failed (1)
Tests  1 failed | 109 skipped (110)
```

The regression opened the mobile level map and proved that its `h2` preceded the active step `h1` in document order.

### Fix and GREEN

- The map sheet now renders after the step article in the DOM while retaining its fixed-position CSS hook.
- The existing trigger, `aria-controls`, `aria-expanded`, close/select behavior, guarded navigation, and exact trigger focus restoration are unchanged.

```text
npm run test:unit -- app/components/App.test.tsx -t "keeps the (ready mobile|mobile step h1)"
Test Files  1 passed (1)
Tests  2 passed | 108 skipped (110)
```

Final verification after the heading-order fix:

```text
Focused mobile/routes/content: 3 files passed, 139 tests passed
Full unit: 23 files passed, 278 tests passed
Scripts: 7 passed, 0 failed
Lint: exit 0
Build: complete, exit 0
git diff --check: exit 0
```
