# Project Card Identities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить каждой карточке проекта уникальный предметный стикер, не заменяя существующий прототип результата.

**Architecture:** Визуальная идентичность хранится в отдельном типизированном реестре по `slug`. `ProjectPreview` получает идентичность через чистую функцию и выводит один общий доступный слой; CSS отвечает только за форму, позицию и адаптивность.

**Tech Stack:** React 19, TypeScript, CSS, Node test runner, Vitest, Playwright/IAB.

## Global Constraints

- Все 49 конкретных проектов и 7 объединённых карточек должны иметь тематическую идентичность.
- Прототип результата остаётся главным изображением и не регенерируется.
- Комбинация подписи, знака, цвета и формы не повторяется.
- На телефоне текст стикера не меньше 11 px, на компьютере не меньше 12 px.
- Стикер не перекрывает `figcaption`, кнопки и заголовок карточки.
- Новые элементы не создают горизонтальный скролл на 375 px.

---

### Task 1: Реестр визуальных идентичностей

**Files:**
- Create: `app/content/project-card-identities.ts`
- Create: `app/content/project-card-identities.test.ts`

**Interfaces:**
- Consumes: `CatalogProject`, `captureProjectSlugs`, `projectBundleSeeds`.
- Produces: `ProjectCardIdentity`, `ProjectCardStickerShape`, `getProjectCardIdentity(project)`.

- [ ] **Step 1: Write the failing test**

Проверить, что реестр покрывает все конкретные и объединённые `slug`, каждая подпись содержит 1–3 слова, а сериализованная комбинация `label|glyph|accent|shape|corner` уникальна.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- app/content/project-card-identities.test.ts`

Expected: FAIL, потому что модуль `project-card-identities` ещё не существует.

- [ ] **Step 3: Write minimal implementation**

Создать типы:

```ts
export type ProjectCardStickerShape = "receipt" | "label" | "seal" | "ticket" | "bookmark" | "cloud";

export type ProjectCardIdentity = {
  label: string;
  glyph: string;
  accent: string;
  shape: ProjectCardStickerShape;
  tilt: number;
  corner: "left" | "right";
};

export function getProjectCardIdentity(project: CatalogProject): ProjectCardIdentity;
```

Заполнить явный реестр для 56 допустимых `slug`; fallback строить из `project.symbol` и `project.title`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- app/content/project-card-identities.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/content/project-card-identities.ts app/content/project-card-identities.test.ts
git commit -m "feat: define unique project card identities"
```

### Task 2: Стикер в общей обложке проекта

**Files:**
- Modify: `app/components/ProjectPreview.tsx`
- Modify: `app/components/App.test.tsx`
- Modify: `scripts/project-cards.test.mjs`

**Interfaces:**
- Consumes: `getProjectCardIdentity(project)` from Task 1.
- Produces: `.project-preview-sticker`, `data-project-identity`, CSS variables `--project-sticker-accent` and `--project-sticker-tilt`.

- [ ] **Step 1: Write the failing tests**

В `App.test.tsx` проверить видимые подписи «Учёт расходов» и «Модератор вебинара». В script test проверить общий sticker-класс, CSS variables, `aria-hidden` у glyph и отсутствие старых скриншотов.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- app/components/App.test.tsx && node --test scripts/project-cards.test.mjs`

Expected: FAIL на отсутствующем sticker markup.

- [ ] **Step 3: Write minimal component implementation**

В обеих ветках `ProjectPreview` вывести:

```tsx
<span className={`project-preview-sticker sticker-${identity.shape} sticker-${identity.corner}`}>
  <b aria-hidden="true">{identity.glyph}</b>
  <span>{identity.label}</span>
</span>
```

Задать `data-project-identity={project.slug}` и типизированные CSS variables через `CSSProperties`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- app/components/App.test.tsx && node --test scripts/project-cards.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/ProjectPreview.tsx app/components/App.test.tsx scripts/project-cards.test.mjs
git commit -m "feat: show thematic stickers on project cards"
```

### Task 3: Формы, палитры и мобильная адаптация

**Files:**
- Modify: `app/pink-learning-dashboard.css`
- Modify: `scripts/project-cards.test.mjs`

**Interfaces:**
- Consumes: sticker classes and CSS variables from Task 2.
- Produces: desktop/mobile shapes, safe spacing, AA contrast and reduced-motion behavior.

- [ ] **Step 1: Add failing CSS contract tests**

Проверить минимальный размер шрифта 12 px, мобильный 11 px, `max-width`, `z-index`, отдельные формы, правила левого/правого угла, reduced-motion и отсутствие изменения размеров заголовков.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/project-cards.test.mjs`

Expected: FAIL на отсутствующих Pink Cloud sticker-правилах.

- [ ] **Step 3: Implement the CSS**

Добавить стили с непрозрачной светлой подложкой, цветным знаком, `max-width: min(70%, 230px)`, различными `clip-path`/`border-radius`, лёгким наклоном и компактным мобильным размером. Для bundle-карточек разместить sticker над общей двойной обложкой.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/project-cards.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/pink-learning-dashboard.css scripts/project-cards.test.mjs
git commit -m "style: differentiate every project card"
```

### Task 4: Проверка, публикация и живой контроль

**Files:**
- Modify only if verification reveals a defect.

**Interfaces:**
- Consumes: completed cards from Tasks 1–3.
- Produces: verified build and deployed site.

- [ ] **Step 1: Run focused and full automated checks**

Run: `npm run test:unit && npm run test:scripts && npm run lint && npm run build && git diff --check`

Expected: all commands exit 0.

- [ ] **Step 2: Browser QA**

Проверить `section=weeks` и `section=portfolio` на 1440, 768 и 375 px. Для каждой недели собрать `slug`, подпись, знак, цвет, форму, загрузку изображения и overflow. Все карточки должны иметь уникальную комбинацию и тематическую подпись.

- [ ] **Step 3: Publish**

Сохранить новую версию Sites, развернуть её в существующем проекте Академии и дождаться статуса `succeeded`.

- [ ] **Step 4: Verify production**

На живом URL проверить минимум семейный бюджет, планирование, карусельщика, модератора вебинаров и сайт эксперта на desktop и phone. Подтвердить загрузку обложек, жирные заголовки и отсутствие горизонтального overflow.

