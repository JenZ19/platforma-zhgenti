import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProject } from "../content/projects";
import { progressKey } from "../lib/progress";
import { Academy } from "./Academy";
import { Quest } from "./Quest";

Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});
Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });

describe("academy interface", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("shows all 52 course projects", () => {
    render(<Academy />);
    expect(screen.getAllByRole("link", { name: /открыть квест/i })).toHaveLength(52);
    expect(screen.getByText("52 проекта")).toBeInTheDocument();
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
    expect(screen.getAllByRole("button", { name: /уровень/i })).toHaveLength(17);
    expect(screen.getByRole("button", { name: /уровень 2/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /я сделала/i }));
    expect(screen.getByRole("button", { name: /уровень 2/i })).toBeEnabled();
    expect(localStorage.getItem(progressKey("planner"))).toContain('"completed":[1]');
  });

  it("opens contextual help inside a quest", () => {
    const project = getProject("recipe-book")!;
    render(<Quest project={project} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /нужна помощь/i }));
    expect(screen.getByText(/не получается создать папку/i)).toBeInTheDocument();
  });
});
