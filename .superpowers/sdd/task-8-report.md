# Task 8 — Pink Cloud visual system

Date: 2026-08-15

## RED

Command:

```bash
node --test scripts/hero-layout.test.mjs scripts/quest-typography.test.mjs
```

Observed before production CSS was created: 0 passed, 5 failed. Failures named the missing Pink Cloud hero, adult font stack, 18 px desktop quest body, 17 px mobile quest body, and readable prose width. The tests loaded successfully and failed for the intended missing behavior.

The first executable route run also exposed that vinext advertises and binds `localhost` on this Mac while an IPv4 `127.0.0.1` probe cannot connect. The test now uses the advertised host, a configurable process-specific port, bounded readiness polling, and process-group cleanup with TERM/KILL fallback.

## GREEN

Focused contracts:

```text
hero-layout + quest-typography: 5/5 passed
dashboard-layout: 2/2 passed
```

The layout regression opens `/`, `/?section=projects`, `/?section=weeks`, `/?quest=pressure-diary`, and `/?format=mobile` at 375, 768, 1024, and 1440 px. It checks horizontal overflow, 44 px phone controls, desktop shell separation, viewport-specific navigation, the Fairy trigger, and the gap between sticky quest actions and mobile bottom navigation.

Final clean run:

```text
npm run test:scripts  -> 11/11 passed
npm run test:unit     -> 23 files, 278/278 passed
npm run lint          -> exit 0
npm run build         -> exit 0
```

The unit run prints six known jsdom `Not implemented: navigation to another Document` notices while all tests pass. The production build prints vinext's existing large-chunk and dynamic-route classification warnings and completes successfully.

## Approved visual constraints implemented

- Exact Pink Cloud palette and gradient from the approved design; the generated indigo/green recommendation was rejected.
- Manrope with Inter and system fallbacks; no Baloo or Comic Neue.
- Original `ProjectPreview` components and project-specific cover content remain intact.
- Desktop quest body is exactly 18 px; mobile quest body is exactly 17 px with bounded readable line lengths.
- Persistent sidebar from 1024 px, coherent two-column tablet shell at 768 px, and safe-area-aware five-item bottom navigation through 767 px.
- Visible mobile actions meet 44 × 44 px; sticky quest actions stop above bottom navigation.
- The duplicate mobile Fairy floating trigger is hidden because the same destination is present in bottom navigation. On tablet and desktop the trigger stays inside the sidebar instead of covering lesson content or the level map.
- SVG `DashboardIcon` paths are used for navigation, search, reset, preparation choices, disclosure, Fairy, and close controls.
- Focus-visible, non-color status labels, reduced motion, stable hover geometry, honest empty states, search/filter surfaces, portfolio, preparation, quest, dialog, reward, and Fairy states are styled.
- Legacy `globals.css` remains for prototype scenes; `tactile-album.css` is no longer imported and Pink Cloud overrides legacy quest shell widths, duplicate headers/footers, old typography, and unsafe fixed positioning.

## Visual review

In-browser review covered the dashboard at 1440 × 900 and 375 × 812, the desktop quest at 1024 × 900, and the mobile quest at 375 × 812. The review found and corrected a Fairy-trigger overlap with the desktop level map and mobile sticky continuation action. The generated `design-system/submarine-quest-academy/MASTER.md` was removed because its childish fonts and indigo/green palette contradicted the approved system.
