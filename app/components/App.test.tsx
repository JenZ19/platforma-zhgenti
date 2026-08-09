import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProject } from "../content/projects";
import { preparationKey } from "../lib/preparation";
import { progressKey } from "../lib/progress";
import { Academy } from "./Academy";
import { AppEntry } from "./AppEntry";
import { MobileQuest } from "./MobileQuest";
import { ProjectCard } from "./ProjectCard";
import { Quest } from "./Quest";

Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});
Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });

describe("academy interface", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/");
  });

  it("shows all 52 course projects", () => {
    render(<Academy />);
    expect(screen.getAllByRole("link", { name: /открыть квест/i })).toHaveLength(52);
    expect(screen.getByText("52 проекта")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /версия только с телефона/i })).toHaveAttribute("href", "?format=mobile");
  });

  it("filters the catalogue by week and search", () => {
    render(<Academy />);
    fireEvent.click(screen.getByRole("button", { name: /неделя 2/i }));
    const catalogue = screen.getByRole("region", { name: /каталог проектов/i });
    expect(within(catalogue).getAllByRole("link", { name: /открыть квест/i })).toHaveLength(13);
    fireEvent.change(screen.getByRole("searchbox", { name: /найти проект/i }), { target: { value: "психолог" } });
    expect(within(catalogue).getByText(/ничего не найдено/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /все проекты/i }));
    expect(within(catalogue).getAllByRole("link", { name: /открыть квест/i })).toHaveLength(1);
  });

  it("unlocks quest levels sequentially and saves project-specific progress", () => {
    const project = getProject("planner")!;
    render(<Quest project={project} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
    expect(screen.getAllByRole("button", { name: /уровень/i })).toHaveLength(17);
    expect(screen.getByRole("button", { name: /уровень 2/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /я сделала/i }));
    expect(screen.getByRole("button", { name: /уровень 2/i })).toBeEnabled();
    expect(localStorage.getItem(progressKey("planner"))).toContain('"completed":[1]');
  });

  it("opens contextual help inside a quest", () => {
    const project = getProject("recipe-book")!;
    render(<Quest project={project} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
    fireEvent.click(screen.getByRole("button", { name: /нужна помощь/i }));
    expect(screen.getByText(/не получается создать папку/i)).toBeInTheDocument();
  });

  it("hydrates project cards without changing saved progress during hydration", async () => {
    const project = getProject("planner")!;
    localStorage.setItem(progressKey("planner"), JSON.stringify({ completed: [1, 2], activeStep: 3, score: 20 }));
    const html = renderToString(<ProjectCard project={project} />);
    expect(html).toContain("Не начато");
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let root: ReturnType<typeof hydrateRoot>;
    await act(async () => { root = hydrateRoot(container, <ProjectCard project={project} />); });
    expect(error).not.toHaveBeenCalled();
    await act(async () => root!.unmount());
    container.remove();
    error.mockRestore();
  });

  it("asks for a data mode before opening each quest", () => {
    render(<Quest project={getProject("planner")!} onHome={vi.fn()} />);
    expect(screen.getByRole("heading", { name: /на каких данных будем работать/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /уровень 1:/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
    expect(screen.getAllByRole("button", { name: /уровень/i })).toHaveLength(17);
    expect(localStorage.getItem(preparationKey("planner"))).toContain('"mode":"demo"');
  });

  it("blocks a real-data quest until its personal checklist is complete", () => {
    render(<Quest project={getProject("psychologist-site")!} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на реальных данных/i }));
    const checks = screen.getAllByRole("checkbox");
    expect(checks.length).toBeGreaterThanOrEqual(7);
    const start = screen.getByRole("button", { name: /папка готова — начать квест/i });
    expect(start).toBeDisabled();
    checks.forEach((check) => fireEvent.click(check));
    expect(start).toBeEnabled();
    fireEvent.click(start);
    expect(screen.getAllByRole("button", { name: /уровень/i })).toHaveLength(17);
    expect(localStorage.getItem(preparationKey("psychologist-site"))).toContain('"ready":true');
  });

  it("opens a separate phone-only academy from the mobile format route", async () => {
    window.history.replaceState({}, "", "/?format=mobile");
    render(<AppEntry />);
    expect(await screen.findByRole("heading", { name: /академия с телефона/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /открыть мобильный квест/i })).toHaveLength(52);
  });

  it("stores phone progress separately and shows a safe Telegram fallback", () => {
    const project = getProject("family-expenses")!;
    render(<MobileQuest project={project} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
    expect(screen.getByRole("heading", { name: /фея открыта в telegram/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /открыть фею в telegram/i })).toBeDisabled();
    expect(screen.getByText(/бот подключается куратором/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /я сделала/i }));
    expect(localStorage.getItem(progressKey("mobile:family-expenses"))).toContain('"completed":[1]');
    expect(localStorage.getItem(progressKey("family-expenses"))).toBeNull();
  });
});
