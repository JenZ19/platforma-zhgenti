# Unified Client Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Объединить пять повторяющихся клиентских ИИ-агентов в один квест с полным клиентским путём.

**Architecture:** Каноническим проектом остаётся `client-care-agent`; четыре старых slug удаляются из реестра и становятся маршрутными алиасами. Общие генераторы квеста, мобильного режима, кастомизации и подготовки получают объединённое содержание из `ProjectDefinition` и `AgentContract`.

**Tech Stack:** Next.js, React, TypeScript, Vitest, Node.js scripts, Playwright capture scripts.

## Global Constraints

- Один каталоговый проект вместо пяти повторяющихся карточек.
- Внутри одного агента: заявка, уточнение, подбор, запись, продажа и сопровождение.
- `administrator-agent` остаётся отдельным проектом.
- Старые публичные ссылки открывают новый объединённый квест.
- Компьютерный и мобильный путь сохраняют 17 уровней.

---

### Task 1: Зафиксировать объединение тестами

**Files:**
- Modify: `app/content/projects.test.ts`
- Modify: `app/content/agent-contracts.test.ts`
- Modify: `app/content/project-routes.test.ts`

- [ ] Добавить проверки единственной карточки, пяти функций и алиасов.
- [ ] Запустить целевые тесты и увидеть ожидаемое падение на старом реестре.

### Task 2: Объединить реестр и контракт агента

**Files:**
- Modify: `app/content/projects.ts`
- Modify: `app/content/agent-contracts.ts`
- Modify: `app/content/preparation/week-3.ts`
- Modify: `app/content/discovery.ts`
- Modify: `app/content/project-routes.ts`

- [ ] Удалить четыре повторяющихся определения.
- [ ] Расширить `client-care-agent` до полного клиентского пути.
- [ ] Перенаправить старые slug на `client-care-agent`.
- [ ] Запустить целевые тесты до зелёного результата.

### Task 3: Синхронизировать платформу и экраны

**Files:**
- Modify: `app/components/Academy.tsx`
- Modify: `app/components/MobileAcademy.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Modify: `scripts/projects.mjs`
- Modify: `scripts/projects.test.mjs`
- Modify: `scripts/verify-screens.mjs`
- Modify: tests containing project totals

- [ ] Обновить количество проектов и уровней.
- [ ] Пересобрать desktop/mobile экраны объединённого проекта.
- [ ] Запустить unit, script, lint, build и проверку PNG.
- [ ] Проверить локальную страницу в браузере: одна объединённая карточка, старых четырёх нет.
