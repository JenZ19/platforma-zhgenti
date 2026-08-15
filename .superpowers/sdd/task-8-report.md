# Task 8 — Pink Cloud visual system

Date: 2026-08-15

## RED

Command:

```bash
node --test scripts/hero-layout.test.mjs scripts/quest-typography.test.mjs
```

Observed before production CSS was created: 0 passed, 5 failed. Failures named the missing Pink Cloud hero, adult font stack, 18 px desktop quest body, 17 px mobile quest body, and readable prose width. The tests loaded successfully and failed for the intended missing behavior.

The first executable route run also exposed that vinext advertises and binds `localhost` on this Mac while an IPv4 `127.0.0.1` probe cannot connect. The test now uses the advertised host, a configurable process-specific port, bounded readiness polling, and process-group cleanup with TERM/KILL fallback.

Review-fix RED was captured before implementation:

```text
AppEntry / Fairy / reward regression: 5 failed, 111 passed
typography / contrast contracts:       3 failed, 3 passed
```

The failures proved the unparameterized phone route stayed desktop, explicit desktop was removed from its canonical URL, mobile Fairy navigated out of the quest, the reward was a `div`, the system font contract was absent, legacy miniature type could leak through, and text-bearing gradients had no computed AA contract.

The final review pass added four failing App regressions before implementation: implicit orientation did not update, explicit desktop had no reachable phone switch, preparation/format buttons still used unsafe content structure, and the final disabled reward opener lost focus. Browser RED contracts additionally covered preparation geometry, Telegram/curator contrast, Pink Cloud customizer surfaces, viewport ownership, and owned-server readiness.

The closing review added executable RED for ownership across dashboard-to-quest navigation, child normal/signal exits and the late-listener race, first-phone server markup, and both format-choice entrances. The implicit mobile quest stayed locked after resizing, the lifecycle helper was absent and then exposed a listener race, the pre-hydration desktop escape was visible at 375 px, the bundle card retained a green gradient, and desktop choice prose remained 17 px.

## GREEN

Focused review contracts:

```text
AppEntry / Fairy / native reward: 116/116 passed
quest-typography and contrast:    6/6 passed
final focused App regression:     122/122 passed
dashboard-layout:                 6/6 passed
```

The layout regression opens `/`, projects, weeks, portfolio, full Fairy, the default pressure-diary route, and an explicit mobile pressure-diary route at 375, 768, 1024, and 1440 px. It checks horizontal overflow; visible buttons, links, inputs, selects, textareas, and switches at 44 px on phone; shell separation and hidden bottom navigation from 768 px; preparation typography; Fairy placement; and the gap between sticky quest actions and mobile bottom navigation. A deep browser flow also checks the real-data preparation focus ring, first-phone mobile canonicalization, mobile map/actions, contextual Fairy, image and reward dialogs, reset confirmation, focus restoration, computed banner/CTA contrast, dashboard-to-quest orientation changes, explicit ownership, SSR no-flash, and planning/install choice surfaces.

Final clean run:

```text
npm run test:scripts  -> 17/17 passed
npm run test:unit     -> 23 files, 290/290 passed
npm run lint          -> exit 0
npm run build         -> exit 0
git diff --check      -> exit 0
```

The unit run prints six known jsdom `Not implemented: navigation to another Document` notices while all tests pass. The production build prints vinext's existing large-chunk and dynamic-route classification warnings and completes successfully.

## Approved visual constraints implemented

