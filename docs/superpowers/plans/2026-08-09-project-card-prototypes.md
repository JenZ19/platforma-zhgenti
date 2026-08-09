# Project Card Prototypes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a clear prototype of the completed result on every project card in both catalogues.

**Architecture:** A focused `ProjectPreview` component derives the existing level-14 screenshot path from each project slug. `ProjectCard` and `MobileAcademy` reuse it, while shared CSS crops the instructional screenshot around the finished interface.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Testing Library, vinext.

## Global Constraints

- Use the existing `/screens/<slug>/step-14.png` assets; do not generate decorative illustrations.
- Render all 52 prototypes in both desktop and phone-only catalogues.
- Keep current filters, progress state, card copy, and quest links unchanged.
- Load prototype images lazily and provide useful Russian alternative text.

---

### Task 1: Prototype component and desktop cards

**Files:**
- Create: `app/components/ProjectPreview.tsx`
- Modify: `app/components/ProjectCard.tsx`
- Test: `app/components/App.test.tsx`

**Interfaces:**
- Consumes: `ProjectDefinition` with `slug`, `title`, and `kind`.
- Produces: `ProjectPreview({ project }: { project: ProjectDefinition })`.

- [ ] **Step 1: Write the failing desktop test**

Add a test that renders `Academy`, expects 52 images named `Прототип результата проекта`, and checks that the family-expenses image uses `/screens/family-expenses/step-14.png`.

```tsx
it("shows the finished prototype on every desktop project card", () => {
  render(<Academy />);
  const previews = screen.getAllByRole("img", { name: /прототип результата проекта/i });
  expect(previews).toHaveLength(52);
  expect(screen.getByRole("img", { name: /учёт расходов семьи/i })).toHaveAttribute(
    "src",
    "/screens/family-expenses/step-14.png",
  );
});
```

- [ ] **Step 2: Run the test and confirm the missing-image failure**

Run: `npm run test:unit -- --run app/components/App.test.tsx`

Expected: FAIL because no image has the accessible name `Прототип результата проекта`.

- [ ] **Step 3: Implement the reusable preview**

Create `ProjectPreview.tsx`:

```tsx
import type { ProjectDefinition } from "../content/types";

export function ProjectPreview({ project }: { project: ProjectDefinition }) {
  return (
    <figure className={`project-preview project-preview-${project.kind}`}>
      <img
        src={`/screens/${project.slug}/step-14.png`}
        alt={`Прототип результата проекта «${project.title}»`}
        loading="lazy"
      />
      <figcaption><span>✦</span> Прототип результата</figcaption>
    </figure>
  );
}
```

Import the component in `ProjectCard.tsx` and place `<ProjectPreview project={project} />` as the first child of `<article>`.

- [ ] **Step 4: Run the focused test**

Run: `npm run test:unit -- --run app/components/App.test.tsx`

Expected: PASS.

---

### Task 2: Phone-only catalogue

**Files:**
- Modify: `app/components/MobileAcademy.tsx`
- Test: `app/components/App.test.tsx`

**Interfaces:**
- Consumes: `ProjectPreview` from Task 1.
- Produces: 52 identical result prototypes inside mobile project cards.

- [ ] **Step 1: Write the failing mobile test**

Extend the existing phone-route test:

```tsx
expect(screen.getAllByRole("img", { name: /прототип результата проекта/i })).toHaveLength(52);
expect(screen.getByRole("img", { name: /учёт расходов семьи/i })).toHaveAttribute(
  "src",
  "/screens/family-expenses/step-14.png",
);
```

- [ ] **Step 2: Run the test and confirm it finds no mobile prototypes**

Run: `npm run test:unit -- --run app/components/App.test.tsx`

Expected: FAIL with zero matching images on the mobile route.

- [ ] **Step 3: Reuse the preview in mobile cards**

Import `ProjectPreview` in `MobileAcademy.tsx` and place it before the card header:

```tsx
<article className="mobile-project-card" key={project.slug}>
  <ProjectPreview project={project} />
  <header><span>{project.symbol}</span><small>{completed ? `${completed}/17` : `Неделя ${project.week}`}</small></header>
  <div className={`mobile-capability ${capability.id}`}>{capability.label}</div>
  <h3>{project.title}</h3>
  <p>{project.outcome}</p>
  <footer><span>{capability.detail}</span><a href={`?format=mobile&quest=${project.slug}`} onClick={(event) => open(event, project.slug)} aria-label={`Открыть мобильный квест: ${project.title}`}>Открыть мобильный квест →</a></footer>
</article>
```

- [ ] **Step 4: Run the focused test**

Run: `npm run test:unit -- --run app/components/App.test.tsx`

Expected: PASS.

---

### Task 3: Prototype framing and responsive polish

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `.project-preview` markup from Task 1.
- Produces: a readable 16:10 crop on desktop, tablet, and mobile cards.

- [ ] **Step 1: Add the shared visual frame**

Add styles that make the prototype the first visual element, zoom the level screenshot into its working area, and keep the result label legible:

```css
.project-preview { position:relative; height:180px; margin:-24px -24px 22px; overflow:hidden; border-radius:23px 23px 17px 17px; background:#eee7df; border-bottom:1px solid var(--line); }
.project-preview img { position:absolute; width:142%; max-width:none; height:auto; left:50%; top:42%; transform:translate(-50%,-50%); display:block; }
.project-preview figcaption { position:absolute; left:12px; bottom:11px; display:flex; align-items:center; gap:5px; padding:7px 10px; border-radius:999px; background:rgba(250,247,242,.94); color:var(--ink); box-shadow:0 5px 18px rgba(38,34,30,.08); font-size:7px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
.project-preview figcaption span { color:var(--gold); }
.mobile-project-card .project-preview { height:185px; margin:-23px -23px 19px; border-radius:27px 27px 18px 18px; }
.project-card { min-height:500px; }
.mobile-project-card { min-height:515px; }
```

- [ ] **Step 2: Run complete validation**

Run: `npm run test:unit -- --maxWorkers=1 && npm run build && npm run lint && npm run verify:screens && git diff --check`

Expected: 39 tests pass, production build succeeds, lint reports no errors, and all screenshot assets verify.

- [ ] **Step 3: Commit the implementation**

```bash
git add app/components/ProjectPreview.tsx app/components/ProjectCard.tsx app/components/MobileAcademy.tsx app/components/App.test.tsx app/globals.css
git commit -m "feat: show result prototypes on project cards"
```

- [ ] **Step 4: Publish and inspect both catalogues**

Publish the validated source to the existing private Sites project. Check `/` and `/?format=mobile` at desktop and phone widths, confirm that each visible card starts with a readable result prototype, and confirm search and week filters still work.
