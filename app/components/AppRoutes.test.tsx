import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProject, getQuestProject } from "../content/projects";
import { loadDashboardSection, loadLastActiveProject, saveDashboardSection } from "../lib/academy-dashboard";
import { outputChoiceKey } from "../lib/output-format";
import { AppEntry } from "./AppEntry";
import { MobileQuest } from "./MobileQuest";
import { Quest } from "./Quest";

Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });

describe("bundle format routing", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 1024 });
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

  it("normalizes old links and safely returns unknown links to the dashboard", async () => {
    window.history.replaceState({}, "", "/?quest=planner-bot");
    const { unmount } = render(<AppEntry />);
    expect(await screen.findByRole("heading", { name: "Планирование" })).toBeInTheDocument();
    expect(screen.getByText(/Формат: ИИ-агент/i)).toBeInTheDocument();
    await waitFor(() => expect(window.location.search).toBe("?quest=planning&output=agent"));
    unmount();

    window.history.replaceState({}, "", "/?quest=missing-project");
    render(<AppEntry />);
    expect(await screen.findByText(/ваш следующий шаг/i)).toBeInTheDocument();
  });

  it("returns computer-only setup links to the mobile project track", async () => {
    window.history.replaceState({}, "", "/?format=mobile&quest=install-codex");
    render(<AppEntry />);

    expect(await screen.findByRole("heading", { level: 1, name: "Планирование" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /выберите компьютер/i })).not.toBeInTheDocument();
    await waitFor(() => expect(window.location.search).toBe("?format=mobile"));
  });

  it("navigates dashboard sections without breaking quest links", async () => {
    render(<AppEntry />);
    fireEvent.click(await screen.findByRole("button", { name: "Мои проекты" }));
    await waitFor(() => expect(window.location.search).toBe("?section=projects"));

    fireEvent.click(screen.getByRole("button", { name: "Маршрут и библиотека" }));
    await waitFor(() => expect(window.location.search).toBe("?section=weeks"));

    fireEvent.change(screen.getByRole("searchbox", { name: /найти проект/i }), { target: { value: "давление" } });
    fireEvent.submit(screen.getByRole("search"));
    await waitFor(() => expect(window.location.search).toBe("?section=weeks&q=%D0%B4%D0%B0%D0%B2%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5"));
  });

  it.each([
    "?capture=planner--step-01",
    "?capture-cover=planner",
    "?capture-mobile=planner--step-01",
    "?capture-guide=planner--demo--step-01--frame-01",
  ])("keeps the capture route %s outside the learning shell", async (search) => {
    window.history.replaceState({}, "", `/${search}`);
    const { container } = render(<AppEntry />);
    await waitFor(() => expect(container.querySelector("[data-learning-shell]")).toBeNull());
  });

  it("renders the project-specific finished result on the cover route", async () => {
    window.history.replaceState({}, "", "/?capture-cover=pressure-diary");
    const { container } = render(<AppEntry />);
    await waitFor(() => expect(container.querySelector('[data-cover-marker="pressure-history-log"]')).not.toBeNull());
    expect(container.querySelector(".publish-scene")).toBeNull();
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

  it("does not restore a saved section when popstate returns to the canonical home URL", async () => {
    saveDashboardSection("portfolio", localStorage);
    window.history.replaceState({}, "", "/?section=weeks");
    render(<AppEntry />);
    expect(await screen.findByRole("button", { name: "Маршрут и библиотека", current: "page" })).toBeInTheDocument();

    window.history.replaceState({}, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(await screen.findByRole("button", { name: "Главная", current: "page" })).toBeInTheDocument();
  });

  it.each([
    ["/?section=unknown", ""],
    ["/?section=home", ""],
    ["/?format=mobile&section=unknown&q=%D0%B4%D0%B0%D0%B2%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5", "?format=mobile&q=%D0%B4%D0%B0%D0%B2%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5"],
    ["/?format=mobile&section=home&q=%D0%B4%D0%B0%D0%B2%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5", "?format=mobile&q=%D0%B4%D0%B0%D0%B2%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5"],
  ])("canonicalizes dashboard route %s without losing meaningful query values", async (url, canonicalSearch) => {
    window.history.replaceState({}, "", url);
    render(<AppEntry />);

    expect(await screen.findByRole("button", { name: "Главная", current: "page" })).toBeInTheDocument();
    await waitFor(() => expect(window.location.search).toBe(canonicalSearch));
  });

  it("saves explicit home before canonicalizing its URL", async () => {
    saveDashboardSection("portfolio", localStorage);
    window.history.replaceState({}, "", "/?section=home");
    const view = render(<AppEntry />);

    await waitFor(() => expect(window.location.search).toBe(""));
    expect(loadDashboardSection(localStorage)).toBe("home");
    view.unmount();

    render(<AppEntry />);
    expect(await screen.findByRole("button", { name: "Главная", current: "page" })).toBeInTheDocument();
  });

  it.each([
    [{ submarineImplicitFormat: true }, "/?format=mobile&section=weeks", 1024, "?section=weeks", "desktop"],
    [{ submarineImplicitFormat: true }, "/?section=weeks", 375, "?format=mobile&section=weeks", "mobile"],
  ] as const)("canonicalizes an implicit history entry on popstate without taking format ownership", async (state, url, width, expectedSearch, expectedFormat) => {
    render(<AppEntry />);
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
    window.history.replaceState(state, "", url);
    window.dispatchEvent(new PopStateEvent("popstate", { state }));

    await waitFor(() => expect(window.location.search).toBe(expectedSearch));
    expect(document.querySelector(`[data-learning-shell].learning-shell-${expectedFormat}`)).not.toBeNull();

    const nextWidth = width === 375 ? 1024 : 375;
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: nextWidth });
    window.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(document.querySelector(`[data-learning-shell].learning-shell-${expectedFormat === "mobile" ? "desktop" : "mobile"}`)).not.toBeNull());
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

  it.each([
    ["?capture=planner--step-01", 'id="capture-scene"'],
    ["?capture-mobile=planner--step-01", 'id="capture-scene"'],
    ["?capture-guide=planner--demo--step-01--frame-01", 'id="capture-guide-scene"'],
  ])("renders the capture route %s without the learning shell in initial server HTML", (initialSearch, marker) => {
    const html = renderToString(<AppEntry initialSearch={initialSearch} />);
    expect(html).toContain(marker);
    expect(html).not.toContain("data-learning-shell");
  });

  it("renders a normal home shell in initial server HTML", () => {
    expect(() => renderToString(<AppEntry />)).not.toThrow();
    expect(renderToString(<AppEntry />)).toContain("data-learning-shell");
  });
});
