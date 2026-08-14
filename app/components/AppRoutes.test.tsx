import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProject, getQuestProject } from "../content/projects";
import { loadLastActiveProject, saveDashboardSection } from "../lib/academy-dashboard";
import { outputChoiceKey } from "../lib/output-format";
import { AppEntry } from "./AppEntry";
import { MobileQuest } from "./MobileQuest";
import { Quest } from "./Quest";

Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });

describe("bundle format routing", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("asks for the result format before asking about data", () => {
    render(<Quest project={getProject("planning")!} onHome={vi.fn()} />);
    expect(screen.getByRole("heading", { name: /что вы хотите создать/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /выбрать сервис/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /выбрать ИИ-агента/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /на каких данных/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /не знаю, что выбрать/i }));
    expect(screen.getByText(/в сервисе вы нажимаете кнопки/i)).toBeInTheDocument();
    expect(screen.getByText(/агент понимает текст и голос/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /выбрать ИИ-агента/i }));
    expect(screen.getByRole("heading", { name: /на каких данных/i })).toBeInTheDocument();
    expect(localStorage.getItem(outputChoiceKey("planning", "desktop"))).toBe('"agent"');
  });

  it("keeps mobile format choice separate and lets standalone projects start with data", () => {
    const { unmount } = render(<MobileQuest project={getProject("planning")!} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /выбрать сервис/i }));
    expect(localStorage.getItem(outputChoiceKey("planning", "mobile"))).toBe('"service"');
    expect(localStorage.getItem(outputChoiceKey("planning", "desktop"))).toBeNull();
    unmount();

    render(<Quest project={getQuestProject("pressure-diary")!} onHome={vi.fn()} />);
    expect(screen.getByRole("heading", { name: /на каких данных/i })).toBeInTheDocument();
  });

  it("normalizes old links and safely returns unknown links to the catalogue", async () => {
    window.history.replaceState({}, "", "/?quest=planner-bot");
    const { unmount } = render(<AppEntry />);
    expect(await screen.findByRole("heading", { name: "Планирование" })).toBeInTheDocument();
    expect(screen.getByText(/Формат: ИИ-агент/i)).toBeInTheDocument();
    await waitFor(() => expect(window.location.search).toBe("?quest=planning&output=agent"));
    unmount();

    window.history.replaceState({}, "", "/?quest=missing-project");
    render(<AppEntry />);
    expect(await screen.findByRole("heading", { name: /выбери проект/i })).toBeInTheDocument();
  });

  it("navigates dashboard sections without breaking quest links", async () => {
    render(<AppEntry />);
    fireEvent.click(await screen.findByRole("button", { name: "Мои проекты" }));
    await waitFor(() => expect(window.location.search).toBe("?section=projects"));

    fireEvent.click(screen.getByRole("button", { name: "Квесты по неделям" }));
    await waitFor(() => expect(window.location.search).toBe("?section=weeks"));

    fireEvent.change(screen.getByRole("searchbox", { name: /найти проект/i }), { target: { value: "давление" } });
    fireEvent.submit(screen.getByRole("search"));
    await waitFor(() => expect(window.location.search).toBe("?section=weeks&q=%D0%B4%D0%B0%D0%B2%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5"));
  });

  it.each([
    "?capture=planner--step-01",
    "?capture-mobile=planner--step-01",
    "?capture-guide=planner--demo--step-01--frame-01",
  ])("keeps the capture route %s outside the learning shell", async (search) => {
    window.history.replaceState({}, "", `/${search}`);
    const { container } = render(<AppEntry />);
    await waitFor(() => expect(container.querySelector("[data-learning-shell]")).toBeNull());
  });

  it("restores a saved section only when section is absent and ignores unknown section values", async () => {
    saveDashboardSection("portfolio", localStorage);
    const { unmount } = render(<AppEntry />);
    expect(await screen.findByRole("button", { name: "Портфолио", current: "page" })).toBeInTheDocument();
    unmount();

    window.history.replaceState({}, "", "/?section=unknown");
    render(<AppEntry />);
    expect(await screen.findByRole("button", { name: "Главная", current: "page" })).toBeInTheDocument();
  });

  it("changes only the dashboard format and preserves section and search", async () => {
    window.history.replaceState({}, "", "/?section=weeks&q=%D0%B4%D0%B0%D0%B2%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5");
    render(<AppEntry />);

    fireEvent.click(await screen.findByRole("button", { name: "Открыть версию для телефона" }));
    await waitFor(() => expect(window.location.search).toBe("?format=mobile&section=weeks&q=%D0%B4%D0%B0%D0%B2%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5"));
  });

  it("preserves the current quest while switching format and records its surface", async () => {
    window.history.replaceState({}, "", "/?quest=planning&output=agent");
    render(<AppEntry />);
    expect(await screen.findByRole("heading", { name: "Планирование" })).toBeInTheDocument();
    await waitFor(() => expect(loadLastActiveProject("desktop", localStorage)).toBe("planning"));

    fireEvent.click(screen.getByRole("button", { name: "Открыть версию для телефона" }));
    await waitFor(() => expect(window.location.search).toBe("?format=mobile&quest=planning&output=agent"));
    await waitFor(() => expect(loadLastActiveProject("mobile", localStorage)).toBe("planning"));
  });

  it("renders an SSR-safe initial learning shell", () => {
    expect(() => renderToString(<AppEntry />)).not.toThrow();
    expect(renderToString(<AppEntry />)).toContain("data-learning-shell");
  });
});