- Exact Pink Cloud palette and gradient from the approved design; the generated indigo/green recommendation was rejected.
- Offline-safe system sans stack; no local Manrope asset exists in the repository, so no network font dependency or false loading claim was added. No Baloo or Comic Neue.
- Original `ProjectPreview` components and project-specific cover content remain intact.
- Desktop quest body is exactly 18 px; mobile quest body is exactly 17 px with bounded readable line lengths.
- Persistent sidebar from 1024 px, coherent two-column tablet shell at 768 px, and safe-area-aware five-item bottom navigation through 767 px.
- Visible mobile actions meet 44 × 44 px; sticky quest actions stop above bottom navigation.
- The duplicate mobile Fairy floating trigger is hidden because the same destination is present in bottom navigation. On tablet and desktop the trigger stays inside the sidebar instead of covering lesson content or the level map.
- On a quest, the bottom-nav Fairy opens one modal scoped to the exact quest slug and keeps the route/workspace in place. Outside a quest it opens the full Academy Fairy section.
- SVG `DashboardIcon` paths are used for navigation, search, reset, preparation choices, disclosure, Fairy, and close controls.
- The reward is a native modal dialog with `showModal`, cancel/Escape handling, initial focus, opener restoration, and an `open`-attribute fallback.
- Text-bearing Pink Cloud actions use solid `#802153` with white text (9.29:1 computed contrast); the approved gradient token remains exact and is reserved for non-text progress decoration.
- Preparation and customizer prose override legacy type at 18 px desktop / 17 px mobile; true metadata stays 14 px, and hidden checklist/radio controls expose visible `focus-within` rings.
- Preparation and format/platform choice buttons now contain only an SVG icon span plus one phrasing-content wrapper. Browser geometry verifies the copy does not inherit the legacy 48 × 48 px icon circle or create overflow.
- The full customizer shell, fieldsets, labels, palette controls and summary use Pink Cloud surfaces and AA text colors; live project palette colors remain user-controlled.
- Implicit routes follow the 767 px media boundary during resize/orientation and remove the generated mobile parameter when returning to desktop. Explicit formats remain user-owned; explicit desktop exposes a visible 48 px phone switch outside the hidden sidebar.
- Telegram and curator mobile actions use computed AA-safe solid colors. Mobile reset has 17 px actionable copy and 14 px explanatory copy; stable pressed states do not change layout.
- Final-level rewards move focus to the completed step article when the original action becomes disabled; intermediate rewards still restore their exact opener.
- Layout-server readiness requires the owned child to advertise the configured process-specific port and never adopts a listener after that child exits; cleanup retains and terminates the owned process group.
- Implicit dashboard ownership now survives opening a mobile quest, so resize/orientation returns to desktop and removes the generated format parameter. Explicit URL or toggle ownership remains fixed across the same navigation.
- Child lifecycle checks treat either `exitCode` or `signalCode` as final, fail readiness before accepting a stale response, and settle immediately without retaining an exit listener even when exit races listener registration.
- Planning format and Codex platform choices use only Pink Cloud backgrounds, white/rose surfaces, cloud borders, adult sans typography, AA text colors and stable focus/pressed states. Substantive copy is 18 px desktop and 17 px mobile.
- The narrow explicit-desktop escape is hidden while `data-client-ready="false"`; it becomes visible after hydration only when the desktop format is still explicitly owned.
- Focus-visible, non-color status labels, reduced motion, stable hover geometry, honest empty states, search/filter surfaces, portfolio, preparation, quest, dialog, reward, and Fairy states are styled.
- Legacy `globals.css` remains for prototype scenes; `tactile-album.css` is no longer imported and Pink Cloud overrides legacy quest shell widths, duplicate headers/footers, old typography, and unsafe fixed positioning.

## Visual review

In-browser review covered home, projects, weeks, portfolio, full Fairy, default pressure-diary, and explicit mobile pressure-diary at 375 × 900, 768 × 900, 1024 × 900, and 1440 × 900. The deep pass additionally covered real-data preparation, mobile quest workspace/map/actions, contextual Fairy dialog, image dialog, reset confirmation, a desktop reward dialog, implicit and explicit dashboard-to-planning rotation, no-JavaScript first-phone SSR, and the planning/install choice screens at 375 × 900 and 1024 × 900. The generated `design-system/submarine-quest-academy/MASTER.md` remains removed because its childish fonts and indigo/green palette contradicted the approved system.
