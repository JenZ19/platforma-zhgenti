import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MobileQuest } from "./MobileQuest";
import { DashboardHome } from "./DashboardHome";
import { DashboardPortfolio } from "./DashboardPortfolio";
import { projects, getQuestProject, questProjects } from "../content/projects";
import { buildDashboardSnapshot } from "../lib/academy-dashboard";
import { preparationKey } from "../lib/preparation";
import { buildMobileQuest } from "../content/mobile";
import { buildQuest } from "../content/quests";
import { saveSetupPlatform } from "../lib/setup-platform";
import { loadProgress } from "../lib/progress";

Object.defineProperty(window, "scrollTo", { configurable: true, writable: true, value: vi.fn() });

afterEach(() => { cleanup(); localStorage.clear(); });

it("keeps the route ahead of closed settings and avoids a misleading helper cover", () => {
  const { container } = render(<DashboardHome snapshot={buildDashboardSnapshot(projects, localStorage, "mobile")} format="mobile" onOpen={vi.fn()} onSave={vi.fn()} />);
  expect(container.querySelector(".learning-setup")).not.toHaveAttribute("open");
  expect(within(screen.getByRole("region", { name: "Ваш помощник — Феечка" })).queryByRole("img")).toBeNull();
  expect(container.querySelector("#home-course-route")!.compareDocumentPosition(container.querySelector("#home-learning-setup")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it("shows the task before its command, with one bot link and no repeated cover", async () => {
  const fetcher = vi.spyOn(globalThis,"fetch").mockResolvedValue({ok:true,json:async()=>({url:"https://t.me/student_fairy_bot"})} as Response);
  localStorage.setItem(preparationKey("mobile:planner"), JSON.stringify({ version: 1, mode: "demo", checked: [], ready: true }));
  const { container } = render(<MobileQuest project={getQuestProject("planner")!} onHome={vi.fn()} />);
  const workbench = await screen.findByRole("region", { name: "Действие этого шага" });
  expect(container.querySelector("#lesson-action")!.compareDocumentPosition(workbench) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(await screen.findAllByRole("link", { name: /Открыть Феечку/ })).toHaveLength(1);
  expect(container.querySelector("[data-result-showcase]")).toBeNull();
  expect(screen.getByRole("button", { name: "Посмотреть следующий шаг без отметки" })).not.toBeVisible();
  fireEvent.click(screen.getByText("Посмотреть уроки без выполнения"));
  expect(screen.getByRole("button", { name: "Посмотреть следующий шаг без отметки" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Нужна помощь" }));
  expect(screen.getByText("Спросить куратора об этом шаге")).toBeVisible();
  fetcher.mockRestore();
});

it("removes mobile boilerplate across every track without losing steps or checks", () => {
  for (const project of questProjects) {
    const desktop = buildQuest(project);
    const mobile = buildMobileQuest(project);
    expect(mobile.map(s => s.id), project.slug).toEqual(desktop.map(s => s.id));
    for (const step of mobile) {
      expect(step.expected, `${project.slug}:${step.id}`).toEqual(desktop[step.id - 1].expected);
      if (project.journey !== "setup") {
        expect(step.action).not.toContain("Перенос в Lovable или Чатиум не нужен");
        expect(step.action).not.toContain("Это действие выполняется вами, а не командой помощнику");
        if (step.id > 1) expect(step.action).not.toContain("Устанавливать Codex на телефон не нужно");
      }
    }
  }
});

it.each(questProjects)("reads every mobile lesson of $slug without changing completed work", async project => {
  localStorage.setItem(preparationKey(`mobile:${project.slug}`), JSON.stringify({ version: 1, mode: "demo", checked: [], ready: true }));
  saveSetupPlatform("mobile", "mac", localStorage);
  const { container } = render(<MobileQuest project={project} onHome={vi.fn()} />);
  const steps = buildMobileQuest(project);
  await screen.findByRole("heading", { level: 1, name: steps[0].title });
  fireEvent.click(screen.getByText("Посмотреть уроки без выполнения"));
  for (const step of steps) {
    expect(screen.getByRole("heading", { level: 1, name: step.title })).toBeVisible();
    expect(container.querySelectorAll(".lesson-workbench")).toHaveLength(1);
    expect(container.querySelectorAll(".mobile-result li")).toHaveLength(step.expected.length);
    expect(container.querySelectorAll(".lesson-workbench .workbench-actions > button")).toHaveLength(step.prompt ? 1 : 0);
    if (step.id < steps.length) fireEvent.click(screen.getByRole("button", { name: "Посмотреть следующий шаг без отметки" }));
  }
  expect(loadProgress(`mobile:${project.slug}${project.slug === "install-codex" ? ":mac" : ""}`, localStorage, steps.length).completed).toEqual([]);
});

it("keeps the mobile route when leaving an empty portfolio", () => {
  render(<DashboardPortfolio snapshot={buildDashboardSnapshot(projects, localStorage, "mobile")} format="mobile" onOpen={vi.fn()} />);
  expect(screen.getByRole("link", { name: "Выбрать проект в маршруте →" })).toHaveAttribute("href", "?format=mobile&section=weeks");
});
