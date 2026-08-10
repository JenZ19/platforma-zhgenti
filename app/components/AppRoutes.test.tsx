import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProject, getQuestProject } from "../content/projects";
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
});
