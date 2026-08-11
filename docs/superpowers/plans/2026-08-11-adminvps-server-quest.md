# AdminVPS Server Quest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the practical Selectel path with a complete AdminVPS purchase and setup route, including the 60% partner offer, every section of the supplied PDF, beginner-safe screenshots, and legal guardrails.

**Architecture:** The server quest remains a 17-step setup quest. AdminVPS-specific commercial content lives in a dedicated reusable offer component, while step content remains in `setup-quests.ts`. User-supplied assets are copied to public materials; existing capture components generate the 17 desktop, 17 mobile, and 51 guide screenshots.

**Tech Stack:** TypeScript, React 19, Vitest, Testing Library, Playwright capture scripts, Sites hosting.

## Global Constraints

- AdminVPS is the only practical purchase path; Selectel UI instructions are removed.
- Preserve all seven numbered sections and the final checklist from the six-page PDF.
- Use Russian server placement in practical steps; mention Finland only as the PDF's latency example.
- Promo code is exactly `SUBMARINE123`.
- Display conditions exactly: 60% off one server, one activation, one-month payment, all tariffs except Lite.
- Prices from the PDF are labelled as screenshot reference values and must be checked live before payment.
- Never request or display a password, private SSH key, card details, or API secret.
- State clearly that Russian hosting alone does not establish full 152-FZ compliance.

---

### Task 1: Source assets and failing content coverage

**Files:**
- Copy: `/Users/jenniferzelenova/Downloads/Инструкция_—_Как_арендовать_VPS_на_AdminVPS_ru.pdf` → `public/materials/adminvps-vps-instruction.pdf`
- Copy: `/var/folders/h7/s_xx47_n1wx5_q479xfty9840000gn/T/codex-clipboard-89fc085f-e342-4b71-9ce4-0561f5827b6b.jpg` → `public/materials/adminvps-submarine-discount.jpg`
- Modify: `app/content/setup-quests.test.ts`

**Interfaces:**
- Consumes: `buildQuest(getQuestProject("server-152fz"))`.
- Produces: regression coverage for the entire AdminVPS route.

- [ ] **Step 1: Copy the two supplied source assets without modifying the originals**

Use filesystem copy commands and verify the destination hashes match the sources.

- [ ] **Step 2: Write failing content tests**

```ts
it("repeats the complete AdminVPS purchase instruction", () => {
  const text = allText(buildQuest(getQuestProject("server-152fz")!));
  for (const phrase of ["adminvps.ru", "Promo", "Micro", "Start", "Standard", "Код скидки", "SUBMARINE123", "Продукты и услуги", "Активный", "SSH-ключи", "Сменить тариф"]) {
    expect(text).toContain(phrase);
  }
  expect(text).toContain("https://adminvps.ru/");
  expect(text).toContain("/materials/adminvps-vps-instruction.pdf");
  expect(text).not.toMatch(/my\.selectel\.ru|Создать сервер.+Selectel/is);
});

it("keeps the partner conditions and legal guardrail", () => {
  const text = allText(buildQuest(getQuestProject("server-152fz")!));
  expect(text).toMatch(/60%.+один сервер.+один раз.+1 месяц.+Lite/is);
  expect(text).toMatch(/сервер.+сам по себе.+не.+соответств/is);
  expect(text).toMatch(/локаци.+Росси/is);
});
```

- [ ] **Step 3: Run the focused test and confirm it fails**

Run: `npm run test:unit -- app/content/setup-quests.test.ts`

Expected: FAIL because the quest still uses Selectel.

- [ ] **Step 4: Commit source assets and failing tests**

```bash
git add public/materials app/content/setup-quests.test.ts
git commit -m "test: define complete AdminVPS server route"
```

### Task 2: Rewrite the 17-step server route

**Files:**
- Modify: `app/content/setup-quests.ts`
- Modify: `app/content/projects.ts`

**Interfaces:**
- Consumes: existing `SetupStepInput`, `external`, `apiLessonLink`, and guide generation.
- Produces: a 17-step AdminVPS quest with official and downloadable links.

- [ ] **Step 1: Replace Selectel-specific steps 4–15**

