# Burgundy Academy at `/kurs1` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the existing Neiroprofi Quest Academy in Elina Zhgenti's burgundy-and-gold visual language and expose it safely at `https://ezhgenti.ru/kurs1/` without changing existing routes.

**Architecture:** Keep the React/vinext application behavior and content intact, and implement the redesign through the existing dashboard shell, home components, theme tokens, and CSS. Continue publishing the application to its Sites project, then add one isolated Nginx reverse-proxy location for `/kurs1/` that strips the prefix upstream and rewrites the academy's absolute asset paths back under the prefix.

**Tech Stack:** React 19, TypeScript, vinext/Vite, CSS, Vitest, Node test runner, Playwright, Sites, Nginx.

## Global Constraints

- Preserve all 52 quests, factual per-project level counts, desktop/mobile modes, query routes, local progress, saved projects, search, portfolio, and Fairy behavior.
- Keep the AdminVPS discount visible only for `project.slug === "server-152fz" && step.id === 1`.
- Use a burgundy, champagne, cream, and muted-gold palette; remove the `pink-cloud` theme identifier from rendered academy shells.
- Keep mobile controls at least 44 px, avoid horizontal overflow, and retain reduced-motion handling.
- Do not change `https://ezhgenti.ru/kurs/`, `/kviz/`, `/lm/`, or `/lm2/`.
- Publish the academy only at `https://ezhgenti.ru/kurs1/`.

---

### Task 1: Lock the burgundy visual contract

**Files:**
- Modify: `scripts/dashboard-layout.test.mjs`
- Modify: `scripts/branding.test.mjs`
- Modify: `app/components/LearningShell.tsx`
- Modify: `app/components/AcademyDashboard.tsx`
- Modify: `app/components/DashboardHome.tsx`
- Modify: `app/pink-learning-dashboard.css`
- Modify: `public/favicon-neiroprofi.svg`

**Interfaces:**
- Consumes: existing `data-learning-shell`, `data-visual-theme`, dashboard class names, and the CSS imported from `app/layout.tsx`.
- Produces: `data-visual-theme="elina-burgundy"`, the new token set, and the welcome label used by visual and accessibility checks.

- [ ] **Step 1: Replace the old Pink Cloud token assertion with a failing burgundy contract**

```js
test("Elina Burgundy CSS declares the approved premium tokens and responsive safeguards", () => {
  const css = fs.readFileSync(path.join(root, "app/pink-learning-dashboard.css"), "utf8");
  for (const declaration of [
    "--academy-bg: #f2ece7",
    "--academy-wine: #681426",
    "--academy-wine-deep: #310811",
    "--academy-gold: #c8a767",
    "--academy-champagne: #f2e3ca",
    "--academy-cream: #fffaf3",
    "--academy-text: #2b1218",
  ]) assert.ok(css.includes(declaration), `Missing approved token: ${declaration}`);
  assert.doesNotMatch(css, /--cloud-bg:\s*#f8f4fb|--cloud-pink:\s*#ec4f93/);
  assert.match(css, /@media\s*\(max-width:\s*767px\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
```

Also assert that `LearningShell.tsx`, `AcademyDashboard.tsx`, and `DashboardHome.tsx` contain `data-visual-theme="elina-burgundy"` and do not contain `pink-cloud`; update the favicon assertion from pink to burgundy and gold.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test scripts/branding.test.mjs scripts/dashboard-layout.test.mjs --test-name-pattern='Elina Burgundy|visual theme|NEЙРОПРОФИ brand'`

Expected: FAIL because the approved tokens and `elina-burgundy` theme do not exist yet.

- [ ] **Step 3: Implement the theme identifier, welcome copy, tokens, and favicon palette**

Use `data-visual-theme="elina-burgundy"` on all three dashboard surfaces. Add a compact home label `НЕЙРОПРОФИ · Академия квестов` above the next-project copy. Replace the root theme variables with the exact values from Step 1 and update the favicon fill/stroke to `#681426` and `#C8A767`.

- [ ] **Step 4: Restyle all dashboard surfaces**

Keep existing class names and add CSS rules for: a deep-wine sidebar, champagne active navigation, cream content background, burgundy next-quest banner with a gold rule, cream project cards, gold progress bars, a dark mobile bottom navigation, strong `:focus-visible`, 48 px primary actions, one-column mobile cards, and reduced-motion fallbacks. Do not change project data or interaction handlers.

- [ ] **Step 5: Run focused checks and verify GREEN**

Run: `node --test scripts/branding.test.mjs scripts/dashboard-layout.test.mjs --test-name-pattern='Elina Burgundy|visual theme|NEЙРОПРОФИ brand'`

Expected: PASS.

- [ ] **Step 6: Commit the visual redesign**

```bash
git add scripts/dashboard-layout.test.mjs scripts/branding.test.mjs app/components/LearningShell.tsx app/components/AcademyDashboard.tsx app/components/DashboardHome.tsx app/pink-learning-dashboard.css public/favicon-neiroprofi.svg
git commit -m "style: redesign academy in Elina burgundy theme"
```

### Task 2: Protect functionality and responsive layout

**Files:**
- Modify: `scripts/dashboard-layout.test.mjs`
- Test: `app/components/App.test.tsx`

**Interfaces:**
- Consumes: existing dashboard routes and Playwright process lifecycle.
- Produces: a responsive contract for the redesigned shell across 375, 768, 1024, and 1440 px.

- [ ] **Step 1: Extend the browser contract before any responsive fix**

Add assertions that the rendered shell has `data-visual-theme="elina-burgundy"`, the sidebar background differs from the main background at desktop widths, the mobile bottom navigation is visible below 768 px, and `.dashboard-primary-action` is at least 44 px high.