Keep legal steps 1–3 and final operator/API steps 16–17. Implement exact PDF mapping from the approved design:

```ts
{ id: 5, title: "Открыла официальный сайт AdminVPS", action: "Нажмите официальную кнопку ниже. Проверьте адрес adminvps.ru, баннер текущей акции и блок дата-центров VPS. Для персональных данных пока ничего не покупайте за пределами российской локации.", links: [external("Перейти на AdminVPS", "https://adminvps.ru/", "Официальный сайт провайдера."), external("Скачать полную инструкцию", "/materials/adminvps-vps-instruction.pdf", "Все шесть страниц исходного руководства.")] }
```

At step 6 include the four reference plans and state that live price wins. At step 7 include basket, Ubuntu 22.04 as the PDF example, optional resources, promo application, and updated total. At steps 8–12 include checkout, cabinet, active state, actions, SSH public key, and every final checklist item. At steps 13–15 retain server hardening, backups, and provider/operator role using AdminVPS sources.

- [ ] **Step 2: Update the catalogue project text**

Replace Selectel-neutral demo details with `AdminVPS открыт`, `Промокод применён`, and `Сервер активен`. Keep the legal safety statement unchanged.

- [ ] **Step 3: Run content and automation tests**

Run: `npm run test:unit -- app/content/setup-quests.test.ts app/content/automation-first.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit the rewritten content**

```bash
git add app/content/setup-quests.ts app/content/projects.ts
git commit -m "feat: replace server quest with AdminVPS path"
```

### Task 3: Partner offer block on desktop and mobile

**Files:**
- Create: `app/components/ServerDiscountOffer.tsx`
- Modify: `app/components/Quest.tsx`
- Modify: `app/components/MobileQuest.tsx`
- Modify: `app/components/App.test.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: fixed promo code, official URL, supplied image path.
- Produces: `ServerDiscountOffer({ mobile?: boolean })` with copy interaction and terms.

- [ ] **Step 1: Add a failing component test**

```tsx
it("shows the AdminVPS partner offer in both server quest formats", () => {
  const project = getQuestProject("server-152fz")!;
  const { rerender } = render(<Quest project={project} onHome={vi.fn()} />);
  expect(screen.getByText(/скидка 60% на сервер/i)).toBeInTheDocument();
  expect(screen.getByText("SUBMARINE123")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /перейти на AdminVPS/i })).toHaveAttribute("href", "https://adminvps.ru/");
  rerender(<MobileQuest project={project} onHome={vi.fn()} />);
  expect(screen.getByText(/все тарифы, кроме Lite/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Confirm the test fails**

Run: `npm run test:unit -- app/components/App.test.tsx`

Expected: FAIL because `ServerDiscountOffer` does not exist.

- [ ] **Step 3: Implement the offer component**

Render exact copy, the supplied image, four conditions, a secure-price reminder, external link, and clipboard button. The button copies only `SUBMARINE123`; it never reads other clipboard data.

```tsx
export function ServerDiscountOffer({ mobile = false }: { mobile?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copyCode() {
    await navigator.clipboard.writeText("SUBMARINE123");
    setCopied(true);
  }
  return <aside className={`server-discount-offer${mobile ? " mobile" : ""}`} aria-label="Скидка AdminVPS">
    <div><p>Партнёрская возможность курса</p><h2>Скидка 60% на сервер для ваших проектов</h2><p>Разместите сайт, сервис или ИИ-агента на собственном VPS.</p></div>
    <img src="/materials/adminvps-submarine-discount.jpg" alt="Корзина AdminVPS после применения скидки 60%" />
    <div className="server-promo-code"><span>Промокод</span><strong>SUBMARINE123</strong><button type="button" onClick={copyCode}>{copied ? "Скопировано ✓" : "Скопировать"}</button></div>
    <ul><li>Скидка применяется к одному серверу</li><li>Активируется один раз</li><li>Период оплаты — 1 месяц</li><li>Все тарифы, кроме Lite</li></ul>
    <a href="https://adminvps.ru/" target="_blank" rel="noreferrer">Перейти на AdminVPS →</a>
    <small>До оплаты проверьте российскую локацию, скидку и итоговую сумму. Один сервер не заменяет остальные требования 152-ФЗ.</small>
  </aside>;
}
```

- [ ] **Step 4: Render only for `server-152fz`**

Place the block after the quest hero and before the level map/content in both desktop and mobile. Do not render it in capture-only prototype scenes or unrelated projects.

- [ ] **Step 5: Style and test**

Use the SUBMARINE palette, a large `60%` marker, the screenshot as supporting evidence, and a high-contrast promo-code control. On mobile stack all elements and keep the button at least 44 px tall.

Run: `npm run test:unit -- app/components/App.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the offer UI**

```bash
git add app/components/ServerDiscountOffer.tsx app/components/Quest.tsx app/components/MobileQuest.tsx app/components/App.test.tsx app/globals.css
git commit -m "feat: add AdminVPS partner offer"
```

### Task 4: AdminVPS prototypes and screenshots

**Files:**
- Modify: `app/components/SetupQuestPrototypeScene.tsx`
- Modify: `app/components/OriginalQuestGuideScene.tsx`
- Modify: `app/components/MobileExpectedScene.tsx`
- Replace: `public/screens/server-152fz/step-01.png` through `step-17.png`
- Replace: `public/screens-mobile/server-152fz/step-01.png` through `step-17.png`
- Replace: `public/guides/server-152fz/step-01-frame-01.png` through `step-17-frame-03.png`

**Interfaces:**
- Consumes: `getSetupQuestStepTitle`, existing capture query routes, supplied discount screenshot.
- Produces: 85 server-quest PNGs matching AdminVPS content.

- [ ] **Step 1: Update prototype stages**

Render AdminVPS-specific visual states for site, plans, basket/promo, checkout, cabinet, active server, SSH key, hardening, backups, operator checklist, and external API audit. Keep passwords, email, phone, IP, and account values masked.

- [ ] **Step 2: Run local server and capture all server screens**

Run existing capture scripts with `QUESTS=server-152fz`. Capture desktop, mobile, and original-guide frames.

- [ ] **Step 3: Verify dimensions and visually inspect representative frames**

Run: `npm run verify:screens`

Expected: `Проверено 2449 PNG-экранов` with no missing or wrong-size files.

Inspect levels 5, 6, 7, 9, 11, 12, 14, and 17 plus guide frame 2 for levels 5–12. Reject any screen showing Selectel, real credentials, clipped copy, or a non-Russian practical location.

- [ ] **Step 4: Commit regenerated assets**

```bash
git add app/components/SetupQuestPrototypeScene.tsx app/components/OriginalQuestGuideScene.tsx app/components/MobileExpectedScene.tsx public/screens/server-152fz public/screens-mobile/server-152fz public/guides/server-152fz
git commit -m "feat: add AdminVPS quest screenshots"
```

### Task 5: Full verification and production deployment

**Files:**
- Verify only unless defects are found.

**Interfaces:**
- Consumes: completed discovery and AdminVPS changes.
- Produces: saved Sites version and successful production deployment.

- [ ] **Step 1: Run full local gates**

Run: `npm run lint`

Expected: PASS.

Run: `npm test`

Expected: script tests, all unit tests, and production build PASS.

Run: `npm run verify:screens`

Expected: all 2449 PNGs pass.

- [ ] **Step 2: Push exact HEAD to the configured Sites repository**

Read `.openai/hosting.json`, request a short-lived credential, and push HEAD to the configured main branch without persisting the token.

- [ ] **Step 3: Save and deploy a new Sites version**

Save the exact full commit SHA, deploy the saved version, and poll until `succeeded`.

- [ ] **Step 4: Live smoke test**

Open `/`, `/?format=mobile`, and `/?quest=server-152fz` in an authenticated browser. Verify sorting, difficulty/goal filters, promo image, promo copy button, AdminVPS link, downloadable PDF, level progression, Russian location warning, and API-keys link.

- [ ] **Step 5: Report the production URL and evidence**

Report the version number, production URL, test counts, screenshot count, and the exact three live routes checked.