- [ ] **Step 2: Run the layout test and verify RED if a new assertion exposes a gap**

Run: `node --test scripts/dashboard-layout.test.mjs --test-name-pattern='dashboard and quests do not overlap or overflow'`

Expected: either PASS immediately when the CSS from Task 1 already meets the contract, or FAIL with the exact unsupported viewport/selector.

- [ ] **Step 3: Apply only the responsive corrections required by Step 2**

Adjust the existing desktop, tablet, and mobile media blocks in `app/pink-learning-dashboard.css`; keep the established breakpoints and do not change React behavior.

- [ ] **Step 4: Run the full local verification**

Run: `npm test && npm run lint && git diff --check`

Expected: all script tests, all Vitest suites, production build, lint, and diff checks pass.

- [ ] **Step 5: Commit responsive safeguards if Step 3 changed source**

```bash
git add scripts/dashboard-layout.test.mjs app/pink-learning-dashboard.css
git commit -m "test: protect burgundy academy layouts"
```

### Task 3: Define and test the isolated `/kurs1/` proxy

**Files:**
- Create: `ops/nginx/ezhgenti-kurs1.conf`
- Create: `scripts/kurs1-proxy.test.mjs`

**Interfaces:**
- Consumes: upstream `https://feya-quest-academy.submarine-edu.chatgpt.site/`.
- Produces: an Nginx snippet with `location ^~ /kurs1/` that proxies the academy and rewrites its asset prefixes under `/kurs1/`.

- [ ] **Step 1: Write the failing proxy contract**

```js
test("kurs1 proxy is isolated and rewrites every academy asset family", async () => {
  const config = await readFile(new URL("../ops/nginx/ezhgenti-kurs1.conf", import.meta.url), "utf8");
  assert.match(config, /location \^~ \/kurs1\//);
  assert.match(config, /proxy_pass https:\/\/feya-quest-academy\.submarine-edu\.chatgpt\.site\//);
  assert.match(config, /proxy_ssl_server_name on/);
  assert.match(config, /proxy_set_header Accept-Encoding ""/);
  for (const path of ["_next", "covers", "materials", "screens", "screens-mobile", "guides", "og-", "favicon-"]) {
    assert.match(config, new RegExp(`sub_filter .*${path.replace("-", "\\-")}.*kurs1`));
  }
  assert.doesNotMatch(config, /location\s+\/(?!kurs1)/);
});
```

- [ ] **Step 2: Run the proxy test and verify RED**

Run: `node --test scripts/kurs1-proxy.test.mjs`

Expected: FAIL because the Nginx snippet does not exist.

- [ ] **Step 3: Add the exact Nginx location**

The snippet must use `location ^~ /kurs1/`, `proxy_pass` with a trailing slash, upstream Host/SNI headers, `proxy_set_header Accept-Encoding ""`, `sub_filter_once off`, response rewriting for the eight asset families, forwarding headers, and no rule outside `/kurs1/`.

- [ ] **Step 4: Verify GREEN through the existing `scripts/*.test.mjs` test glob**

Run: `node --test scripts/kurs1-proxy.test.mjs`.

Expected: PASS.

- [ ] **Step 5: Commit the deploy contract**

```bash
git add ops/nginx/ezhgenti-kurs1.conf scripts/kurs1-proxy.test.mjs
git commit -m "ops: define isolated kurs1 academy proxy"
```

### Task 4: Publish Sites and activate `/kurs1/`

**Files:**
- Source state: current Git HEAD
- Deploy artifact: Sites package built from the same HEAD
- Server config: `/etc/nginx/sites-enabled/ezhgenti.ru.conf`
- Server snippet: `/etc/nginx/snippets/ezhgenti-kurs1.conf`

**Interfaces:**
- Consumes: validated commit, Sites project `appgprj_6a77c23635108191a0da1fd62725e272`, and the tested Nginx snippet.
- Produces: updated academy upstream and live `https://ezhgenti.ru/kurs1/`.

- [ ] **Step 1: Record protected-route evidence before deployment**

Fetch `/kurs/`, `/kviz/`, `/lm/`, and `/lm2/`; record HTTP status plus SHA-256 of each HTML response in a temporary file.

- [ ] **Step 2: Publish the exact validated academy commit to Sites**

Push current HEAD with a short-lived Sites credential, package with `package-site.sh`, save one version, deploy it, poll to `succeeded`, and verify the returned academy URL.

- [ ] **Step 3: Install the isolated Nginx snippet safely**

Re-read the live config and compare it to the preflight copy. Upload `ops/nginx/ezhgenti-kurs1.conf` to `/etc/nginx/snippets/ezhgenti-kurs1.conf`, make a timestamped backup of the site config, add exactly one include inside the TLS server when missing, run `nginx -t`, and reload only after the test passes. Restore the backup if validation fails.

- [ ] **Step 4: Verify the new live route**

Check HTTP 200 for `/kurs1/`, `/kurs1/?section=projects`, and `/kurs1/?format=mobile&quest=family-expenses`. Confirm the HTML contains `data-visual-theme="elina-burgundy"` and that referenced `/kurs1/_next/`, `/kurs1/covers/`, and `/kurs1/materials/` resources return the expected content types.

- [ ] **Step 5: Prove protected routes are unchanged**

Repeat the status and SHA-256 checks for `/kurs/`, `/kviz/`, `/lm/`, and `/lm2/`; every status must remain 200 and every hash must match Step 1.

- [ ] **Step 6: Open the production route and clean temporary artifacts**

Open `https://ezhgenti.ru/kurs1/` in the Codex browser. Move the temporary Sites archive to Trash, keep the versioned Nginx backup, and ensure `git status --porcelain` contains only the pre-existing untracked `.superpowers/` directory.
