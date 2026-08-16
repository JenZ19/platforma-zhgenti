import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { firstCoverPrototypeSlugs, getFirstCoverPrototypeSpec } from "../content/first-cover-prototypes";
import { getThirdCoverPrototypeSpec, thirdCoverPrototypeSlugs } from "../content/third-cover-prototypes";
import { finalCoverPrototypeSlugs, getFinalCoverPrototypeSpec } from "../content/final-cover-prototypes";
import { getQuestProject, isProjectBundle, projects, questProjects } from "../content/projects";
import { buildQuest } from "../content/quests";
import { getPreparationProfile, getPreparationProfileSlugs } from "../content/preparation";
import { buildDashboardSnapshot } from "../lib/academy-dashboard";
import { preparationKey } from "../lib/preparation";
import { getProjectLevelCount, progressKey } from "../lib/progress";
import { branchStorageSlug, saveOutputChoice } from "../lib/output-format";
import { customizationKey } from "../lib/customization";
import { Academy } from "./Academy";
import { AppEntry } from "./AppEntry";
import { DashboardHome } from "./DashboardHome";
import { ExpectedScene } from "./ExpectedScene";
import { FairyAssistant } from "./FairyAssistant";
import { MobileAcademy } from "./MobileAcademy";
import { MobileQuest } from "./MobileQuest";
import { MobileExpectedScene } from "./MobileExpectedScene";
import { ProjectCard } from "./ProjectCard";
import { ProjectPreview } from "./ProjectPreview";
import { Quest } from "./Quest";
import { QuestLinks } from "./QuestLinks";
import { QuestPreparation } from "./QuestPreparation";
import { QuestFormatChoice } from "./QuestFormatChoice";
import { InstallCodexPlatformChoice } from "./InstallCodexPlatformChoice";

Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});
Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });

type MockSpeechResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

class MockSpeechRecognition {
  static latest: MockSpeechRecognition | null = null;
  static instances: MockSpeechRecognition[] = [];
  static startError: Error | null = null;
  static stopError: Error | null = null;
  lang = "";
  continuous = false;
  interimResults = false;
  onstart: (() => void) | null = null;
  onresult: ((event: MockSpeechResultEvent) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;

  constructor() {
    MockSpeechRecognition.latest = this;
    MockSpeechRecognition.instances.push(this);
  }

  start() {
    if (MockSpeechRecognition.startError) throw MockSpeechRecognition.startError;
    this.onstart?.();
  }

  stop = vi.fn(() => {
    if (MockSpeechRecognition.stopError) throw MockSpeechRecognition.stopError;
    this.onend?.();
  });

  emitTranscript(text: string) {
    this.onresult?.({ results: [[{ transcript: text }]] });
  }

  emitError(error: string) {
    this.onerror?.({ error });
  }

  emitEnd() {
    this.onend?.();
  }
}

function setSpeechRecognition(value?: typeof MockSpeechRecognition, webkit = false) {
  Object.defineProperty(window, "SpeechRecognition", { configurable: true, writable: true, value: webkit ? undefined : value });
  Object.defineProperty(window, "webkitSpeechRecognition", { configurable: true, writable: true, value: webkit ? value : undefined });
}

const showModalMock = vi.fn(function showModal(this: HTMLDialogElement) {
  this.setAttribute("open", "");
});

const closeDialogMock = vi.fn(function closeDialog(this: HTMLDialogElement) {
  this.removeAttribute("open");
  this.dispatchEvent(new Event("close"));
});

Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, writable: true, value: showModalMock });
Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, writable: true, value: closeDialogMock });

function routeStepFor(project: NonNullable<ReturnType<typeof getQuestProject>>, sourceStep: number): number {
  const index = buildQuest(project).findIndex((step) => step.sourceStepId === sourceStep);
  if (index < 0) throw new Error(`Нет исходного уровня ${sourceStep} у ${project.slug}`);
  return index + 1;
}

function getBundle(slug: string) {
  const project = projects.find((item) => item.slug === slug);
  if (!project || !isProjectBundle(project)) throw new Error(`Нет bundle-проекта ${slug}`);
  return project;
}

describe("academy interface", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/");
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 1024 });
    setSpeechRecognition();
    MockSpeechRecognition.latest = null;
    MockSpeechRecognition.instances = [];
    MockSpeechRecognition.startError = null;
    MockSpeechRecognition.stopError = null;
  });

  it("shows the last active quest as the single primary action", async () => {
    localStorage.setItem("feya-dashboard-v1:last:desktop", "pressure-diary");
    localStorage.setItem(progressKey("pressure-diary"), JSON.stringify({ version: 1, activeStep: 2, completed: [1], score: 10 }));

    const { container } = render(<Academy />);

    expect(await screen.findByRole("heading", { level: 1, name: /дневник давления/i })).toBeInTheDocument();
    expect(container.querySelector(".dashboard-primary-action")).toHaveAccessibleName(/продолжить: дневник давления/i);
    expect(container.querySelector(".dashboard-primary-action")).toHaveAttribute("href", "?quest=pressure-diary");
    expect(container.querySelectorAll(".dashboard-primary-action")).toHaveLength(1);
  });

  it("saves and unsaves a recommended project without reloading", async () => {
    render(<Academy />);
    const card = await screen.findByRole("article", { name: /планирование/i });

    fireEvent.click(within(card).getByRole("button", { name: /сохранить на потом/i }));

    expect(JSON.parse(localStorage.getItem("feya-dashboard-v1:saved")!)).toContain("planning");
    expect(within(card).getByRole("button", { name: /убрать планирование из сохранённых/i })).toHaveTextContent("Сохранено");

    fireEvent.click(within(card).getByRole("button", { name: /убрать планирование из сохранённых/i }));
    expect(JSON.parse(localStorage.getItem("feya-dashboard-v1:saved")!)).not.toContain("planning");
  });

  it("shows factual progress and no more than three started projects", async () => {
    for (const slug of ["pressure-diary", "personal-organizer", "family-health-hub", "content-agent"]) {
      localStorage.setItem(progressKey(slug), JSON.stringify({ version: 1, activeStep: 2, completed: [1], score: 10 }));
    }
    localStorage.setItem("feya-dashboard-v1:last:desktop", "pressure-diary");

    render(<Academy />);

    const started = await screen.findByRole("region", { name: /начатые проекты/i });
    expect(within(started).getAllByRole("article")).toHaveLength(3);
    expect(screen.getByRole("region", { name: /ваш прогресс/i })).toHaveTextContent("Пройдено уровней4");
    expect(within(started).queryByRole("article", { name: /ии-агент для контента/i })).not.toBeInTheDocument();
    const pressure = within(started).getByRole("article", { name: /дневник давления/i });
    expect(within(pressure).getByLabelText(`Пройдено 1 из ${getProjectLevelCount("pressure-diary")}`)).toBeInTheDocument();
  });

  it("recommends only the first four projects of the current week", async () => {
    render(<Academy />);

    const recommendations = await screen.findByRole("region", { name: /рекомендуемый порядок/i });
    expect(within(recommendations).getAllByRole("article")).toHaveLength(4);
    expect(within(recommendations).getByRole("heading", { name: /планирование/i })).toBeInTheDocument();
    expect(within(recommendations).queryByRole("heading", { name: /дневник давления/i })).not.toBeInTheDocument();
  });

  it("uses the same dashboard logic in the mobile academy", async () => {
    window.history.replaceState({}, "", "/?format=mobile");
    render(<AppEntry />);

    expect(await screen.findByText(/ваш следующий шаг/i)).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /навигация Академии на телефоне/i })).toBeInTheDocument();
  });

  it("starts the phone track with a real mobile project and hides computer setup quests", async () => {
    const view = render(<MobileAcademy onOpen={vi.fn()} />);

    expect(await screen.findByRole("heading", { level: 1, name: "Планирование" })).toBeInTheDocument();
    expect(screen.queryByText("Устанавливаем Codex")).not.toBeInTheDocument();
    expect(screen.queryByText("Покупаем сервер по 152-ФЗ")).not.toBeInTheDocument();
    expect(screen.queryByText("Добавляем API-ключи")).not.toBeInTheDocument();

    view.unmount();
    render(<MobileAcademy section="weeks" onOpen={vi.fn()} />);
    expect(await screen.findByRole("heading", { level: 1, name: "Квесты по неделям" })).toBeInTheDocument();
    expect(screen.queryByText("Устанавливаем Codex")).not.toBeInTheDocument();
  });

  it("chooses the mobile quest on a first phone visit without overriding SSR", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 375 });
    const serverHtml = renderToString(<AppEntry initialSearch="?quest=pressure-diary" />);
    expect(serverHtml).toContain("learning-shell-desktop");

    window.history.replaceState({}, "", "/?quest=pressure-diary");
    const { container } = render(<AppEntry initialSearch="?quest=pressure-diary" />);

    await waitFor(() => expect(container.querySelector(".mobile-quest-shell")).not.toBeNull());
    expect(window.location.search).toBe("?format=mobile&quest=pressure-diary");
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
    expect(container.querySelector('[data-quest-workspace="mobile"]')).not.toBeNull();
    expect(screen.getByRole("button", { name: /открыть карту уровней/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /я сделала — продолжить/i })).toBeInTheDocument();
  });

  it("preserves explicit desktop and mobile formats regardless of phone width", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 375 });
    window.history.replaceState({}, "", "/?format=desktop&quest=pressure-diary");
    const view = render(<AppEntry />);

    await waitFor(() => expect(view.container.querySelector(".quest-shell")).not.toBeNull());
    expect(view.container.querySelector(".mobile-quest-shell")).toBeNull();
    expect(window.location.search).toBe("?format=desktop&quest=pressure-diary");

    view.unmount();
    window.history.replaceState({}, "", "/?format=mobile&quest=pressure-diary");
    const mobile = render(<AppEntry />);
    await waitFor(() => expect(mobile.container.querySelector(".mobile-quest-shell")).not.toBeNull());
    expect(window.location.search).toBe("?format=mobile&quest=pressure-diary");
  });

  it("tracks phone orientation only while format remains implicit and cleans up resize", async () => {
    const removeListener = vi.spyOn(window, "removeEventListener");
    window.history.replaceState({}, "", "/?quest=pressure-diary");
    const view = render(<AppEntry />);
    await waitFor(() => expect(view.container.querySelector(".quest-shell")).not.toBeNull());

    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 375 });
    window.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(view.container.querySelector(".mobile-quest-shell")).not.toBeNull());
    expect(window.location.search).toBe("?format=mobile&quest=pressure-diary");

    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 1024 });
    window.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(view.container.querySelector(".quest-shell")).not.toBeNull());
    expect(view.container.querySelector(".mobile-quest-shell")).toBeNull();
    expect(window.location.search).toBe("?quest=pressure-diary");

    view.unmount();
    expect(removeListener).toHaveBeenCalledWith("resize", expect.any(Function));
    removeListener.mockRestore();
  });

  it("keeps dashboard-owned mobile navigation implicit when a quest opens", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 375 });
    const view = render(<AppEntry />);
    await waitFor(() => expect(view.container.querySelector(".learning-shell-mobile")).not.toBeNull());

    const planning = await screen.findByRole("article", { name: /планирование/i });
    fireEvent.click(within(planning).getByRole("link", { name: /начать: планирование/i }));
    await waitFor(() => expect(view.container.querySelector(".format-choice-shell.mobile")).not.toBeNull());
    expect(window.location.search).toBe("?format=mobile&quest=planning");

    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 1024 });
    window.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(view.container.querySelector(".learning-shell-desktop .format-choice-shell")).not.toBeNull());
    expect(window.location.search).toBe("?quest=planning");
  });

  it("keeps an explicitly selected mobile dashboard user-owned after opening a quest", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 375 });
    window.history.replaceState({}, "", "/?format=mobile");
    const view = render(<AppEntry />);
    await waitFor(() => expect(view.container.querySelector(".learning-shell-mobile")).not.toBeNull());

    const planning = await screen.findByRole("article", { name: /планирование/i });
    fireEvent.click(within(planning).getByRole("link", { name: /начать: планирование/i }));
    await waitFor(() => expect(view.container.querySelector(".format-choice-shell.mobile")).not.toBeNull());

    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 1024 });
    window.dispatchEvent(new Event("resize"));
    expect(view.container.querySelector(".learning-shell-mobile")).not.toBeNull();
    expect(window.location.search).toBe("?format=mobile&quest=planning");
  });

  it("keeps explicit format user-owned and exposes a phone escape from explicit desktop", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 375 });
    window.history.replaceState({}, "", "/?format=desktop&quest=pressure-diary");
    const view = render(<AppEntry />);
    await waitFor(() => expect(view.container.querySelector(".quest-shell")).not.toBeNull());

    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 1024 });
    window.dispatchEvent(new Event("resize"));
    expect(view.container.querySelector(".mobile-quest-shell")).toBeNull();
    expect(window.location.search).toBe("?format=desktop&quest=pressure-diary");

    const escape = view.container.querySelector<HTMLButtonElement>(".mobile-format-switch");
    expect(escape).not.toBeNull();
    fireEvent.click(escape!);
    await waitFor(() => expect(view.container.querySelector(".mobile-quest-shell")).not.toBeNull());
    expect(window.location.search).toBe("?format=mobile&quest=pressure-diary");
  });

  it("uses phrasing-only wrappers for preparation and platform choice buttons", () => {
    const preparation = render(<QuestPreparation project={getQuestProject("pressure-diary")!} preparation={{ version: 1, mode: null, checked: [], ready: false }} onChooseDemo={vi.fn()} onChooseReal={vi.fn()} onToggle={vi.fn()} onStartReal={vi.fn()} onBack={vi.fn()} />);
    for (const button of preparation.container.querySelectorAll(".mode-options > button")) {
      expect(button.children).toHaveLength(2);
      expect(button.querySelector(":scope > .mode-option-icon")).not.toBeNull();
      expect(button.querySelector(":scope > .mode-option-content")).not.toBeNull();
      expect(button.querySelector("h1,h2,h3,p,div,b,small")).toBeNull();
    }
    preparation.unmount();

    const bundle = getBundle("planning");
    const format = render(<QuestFormatChoice project={bundle} onChoose={vi.fn()} onHome={vi.fn()} onReset={vi.fn()} />);
    expect(format.container.querySelectorAll(".format-option-content")).toHaveLength(2);
    expect(format.container.querySelector(".format-option h3,.format-option p,.format-option b,.format-option small")).toBeNull();
    format.unmount();

    const install = render(<InstallCodexPlatformChoice project={getQuestProject("install-codex")!} onChoose={vi.fn()} onHome={vi.fn()} />);
    expect(install.container.querySelectorAll(".format-option-content")).toHaveLength(2);
    expect(install.container.querySelector(".format-option h3,.format-option p,.format-option b,.format-option small")).toBeNull();
  });

  it("preserves the mobile format in primary and card hrefs", async () => {
    render(<MobileAcademy onOpen={vi.fn()} />);

    expect(await screen.findByRole("link", { name: /начать квест: планирование/i })).toHaveAttribute(
      "href",
      "?format=mobile&quest=planning",
    );
    const ideas = screen.getByRole("article", { name: /идеи/i });
    expect(within(ideas).getByRole("link", { name: /начать: идеи/i })).toHaveAttribute(
      "href",
      "?format=mobile&quest=ideas",
    );
  });

  it("intercepts ordinary left clicks for dashboard SPA navigation", async () => {
    const onOpen = vi.fn();
    render(<MobileAcademy onOpen={onOpen} />);

    const primary = await screen.findByRole("link", { name: /начать квест: планирование/i });
    expect(fireEvent.click(primary)).toBe(false);
    expect(onOpen).toHaveBeenLastCalledWith("planning");

    const ideas = screen.getByRole("article", { name: /идеи/i });
    const cardAction = within(ideas).getByRole("link", { name: /начать: идеи/i });
    expect(fireEvent.click(cardAction)).toBe(false);
    expect(onOpen).toHaveBeenLastCalledWith("ideas");
  });

  it("leaves modified, middle and new-target dashboard clicks to the browser", async () => {
    const onOpen = vi.fn();
    render(<MobileAcademy onOpen={onOpen} />);

    const primary = await screen.findByRole("link", { name: /начать квест: планирование/i });
    primary.setAttribute("href", "#browser-primary");
    expect(fireEvent.click(primary, { metaKey: true })).toBe(true);
    expect(fireEvent.click(primary, { shiftKey: true })).toBe(true);
    primary.setAttribute("target", "_blank");
    expect(fireEvent.click(primary)).toBe(true);

    const ideas = screen.getByRole("article", { name: /идеи/i });
    const cardAction = within(ideas).getByRole("link", { name: /начать: идеи/i });
    cardAction.setAttribute("href", "#browser-card");
    expect(fireEvent.click(cardAction, { ctrlKey: true })).toBe(true);
    expect(fireEvent.click(cardAction, { altKey: true })).toBe(true);
    expect(fireEvent.click(cardAction, { button: 1 })).toBe(true);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("excludes completed projects before limiting current-week recommendations", () => {
    const selected = projects.filter((project) => ["install-codex", "server-152fz", "api-keys", "pressure-diary", "personal-organizer"].includes(project.slug));
    for (const project of selected.slice(0, 4)) {
      const total = getProjectLevelCount(project);
      localStorage.setItem(progressKey(project.slug), JSON.stringify({
        version: 1,
        activeStep: total,
        completed: Array.from({ length: total }, (_, index) => index + 1),
        score: total * 10,
      }));
    }
    const snapshot = buildDashboardSnapshot(selected, localStorage, "desktop");

    render(<DashboardHome snapshot={snapshot} format="desktop" onOpen={vi.fn()} onSave={vi.fn()} />);

    const recommendations = screen.getByRole("region", { name: /рекомендуемый порядок/i });
    expect(within(recommendations).getAllByRole("article")).toHaveLength(1);
    expect(within(recommendations).getByRole("heading", { name: /личный органайзер/i })).toBeInTheDocument();
  });

  it("routes an all-complete mobile dashboard to portfolio", () => {
    const project = projects.find((item) => item.slug === "pressure-diary")!;
    const total = getProjectLevelCount(project);
    localStorage.setItem(progressKey(`mobile:${project.slug}`), JSON.stringify({
      version: 1,
      activeStep: total,
      completed: Array.from({ length: total }, (_, index) => index + 1),
      score: total * 10,
    }));
    const snapshot = buildDashboardSnapshot([project], localStorage, "mobile");
    const onOpenPortfolio = vi.fn();

    render(<DashboardHome snapshot={snapshot} format="mobile" onOpen={vi.fn()} onSave={vi.fn()} onOpenPortfolio={onOpenPortfolio} />);

    const action = screen.getByRole("link", { name: /открыть портфолио/i });
    expect(action).toHaveAttribute("href", "?format=mobile&section=portfolio");
    action.setAttribute("href", "#browser-portfolio");
    expect(fireEvent.click(action, { shiftKey: true })).toBe(true);
    expect(onOpenPortfolio).not.toHaveBeenCalled();
    expect(fireEvent.click(action)).toBe(false);
    expect(onOpenPortfolio).toHaveBeenCalledOnce();
  });

  it("renders an honest loading state before browser progress is available", () => {
    expect(renderToString(<Academy />)).toContain("Загружаем учебный кабинет");
  });

  it("does not duplicate a started project in the saved-for-later group", async () => {
    localStorage.setItem("feya-dashboard-v1:saved", JSON.stringify(["pressure-diary"]));
    localStorage.setItem(progressKey("pressure-diary"), JSON.stringify({
      version: 1,
      activeStep: 2,
      completed: [1],
      score: 10,
    }));
    window.history.replaceState({}, "", "/?section=projects");

    render(<AppEntry />);

    expect(await screen.findByRole("heading", { name: "Начатые" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Готовые" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "На потом" })).toBeInTheDocument();
    expect(screen.getAllByRole("article", { name: /дневник давления/i })).toHaveLength(1);
  });

  it("shows a thematic sticker on each result preview", () => {
    const familyExpenses = getQuestProject("family-expenses");
    const webinarModerator = getQuestProject("webinar-moderator-agent");
    expect(familyExpenses).toBeDefined();
    expect(webinarModerator).toBeDefined();

    const view = render(<ProjectPreview project={familyExpenses!} />);
    const firstSticker = screen.getByText("Учёт расходов").closest(".project-preview-sticker");
    expect(firstSticker).toHaveAttribute("data-project-sticker", "family-expenses");
    expect(firstSticker).toHaveStyle({ "--project-sticker-accent": "#8f512d" });

    view.rerender(<ProjectPreview project={webinarModerator!} />);
    expect(screen.getByText("Модератор вебинара").closest(".project-preview-sticker"))
      .toHaveAttribute("data-project-sticker", "webinar-moderator-agent");
  });

  it("shows bundled service and agent as two full, specifically labelled results", () => {
    const planning = getBundle("planning");
    const { container } = render(<ProjectPreview project={planning} />);
    const carousel = container.querySelector(".bundle-preview-carousel");

    expect(carousel).toHaveAttribute("data-active-format", "service");
    expect(container.querySelectorAll(".bundle-preview-slide")).toHaveLength(2);
    expect(container.querySelector(".bundle-preview-format")).toHaveTextContent("Сервис · Планер недели");
    expect(screen.getByRole("button", { name: "Показать сервис" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Показать ИИ-агента" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Два варианта одного проекта")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Показать ИИ-агента" }));

    expect(carousel).toHaveAttribute("data-active-format", "agent");
    expect(container.querySelector(".bundle-preview-format")).toHaveTextContent("ИИ-агент · План дня");
    expect(screen.getByRole("button", { name: "Показать ИИ-агента" })).toHaveAttribute("aria-pressed", "true");
  });

  it("changes bundled results automatically and pauses while the preview is hovered", () => {
    vi.useFakeTimers();
    try {
      const planning = getBundle("planning");
      const { container } = render(<ProjectPreview project={planning} />);
      const carousel = container.querySelector(".bundle-preview-carousel")!;

      act(() => vi.advanceTimersByTime(4200));
      expect(carousel).toHaveAttribute("data-active-format", "agent");

      fireEvent.mouseEnter(carousel);
      act(() => vi.advanceTimersByTime(8400));
      expect(carousel).toHaveAttribute("data-active-format", "agent");

      fireEvent.mouseLeave(carousel);
      act(() => vi.advanceTimersByTime(4200));
      expect(carousel).toHaveAttribute("data-active-format", "service");
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows six openable weeks, applies URL search and resets an empty result", async () => {
    window.history.replaceState({}, "", "/?section=weeks&q=%D0%BD%D0%B5%D1%81%D1%83%D1%89%D0%B5%D1%81%D1%82%D0%B2%D1%83%D1%8E%D1%89%D0%B8%D0%B9");

    render(<AppEntry />);

    const weeks = await screen.findAllByRole("button", { name: /^Неделя [1-6]$/i });
    expect(weeks).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Неделя 1" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("searchbox", { name: /поиск по квестам недели/i })).toHaveValue("несуществующий");
    expect(screen.getByText(/ничего не найдено/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /сбросить фильтры/i }));
    expect(screen.queryByText(/ничего не найдено/i)).not.toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: /поиск по квестам недели/i })).toHaveValue("");

    fireEvent.click(screen.getByRole("button", { name: "Неделя 2" }));
    expect(screen.getByRole("button", { name: "Неделя 1" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Неделя 2" })).toHaveAttribute("aria-expanded", "true");
  });

  it("opens matching weeks instead of showing an empty current week", async () => {
    window.history.replaceState({}, "", "/?section=weeks&q=%D0%BF%D1%81%D0%B8%D1%85%D0%BE%D0%BB%D0%BE%D0%B3");
    render(<AppEntry />);

    expect(await screen.findByRole("article", { name: /сайт психолога/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Неделя 1" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Неделя 4" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByText(/ничего не найдено/i)).not.toBeInTheDocument();
  });

  it("keeps inline search, canonical URL and top search in one state", async () => {
    window.history.replaceState({}, "", "/?format=mobile&section=weeks");
    render(<AppEntry />);

    const inline = await screen.findByRole("searchbox", { name: /поиск по квестам недели/i });
    fireEvent.change(inline, { target: { value: "психолог" } });

    await waitFor(() => expect(window.location.search).toBe("?format=mobile&section=weeks&q=%D0%BF%D1%81%D0%B8%D1%85%D0%BE%D0%BB%D0%BE%D0%B3"));
    expect(screen.getByRole("searchbox", { name: /найти проект/i })).toHaveValue("психолог");
    expect(await screen.findByRole("article", { name: /сайт психолога/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /сбросить фильтры/i }));
    await waitFor(() => expect(window.location.search).toBe("?format=mobile&section=weeks"));
    expect(screen.getByRole("searchbox", { name: /найти проект/i })).toHaveValue("");
    expect(screen.getByRole("searchbox", { name: /поиск по квестам недели/i })).toHaveValue("");
  });

  it("preserves spaces through the real inline search change sequence", async () => {
    window.history.replaceState({}, "", "/?section=weeks");
    render(<AppEntry />);

    const inline = await screen.findByRole("searchbox", { name: /поиск по квестам недели/i });
    const top = screen.getByRole("searchbox", { name: /найти проект/i });
    for (const value of ["сайт", "сайт ", "сайт п", "сайт псих", "сайт психолога"]) {
      fireEvent.change(inline, { target: { value } });
      await waitFor(() => expect(new URLSearchParams(window.location.search).get("q")).toBe(value));
      expect(inline).toHaveValue(value);
      expect(top).toHaveValue(value);
    }

    expect(await screen.findByRole("article", { name: /сайт психолога/i })).toBeInTheDocument();
  });

  it("auto-opens matching weeks but keeps their accordions manually operable", async () => {
    window.history.replaceState({}, "", "/?section=weeks&q=%D0%BF%D1%81%D0%B8%D1%85%D0%BE%D0%BB%D0%BE%D0%B3");
    render(<AppEntry />);

    const week = await screen.findByRole("button", { name: "Неделя 4" });
    expect(week).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("article", { name: /сайт психолога/i })).toBeInTheDocument();

    fireEvent.click(week);
    expect(week).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("article", { name: /сайт психолога/i })).not.toBeInTheDocument();

    fireEvent.click(week);
    expect(week).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("article", { name: /сайт психолога/i })).toBeInTheDocument();
  });

  it("places a bundle matched only by its agent branch in factual week 2 once", async () => {
    window.history.replaceState({}, "", "/?section=weeks&q=%D0%98%D0%98-%D0%B0%D0%B3%D0%B5%D0%BD%D1%82+%D0%BF%D0%BB%D0%B0%D0%BD%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D1%8F+%D0%B4%D0%BD%D1%8F");
    render(<AppEntry />);

    expect(await screen.findAllByRole("article", { name: /планирование/i })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Неделя 1" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Неделя 2" })).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps the existing discovery filters in the weekly library", async () => {
    window.history.replaceState({}, "", "/?section=weeks");
    render(<AppEntry />);

    await screen.findByRole("button", { name: "Неделя 1" });
    fireEvent.change(screen.getByRole("combobox", { name: /цель проекта/i }), { target: { value: "Здоровье" } });

    expect(screen.getByRole("article", { name: /дневник давления/i })).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: /планирование/i })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: /поиск по квестам недели/i }), { target: { value: "шагов" } });
    expect(screen.getByRole("article", { name: /привычки и активность/i })).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: /дневник давления/i })).not.toBeInTheDocument();
  });

  it("shows factual time, format and discovery metadata on project cards", async () => {
    window.history.replaceState({}, "", "/?section=weeks");
    render(<AppEntry />);

    const planning = await screen.findByRole("article", { name: /планирование/i });
    expect(planning).toHaveTextContent("Время: 5–10 минут на уровень");
    expect(planning).toHaveTextContent("Формат: 2 варианта на выбор");
    expect(planning).toHaveTextContent("Тип результата: экранный сервис / разговорный ИИ-агент");
    expect(planning).toHaveTextContent("Чем отличаются: сервис открывают и нажимают кнопки; с ИИ-агентом переписываются как с помощником");
    expect(planning).not.toHaveTextContent("или агент");
    expect(planning).toHaveTextContent(/Ключевые слова:.+Для себя/i);
    const server = screen.getByRole("article", { name: /покупаем сервер/i });
    expect(server).toHaveTextContent("Время: 5–7 минут на уровень");
  });

  it("uses the selected bundle format on a started project card", async () => {
    saveOutputChoice("planning", "desktop", "service", localStorage);
    localStorage.setItem(progressKey(branchStorageSlug("planning", "service", "desktop")), JSON.stringify({
      version: 1,
      activeStep: 2,
      completed: [1],
      score: 10,
    }));

    render(<Academy section="projects" />);

    const planning = await screen.findByRole("article", { name: /планирование/i });
    expect(planning).toHaveTextContent("Формат: Сервис");
    expect(within(planning).getByRole("link", { name: /продолжить: планирование/i })).toHaveAttribute(
      "href",
      "?quest=planning&output=service",
    );
  });

  it.each([
    ["desktop", Academy, "server-152fz", "?quest=server-152fz", progressKey("server-152fz"), /покупаем сервер/i],
    ["mobile", MobileAcademy, "pressure-diary", "?format=mobile&quest=pressure-diary", progressKey("mobile:pressure-diary"), /дневник давления/i],
  ] as const)("automatically shows a completed project in the %s portfolio with a native quest link", async (_format, Component, slug, href, key, name) => {
    const total = getProjectLevelCount(slug);
    localStorage.setItem(key, JSON.stringify({
      version: 1,
      activeStep: total,
      completed: Array.from({ length: total }, (_, index) => index + 1),
      score: total * 10,
      completedAt: "2026-08-14",
    }));
    const onOpen = vi.fn();

    render(<Component section="portfolio" onOpen={onOpen} />);

    const card = await screen.findByRole("article", { name });
    expect(within(card).getByRole("img", { name })).toBeInTheDocument();
    expect(within(card).getByText("14.08.2026")).toHaveAttribute("datetime", "2026-08-14");

    const action = within(card).getByRole("link", { name: new RegExp(`открыть проект: ${slug === "server-152fz" ? "покупаем сервер по 152-фз" : "дневник давления"}`, "i") });
    expect(action).toHaveAttribute("href", href);
    action.setAttribute("href", "#browser-portfolio-card");
    expect(fireEvent.click(action, { metaKey: true })).toBe(true);
    expect(onOpen).not.toHaveBeenCalled();
    expect(fireEvent.click(action)).toBe(false);
    expect(onOpen).toHaveBeenCalledWith(slug);
  });

  it.each([
    ["desktop", Academy, "service", "?quest=planning&output=service", branchStorageSlug("planning", "service", "desktop")],
    ["mobile", MobileAcademy, "agent", "?format=mobile&quest=planning&output=agent", branchStorageSlug("planning", "agent", "mobile")],
  ] as const)("shows only the completed %s bundle branch facts in portfolio", async (_surface, Component, output, href, storageSlug) => {
    const bundle = getBundle("planning");
    const branch = bundle.formats[output];
    const total = getProjectLevelCount(branch);
    localStorage.setItem(progressKey(storageSlug), JSON.stringify({
      version: 1,
      activeStep: total,
      completed: Array.from({ length: total }, (_, index) => index + 1),
      score: total * 10,
      completedAt: "2026-08-14",
    }));
    saveOutputChoice("planning", _surface, output, localStorage);
    const onOpen = vi.fn();

    render(<Component section="portfolio" onOpen={onOpen} />);

    const card = await screen.findByRole("article", { name: /планирование/i });
    expect(card).toHaveTextContent(`Формат: ${output === "service" ? "Сервис" : "ИИ-агент"}`);
    expect(card).toHaveTextContent(branch.audience);
    expect(card).not.toHaveTextContent(bundle.formats[output === "service" ? "agent" : "service"].audience);
    const action = within(card).getByRole("link", { name: new RegExp(`открыть ${output === "service" ? "сервис" : "ии-агента"}: планирование`, "i") });
    expect(action).toHaveAttribute("href", href);
    action.setAttribute("href", "#browser-bundle-portfolio");
    expect(fireEvent.click(action, { ctrlKey: true })).toBe(true);
    expect(onOpen).not.toHaveBeenCalled();
    expect(fireEvent.click(action)).toBe(false);
    expect(onOpen).toHaveBeenCalledWith("planning", output);
  });

  it("shows both completed bundle outputs without merging their facts", async () => {
    const bundle = getBundle("planning");
    for (const output of ["service", "agent"] as const) {
      const total = getProjectLevelCount(bundle.formats[output]);
      localStorage.setItem(progressKey(branchStorageSlug("planning", output, "desktop")), JSON.stringify({
        version: 1,
        activeStep: total,
        completed: Array.from({ length: total }, (_, index) => index + 1),
        score: total * 10,
        completedAt: output === "service" ? "2026-08-14" : "2026-08-15",
      }));
    }

    render(<Academy section="portfolio" />);

    const card = await screen.findByRole("article", { name: /планирование/i });
    expect(card).toHaveTextContent("Готовы оба формата");
    expect(within(card).getByRole("link", { name: /открыть сервис: планирование/i })).toHaveAttribute("href", "?quest=planning&output=service");
    expect(within(card).getByRole("link", { name: /открыть ии-агента: планирование/i })).toHaveAttribute("href", "?quest=planning&output=agent");
    expect(card).toHaveTextContent("14.08.2026");
    expect(card).toHaveTextContent("15.08.2026");
  });

  it("omits a completion date for legacy finished progress", async () => {
    const total = getProjectLevelCount("server-152fz");
    localStorage.setItem(progressKey("server-152fz"), JSON.stringify({
      version: 1,
      activeStep: total,
      completed: Array.from({ length: total }, (_, index) => index + 1),
      score: total * 10,
    }));

    render(<Academy section="portfolio" />);

    const card = await screen.findByRole("article", { name: /покупаем сервер/i });
    expect(card).not.toHaveTextContent(/Готово \d{2}\.\d{2}\.\d{4}/i);
  });

  it("labels a completed project card action as opening, not continuing", async () => {
    const total = getProjectLevelCount("server-152fz");
    localStorage.setItem(progressKey("server-152fz"), JSON.stringify({
      version: 1,
      activeStep: total,
      completed: Array.from({ length: total }, (_, index) => index + 1),
      score: total * 10,
      completedAt: "2026-08-14",
    }));

    render(<Academy section="projects" />);

    const card = await screen.findByRole("article", { name: /покупаем сервер/i });
    expect(within(card).getByRole("link", { name: /открыть проект: покупаем сервер/i })).toBeInTheDocument();
    expect(within(card).queryByRole("link", { name: /продолжить/i })).not.toBeInTheDocument();
  });

  it("shows honest empty states for projects and portfolio", async () => {
    const { rerender } = render(<Academy section="projects" />);

    expect(await screen.findByText(/нет начатых проектов/i)).toBeInTheDocument();
    expect(screen.getByText(/нет готовых проектов/i)).toBeInTheDocument();
    expect(screen.getByText(/нет проектов на потом/i)).toBeInTheDocument();

    rerender(<Academy section="portfolio" />);
    expect(await screen.findByText(/здесь появится первая готовая работа/i)).toBeInTheDocument();
  });

  it("saves a full-page Fairy question in the academy scope without inventing an AI reply", async () => {
    window.history.replaceState({}, "", "/?section=fairy");
    const { container } = render(<AppEntry />);

    const question = await screen.findByRole("textbox", { name: /вопрос феечке/i });
    expect(container.querySelector('main[data-dashboard-section="fairy"]')).toHaveAttribute("data-dashboard-format", "desktop");
    expect(container.querySelector('main[data-dashboard-section="fairy"]')).toHaveAttribute("data-visual-theme", "elina-burgundy");
    fireEvent.change(question, { target: { value: "<script>не выполнять</script>\nНе понимаю следующий шаг" } });
    fireEvent.click(screen.getByRole("button", { name: /сохранить вопрос/i }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Вопрос сохранён на этом устройстве. Покажите его куратору или вставьте в ChatGPT/Codex.",
    );
    expect(JSON.parse(localStorage.getItem("feya-dashboard-v1:notes:academy")!)).toMatchObject([
      { text: "<script>не выполнять</script>\nНе понимаю следующий шаг" },
    ]);
    expect(screen.getByRole("list", { name: /сохранённые вопросы/i })).toHaveTextContent("Не понимаю следующий шаг");
    expect(container.querySelector(".fairy-notes script")).toBeNull();
    expect(screen.queryByText(/ответ ИИ/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/отправлен в облако/i)).not.toBeInTheDocument();
  });

  it("stores a floating Fairy note in the current quest and restores focus after Escape", async () => {
    window.history.replaceState({}, "", "/?quest=pressure-diary");
    render(<AppEntry />);

    const trigger = await screen.findByRole("button", { name: /открыть феечку/i });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: /феечка/i });
    expect(showModalMock).toHaveBeenCalledTimes(1);
    const question = within(dialog).getByRole("textbox", { name: /вопрос феечке/i });
    expect(question).toHaveFocus();

    fireEvent.change(question, { target: { value: "Где я остановилась?" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /сохранить вопрос/i }));
    expect(JSON.parse(localStorage.getItem("feya-dashboard-v1:notes:pressure-diary")!)).toMatchObject([
      { text: "Где я остановилась?" },
    ]);
    expect(localStorage.getItem("feya-dashboard-v1:notes:academy")).toBeNull();

    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog", { name: /феечка/i })).not.toBeInTheDocument();
    expect(closeDialogMock).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveFocus();
  });

  it("closes and removes the floating Fairy when the full Fairy section becomes active", async () => {
    render(<AppEntry />);

    fireEvent.click(await screen.findByRole("button", { name: /открыть феечку/i }));
    expect(screen.getByRole("dialog", { name: /феечка/i })).toBeInTheDocument();

    window.history.pushState({}, "", "/?section=fairy");
    window.dispatchEvent(new PopStateEvent("popstate"));

    await waitFor(() => expect(document.querySelector('main[data-dashboard-section="fairy"]')).not.toBeNull());
    expect(within(document.querySelector('main[data-dashboard-section="fairy"]')!).getByRole("heading", { name: "Феечка" })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: /феечка/i })).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /открыть феечку/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("textbox", { name: /вопрос феечке/i })).toHaveLength(1);
    expect(closeDialogMock).toHaveBeenCalledTimes(1);
  });

  it("uses the academy scope for the floating Fairy outside a quest", async () => {
    render(<AppEntry />);

    fireEvent.click(await screen.findByRole("button", { name: /открыть феечку/i }));
    const dialog = screen.getByRole("dialog", { name: /феечка/i });
    fireEvent.change(within(dialog).getByRole("textbox", { name: /вопрос феечке/i }), { target: { value: "Как выбрать проект?" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /сохранить вопрос/i }));

    expect(JSON.parse(localStorage.getItem("feya-dashboard-v1:notes:academy")!)).toMatchObject([
      { text: "Как выбрать проект?" },
    ]);
  });

  it("opens one contextual Fairy from the mobile quest bottom navigation", async () => {
    window.history.replaceState({}, "", "/?format=mobile&quest=pressure-diary");
    render(<AppEntry />);

    const trigger = await screen.findByRole("button", { name: /феечка, нижняя навигация/i });
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: /феечка/i });
    expect(dialog).toHaveAttribute("data-fairy-scope", "pressure-diary");
    expect(window.location.search).toBe("?format=mobile&quest=pressure-diary");
    expect(screen.getAllByRole("textbox", { name: /вопрос феечке/i })).toHaveLength(1);
    expect(document.querySelector('main[data-dashboard-section="fairy"]')).toBeNull();
  });

  it("keeps bottom-navigation Fairy as a full academy section outside a quest", async () => {
    window.history.replaceState({}, "", "/?format=mobile");
    render(<AppEntry />);

    fireEvent.click(await screen.findByRole("button", { name: /феечка, нижняя навигация/i }));

    await waitFor(() => expect(document.querySelector('main[data-dashboard-section="fairy"]')).not.toBeNull());
    expect(window.location.search).toBe("?format=mobile&section=fairy");
    expect(screen.queryByRole("dialog", { name: /феечка/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("textbox", { name: /вопрос феечке/i })).toHaveLength(1);
  });

  it("shows the microphone only when speech recognition exists and never auto-saves a transcript", async () => {
    setSpeechRecognition(MockSpeechRecognition, true);
    render(<FairyAssistant scope="academy" mode="full" />);

    const microphone = await screen.findByRole("button", { name: /начать голосовой ввод/i });
    fireEvent.click(microphone);
    expect(screen.getByRole("status")).toHaveTextContent("Говорите — текст появится в поле вопроса. Он не сохранится сам.");

    act(() => MockSpeechRecognition.latest?.emitTranscript("Продиктованный вопрос"));
    expect(screen.getByRole("textbox", { name: /вопрос феечке/i })).toHaveValue("Продиктованный вопрос");
    expect(screen.getByRole("status")).toHaveTextContent("Голос распознан. Проверьте текст и нажмите «Сохранить вопрос».");
    expect(localStorage.getItem("feya-dashboard-v1:notes:academy")).toBeNull();
  });

  it("keeps text input available when microphone permission is denied", async () => {
    setSpeechRecognition(MockSpeechRecognition);
    render(<FairyAssistant scope="academy" mode="full" />);

    fireEvent.click(await screen.findByRole("button", { name: /начать голосовой ввод/i }));
    act(() => MockSpeechRecognition.latest?.emitError("not-allowed"));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Микрофон недоступен. Напишите вопрос в поле — текстовый ввод работает без микрофона.",
    );
    expect(screen.getByRole("textbox", { name: /вопрос феечке/i })).toBeEnabled();
  });

  it("handles speech start and end failures without submitting the question", async () => {
    setSpeechRecognition(MockSpeechRecognition);
    MockSpeechRecognition.startError = new Error("permission blocked");
    const { rerender } = render(<FairyAssistant scope="academy" mode="full" />);

    fireEvent.click(await screen.findByRole("button", { name: /начать голосовой ввод/i }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Микрофон недоступен. Напишите вопрос в поле — текстовый ввод работает без микрофона.",
    );
    expect(localStorage.getItem("feya-dashboard-v1:notes:academy")).toBeNull();

    MockSpeechRecognition.startError = null;
    rerender(<FairyAssistant scope="academy" mode="full" />);
    fireEvent.click(screen.getByRole("button", { name: /начать голосовой ввод/i }));
    act(() => MockSpeechRecognition.latest?.emitEnd());
    expect(screen.getByRole("status")).toHaveTextContent("Запись остановлена. Проверьте текст и сохраните вопрос вручную.");
  });

  it("stops the old recognition and drops draft, notes and callbacks when scope changes", async () => {
    setSpeechRecognition(MockSpeechRecognition);
    localStorage.setItem("feya-dashboard-v1:notes:planner", JSON.stringify([
      { id: "old", text: "Старый вопрос", createdAt: "2026-08-14T12:00:00.000Z" },
    ]));
    localStorage.setItem("feya-dashboard-v1:notes:pressure-diary", JSON.stringify([
      { id: "new", text: "Новый вопрос", createdAt: "2026-08-15T12:00:00.000Z" },
    ]));
    const { rerender } = render(<FairyAssistant scope="planner" mode="full" />);

    expect(await screen.findByText("Старый вопрос")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: /вопрос феечке/i }), { target: { value: "Черновик старого проекта" } });
    fireEvent.click(await screen.findByRole("button", { name: /начать голосовой ввод/i }));
    const oldRecognition = MockSpeechRecognition.latest!;

    rerender(<FairyAssistant scope="pressure-diary" mode="full" />);

    expect(oldRecognition.stop).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("textbox", { name: /вопрос феечке/i })).toHaveValue("");
    expect(screen.queryByText("Старый вопрос")).not.toBeInTheDocument();
    expect(await screen.findByText("Новый вопрос")).toBeInTheDocument();
    act(() => oldRecognition.emitTranscript("Запоздалый старый текст"));
    expect(screen.getByRole("textbox", { name: /вопрос феечке/i })).toHaveValue("");
  });

  it("keeps an open shell dialog remounted in the new quest scope", async () => {
    setSpeechRecognition(MockSpeechRecognition);
    window.history.replaceState({}, "", "/?quest=pressure-diary");
    render(<AppEntry />);

    fireEvent.click(await screen.findByRole("button", { name: /открыть феечку/i }));
    const oldDialog = screen.getByRole("dialog", { name: /феечка/i });
    fireEvent.change(within(oldDialog).getByRole("textbox", { name: /вопрос феечке/i }), { target: { value: "Старый черновик" } });
    fireEvent.click(await within(oldDialog).findByRole("button", { name: /начать голосовой ввод/i }));
    const oldRecognition = MockSpeechRecognition.latest!;

    window.history.pushState({}, "", "/?quest=planner");
    window.dispatchEvent(new PopStateEvent("popstate"));

    await waitFor(() => expect(document.querySelector('dialog[data-fairy-scope="planning"]')).not.toBeNull());
    const newDialog = screen.getByRole("dialog", { name: /феечка/i });
    expect(within(newDialog).getByRole("textbox", { name: /вопрос феечке/i })).toHaveValue("");
    expect(oldRecognition.stop).toHaveBeenCalledTimes(1);
    act(() => oldRecognition.emitTranscript("Запоздалый старый текст"));
    expect(within(newDialog).getByRole("textbox", { name: /вопрос феечке/i })).toHaveValue("");
  });

  it("swallows recognition cleanup errors while unmounting", async () => {
    setSpeechRecognition(MockSpeechRecognition);
    const view = render(<FairyAssistant scope="academy" mode="full" />);

    fireEvent.click(await screen.findByRole("button", { name: /начать голосовой ввод/i }));
    MockSpeechRecognition.stopError = new Error("recognition already stopped");

    expect(() => view.unmount()).not.toThrow();
  });

  it("explains browser-local note storage and browser-dependent voice processing", async () => {
    render(<FairyAssistant scope="academy" mode="full" />);

    expect(await screen.findByText(/сохранённые вопросы хранятся в этом браузере на этом устройстве/i)).toBeInTheDocument();
    expect(screen.getByText(/браузер может использовать внешний сервис распознавания речи/i)).toBeInTheDocument();
  });

  it("keeps the draft and explains when browser storage rejects a save", async () => {
    render(<FairyAssistant scope="academy" mode="full" />);
    const question = await screen.findByRole("textbox", { name: /вопрос феечке/i });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    try {
      fireEvent.change(question, { target: { value: "Вопрос, который нельзя потерять" } });
      fireEvent.click(screen.getByRole("button", { name: /сохранить вопрос/i }));

      expect(screen.getByRole("status")).toHaveTextContent(
        "Не удалось сохранить вопрос в этом браузере. Скопируйте текст и передайте его вручную.",
      );
      expect(question).toHaveValue("Вопрос, который нельзя потерять");
      expect(screen.queryByText(/вопрос сохранён на этом устройстве/i)).not.toBeInTheDocument();
    } finally {
      setItem.mockRestore();
    }
  });

  it("explains when browser storage cannot be read", async () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });

    try {
      render(<FairyAssistant scope="academy" mode="full" />);
      expect(await screen.findByRole("status")).toHaveTextContent(
        "Не удалось открыть сохранённые вопросы в этом браузере. Новый вопрос лучше скопировать вручную.",
      );
      expect(screen.getByRole("textbox", { name: /вопрос феечке/i })).toBeEnabled();
    } finally {
      getItem.mockRestore();
    }
  });

  it("keeps working when access to window.localStorage itself is blocked", async () => {
    const localStorageAccess = vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });

    try {
      render(<FairyAssistant scope="academy" mode="full" />);
      expect(await screen.findByRole("status")).toHaveTextContent(
        "Не удалось открыть сохранённые вопросы в этом браузере. Новый вопрос лучше скопировать вручную.",
      );
      expect(screen.getByRole("textbox", { name: /вопрос феечке/i })).toBeEnabled();
    } finally {
      localStorageAccess.mockRestore();
    }
  });

  it("hides the microphone when browser speech recognition is unavailable", async () => {
    render(<FairyAssistant scope="academy" mode="full" />);

    expect(await screen.findByRole("textbox", { name: /вопрос феечке/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /голосовой ввод/i })).not.toBeInTheDocument();
  });

  it("renders the ready desktop quest as one ordered step workspace with a level map", () => {
    const { container } = render(<Quest project={getQuestProject("family-expenses")!} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));

    const workspace = container.querySelector<HTMLElement>('[data-quest-workspace="desktop"]');
    expect(workspace).not.toBeNull();
    expect(within(workspace!).getByRole("navigation", { name: /карта уровней/i })).toBeInTheDocument();
    expect(within(workspace!).getByRole("heading", { name: "Зачем" })).toBeInTheDocument();
    expect(within(workspace!).getByRole("heading", { name: "Что сделать" })).toBeInTheDocument();
    expect(within(workspace!).getByRole("heading", { name: /готовая команда для Codex/i })).toBeInTheDocument();
    expect(within(workspace!).getByRole("heading", { name: "Готово, если" })).toBeInTheDocument();

    fireEvent.click(within(workspace!).getByRole("button", { name: /^нужна помощь$/i }));
    const ordered = [
      workspace!.querySelector(".quest-purpose"),
      workspace!.querySelector(".quest-action"),
      workspace!.querySelector(".beginner-terms"),
      workspace!.querySelector(".quest-prompt"),
      workspace!.querySelector(".quest-guide"),
      workspace!.querySelector(".quest-result"),
      workspace!.querySelector(".quest-help"),
      workspace!.querySelector(".quest-step-actions"),
    ];
    expect(ordered.every(Boolean)).toBe(true);
    for (let index = 0; index < ordered.length - 1; index += 1) {
      expect(ordered[index]!.compareDocumentPosition(ordered[index + 1]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("opens the result screenshot in a native modal and restores its exact opener", () => {
    const { container } = render(<Quest project={getQuestProject("family-expenses")!} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
    const opener = screen.getByRole("button", { name: /увеличить пример результата/i });
    opener.focus();

    fireEvent.click(opener);

    const dialog = screen.getByRole("dialog", { name: "Увеличенный пример" });
    expect(dialog.tagName).toBe("DIALOG");
    expect(dialog).not.toHaveAttribute("aria-modal");
    expect(showModalMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /закрыть увеличенный пример/i })).toHaveFocus();

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Увеличенный пример" })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();

    fireEvent.click(opener);
    const reopened = screen.getByRole("dialog", { name: "Увеличенный пример" });
    fireEvent(reopened, new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog", { name: "Увеличенный пример" })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(container.querySelector(".image-modal[aria-modal]")).toBeNull();
  });

  it("keeps the result screenshot usable when dialog showModal is unavailable", () => {
    const originalShowModal = HTMLDialogElement.prototype.showModal;
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, writable: true, value: undefined });

    try {
      render(<Quest project={getQuestProject("family-expenses")!} onHome={vi.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
      const opener = screen.getByRole("button", { name: /увеличить пример результата/i });
      opener.focus();
      fireEvent.click(opener);

      const dialog = screen.getByRole("dialog", { name: "Увеличенный пример" });
      expect(dialog).toHaveAttribute("open");
      fireEvent.click(screen.getByRole("button", { name: /закрыть увеличенный пример/i }));
      expect(screen.queryByRole("dialog", { name: "Увеличенный пример" })).not.toBeInTheDocument();
      expect(opener).toHaveFocus();
    } finally {
      Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, writable: true, value: originalShowModal });
    }
  });

  it("opens rewards as a native modal, supports Escape and restores the exact action opener", () => {
    const project = getQuestProject("family-expenses")!;
    localStorage.setItem(preparationKey(project.slug), JSON.stringify({ version: 1, mode: "demo", checked: [], ready: true }));
    localStorage.setItem(progressKey(project.slug), JSON.stringify({ version: 1, activeStep: 4, completed: [1, 2, 3], score: 30 }));
    render(<Quest project={project} onHome={vi.fn()} />);
    const opener = screen.getByRole("button", { name: /я сделала — продолжить/i });
    opener.focus();

    fireEvent.click(opener);

    const dialog = screen.getByRole("dialog", { name: "Новая награда" });
    expect(dialog.tagName).toBe("DIALOG");
    expect(dialog).not.toHaveAttribute("aria-modal");
    expect(screen.getByRole("button", { name: /забрать награду/i })).toHaveFocus();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Новая награда" })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("keeps the native reward usable when showModal is unavailable", () => {
    const originalShowModal = HTMLDialogElement.prototype.showModal;
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, writable: true, value: undefined });
    const project = getQuestProject("family-expenses")!;
    localStorage.setItem(preparationKey(project.slug), JSON.stringify({ version: 1, mode: "demo", checked: [], ready: true }));
    localStorage.setItem(progressKey(project.slug), JSON.stringify({ version: 1, activeStep: 4, completed: [1, 2, 3], score: 30 }));

    try {
      render(<Quest project={project} onHome={vi.fn()} />);
      const opener = screen.getByRole("button", { name: /я сделала — продолжить/i });
      fireEvent.click(opener);
      expect(screen.getByRole("dialog", { name: "Новая награда" })).toHaveAttribute("open");
      fireEvent.click(screen.getByRole("button", { name: /забрать награду/i }));
      expect(screen.queryByRole("dialog", { name: "Новая награда" })).not.toBeInTheDocument();
      expect(opener).toHaveFocus();
    } finally {
      Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, writable: true, value: originalShowModal });
    }
  });

  it("moves final reward focus to the completed step when its opener becomes disabled", () => {
    const project = getQuestProject("family-expenses")!;
    const total = getProjectLevelCount(project);
    localStorage.setItem(preparationKey(project.slug), JSON.stringify({ version: 1, mode: "demo", checked: [], ready: true }));
    localStorage.setItem(progressKey(project.slug), JSON.stringify({ version: 1, activeStep: total, completed: Array.from({ length: total - 1 }, (_, index) => index + 1), score: (total - 1) * 10 }));
    const { container } = render(<Quest project={project} onHome={vi.fn()} />);
    const opener = screen.getByRole("button", { name: /завершить квест/i });

    fireEvent.click(opener);
    expect(opener).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /забрать награду/i }));

    const step = container.querySelector<HTMLElement>(".quest-step-card");
    expect(step).toHaveAttribute("tabindex", "-1");
    expect(step).toHaveFocus();
  });

  it("opens a guide screenshot as a native modal and restores the selected frame opener", () => {
    render(<Quest project={getQuestProject("family-expenses")!} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
    const opener = screen.getByRole("button", { name: /увеличить кадр 2:/i });
    opener.focus();

    fireEvent.click(opener);

    const dialog = screen.getByRole("dialog", { name: /увеличенный кадр 2/i });
    expect(dialog.tagName).toBe("DIALOG");
    expect(dialog).not.toHaveAttribute("aria-modal");
    const close = screen.getByRole("button", { name: /закрыть увеличенный кадр 2/i });
    expect(close).toHaveTextContent("Закрыть");
    expect(close).toHaveFocus();

    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog", { name: /увеличенный кадр 2/i })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("keeps page and quest phase headings in document order", () => {
    const server = render(<Quest project={getQuestProject("server-152fz")!} onHome={vi.fn()} />);
    const workspace = server.container.querySelector<HTMLElement>('[data-quest-workspace="desktop"]')!;
    const pageHeading = within(workspace).getByRole("heading", { level: 1, name: /решила, нужен ли мне сервер/i });
    const offerHeading = within(workspace).getByRole("heading", { level: 2, name: /скидка 60% на сервер/i });
    expect(pageHeading.compareDocumentPosition(offerHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    server.unmount();

    render(<Quest project={getQuestProject("family-expenses")!} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
    const promptHeading = screen.getByRole("heading", { level: 2, name: /готовая команда для Codex/i });
    const guideHeading = screen.getByRole("heading", { level: 2, name: /один кадр — одно маленькое действие/i });
    const firstFrameHeading = screen.getByRole("heading", { level: 3, name: /откройте: Предпросмотр проекта/i });
    expect(promptHeading.compareDocumentPosition(guideHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(guideHeading.compareDocumentPosition(firstFrameHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps the desktop level map locked, current and synchronized with the opened step", () => {
    const project = getQuestProject("planner")!;
    const { container } = render(<Quest project={project} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));

    const map = screen.getByRole("navigation", { name: /карта уровней/i });
    const first = within(map).getByRole("button", { name: /уровень 1:/i });
    const second = within(map).getByRole("button", { name: /уровень 2:/i });
    expect(first).toHaveAttribute("aria-current", "step");
    expect(second).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /я сделала — продолжить/i }));
    expect(second).toBeEnabled();
    expect(second).toHaveAttribute("aria-current", "step");
    expect(container.querySelector(".quest-step-heading")).toHaveTextContent(/уровень 2 из/i);
  });

  it("offers an accessible compact level map for a narrow desktop quest", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 375 });
    const project = getQuestProject("pressure-diary")!;
    localStorage.setItem(preparationKey(project.slug), JSON.stringify({ version: 1, mode: "demo", checked: [], ready: true }));
    localStorage.setItem(progressKey(project.slug), JSON.stringify({ version: 1, activeStep: 2, completed: [1], score: 10 }));
    const { container } = render(<Quest project={project} onHome={vi.fn()} />);
    const compactMap = container.querySelector<HTMLDetailsElement>(".narrow-desktop-level-map");

    expect(compactMap).not.toBeNull();
    expect(within(compactMap!).getByText(/уровень 2 из/i)).toBeInTheDocument();
    const navigation = within(compactMap!).getByRole("navigation", { name: /выбор уровня на узком экране/i });
    expect(within(navigation).getByRole("button", { name: /уровень 1:.*пройден/i })).toBeEnabled();
    expect(within(navigation).getByRole("button", { name: /уровень 2:.*текущий/i })).toHaveAttribute("aria-current", "step");
    expect(within(navigation).getByRole("button", { name: /уровень 3:.*закрыт/i })).toBeDisabled();

    compactMap!.open = true;
    vi.mocked(window.scrollTo).mockClear();
    fireEvent.click(within(navigation).getByRole("button", { name: /уровень 1:.*пройден/i }));

    expect(compactMap).not.toHaveAttribute("open");
    const stepCard = container.querySelector<HTMLElement>(".quest-step-card");
    expect(stepCard).toHaveFocus();
    expect(container.querySelector(".quest-step-heading")).toHaveTextContent(/уровень 1 из/i);
    expect(JSON.parse(localStorage.getItem(progressKey(project.slug))!)).toMatchObject({ activeStep: 1, completed: [1] });
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "smooth" });
  });

  it("uses the same desktop step opener for map, back and a completed-step continuation", () => {
    const project = getQuestProject("pressure-diary")!;
    localStorage.setItem(preparationKey(project.slug), JSON.stringify({ version: 1, mode: "demo", checked: [], ready: true }));
    localStorage.setItem(progressKey(project.slug), JSON.stringify({ version: 1, activeStep: 2, completed: [1, 2], score: 20 }));
    render(<Quest project={project} onHome={vi.fn()} />);
    vi.mocked(window.scrollTo).mockClear();

    fireEvent.click(screen.getByRole("button", { name: /уровень 1:/i }));
    expect(screen.getByRole("button", { name: /^← назад$/i })).toBeDisabled();
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "smooth" });

    fireEvent.click(screen.getByRole("button", { name: /^продолжить/i }));
    expect(screen.getByRole("button", { name: /уровень 2:/i })).toHaveAttribute("aria-current", "step");
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "smooth" });

    fireEvent.click(screen.getByRole("button", { name: /^← назад$/i }));
    expect(screen.getByRole("button", { name: /уровень 1:/i })).toHaveAttribute("aria-current", "step");
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "smooth" });
  });

  it("finishes the last desktop level with a factual completion date", () => {
    const project = getQuestProject("pressure-diary")!;
    const total = getProjectLevelCount(project);
    localStorage.setItem(preparationKey(project.slug), JSON.stringify({ version: 1, mode: "demo", checked: [], ready: true }));
    localStorage.setItem(progressKey(project.slug), JSON.stringify({
      version: 1,
      activeStep: total,
      completed: Array.from({ length: total - 1 }, (_, index) => index + 1),
      score: (total - 1) * 10,
    }));
    render(<Quest project={project} onHome={vi.fn()} />);

    expect(screen.getByRole("button", { name: /^← назад$/i })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: /завершить квест/i }));

    const saved = JSON.parse(localStorage.getItem(progressKey(project.slug))!);
    expect(saved.completed).toHaveLength(total);
    expect(saved.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(screen.getByRole("button", { name: /квест пройден/i })).toBeDisabled();
  });

  it("keeps the ready mobile step full width and opens its level map only on demand", async () => {
    const { container } = render(<MobileQuest project={getQuestProject("recipe-book")!} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));

    const workspace = container.querySelector<HTMLElement>('[data-quest-workspace="mobile"]');
    expect(workspace).not.toBeNull();
    expect(workspace!.tagName).toBe("MAIN");
    expect(workspace!.querySelector(".mobile-quest-step-card")).not.toBeNull();
    expect(workspace!.querySelector(".mobile-level-rail")).toBeNull();
    expect(screen.queryByRole("navigation", { name: /карта уровней/i })).not.toBeInTheDocument();

    const trigger = screen.getByRole("button", { name: /открыть карту уровней/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("navigation", { name: /карта уровней/i })).toBeInTheDocument();
    const close = screen.getByRole("button", { name: /закрыть карту уровней/i });
    expect(close).toHaveTextContent(/закрыть/i);
    expect(close).toHaveFocus();
    fireEvent.click(close);
    expect(screen.queryByRole("navigation", { name: /карта уровней/i })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("keeps the mobile step h1 before the open map h2 in document order", () => {
    localStorage.setItem(preparationKey("mobile:recipe-book"), JSON.stringify({ version: 1, mode: "demo", checked: [], ready: true }));
    render(<MobileQuest project={getQuestProject("recipe-book")!} onHome={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /открыть карту уровней/i }));

    const stepHeading = screen.getByRole("heading", { level: 1 });
    const mapHeading = screen.getByRole("heading", { level: 2, name: /карта уровней/i });
    expect(stepHeading.compareDocumentPosition(mapHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("preserves the desktop information order and mobile-only lesson tools", () => {
    localStorage.setItem(progressKey("mobile:api-keys"), JSON.stringify({
      version: 1,
      activeStep: 9,
      completed: Array.from({ length: 8 }, (_, index) => index + 1),
      score: 80,
    }));
    const api = render(<MobileQuest project={getQuestProject("api-keys")!} onHome={vi.fn()} />);
    const workspace = api.container.querySelector<HTMLElement>('[data-quest-workspace="mobile"]')!;

    expect(workspace.querySelector(".mobile-capability")).toHaveTextContent(/действия на компьютере/i);
    expect(workspace.querySelector(".mobile-action")).not.toBeNull();
    expect(within(workspace).getByRole("region", { name: /делайте по картинкам/i })).toBeInTheDocument();
    expect(within(workspace).getByRole("heading", { name: /готовая команда для Codex/i })).toBeInTheDocument();
    expect(within(workspace).getByRole("button", { name: /увеличить мобильный пример/i })).toBeInTheDocument();

    fireEvent.click(within(workspace).getByRole("button", { name: /^нужна помощь$/i }));
    const mandatory = [
      workspace.querySelector(".mobile-quest-step-heading"),
      workspace.querySelector(".mobile-why"),
      workspace.querySelector(".mobile-do"),
      workspace.querySelector(".mobile-prompt"),
      workspace.querySelector(".quest-guide"),
      workspace.querySelector(".mobile-result"),
      workspace.querySelector(".mobile-quest-help"),
      workspace.querySelector(".mobile-quest-step-actions"),
    ];
    expect(mandatory.every(Boolean)).toBe(true);
    const ordered = [
      mandatory[0],
      mandatory[1],
      mandatory[2],
      workspace.querySelector(".beginner-terms"),
      mandatory[3],
      mandatory[4],
      workspace.querySelector(".quest-links"),
      mandatory[5],
      mandatory[6],
      mandatory[7],
    ].filter((node): node is Element => Boolean(node));
    for (let index = 0; index < ordered.length - 1; index += 1) {
      expect(ordered[index]!.compareDocumentPosition(ordered[index + 1]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }

    api.unmount();
    localStorage.setItem(progressKey("mobile:server-152fz"), JSON.stringify({ version: 1, activeStep: 9, completed: [1, 2, 3, 4, 5, 6, 7, 8], score: 80 }));
    const server = render(<MobileQuest project={getQuestProject("server-152fz")!} onHome={vi.fn()} />);
    const serverPrompt = server.container.querySelector(".mobile-prompt")!;
    const serverLinks = server.container.querySelector(".quest-links")!;
    const serverResult = server.container.querySelector(".mobile-result")!;
    expect(serverLinks).toHaveTextContent(/152-ФЗ|AdminVPS/i);
    expect(serverPrompt.compareDocumentPosition(serverLinks) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(serverLinks.compareDocumentPosition(serverResult) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("marks mobile levels current, locked and done, then closes the map after selection", async () => {
    const project = getQuestProject("pressure-diary")!;
    const { container } = render(<MobileQuest project={project} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
    const trigger = screen.getByRole("button", { name: /открыть карту уровней/i });
    fireEvent.click(trigger);

    let map = screen.getByRole("navigation", { name: /карта уровней/i });
    const first = within(map).getByRole("button", { name: /уровень 1:/i });
    const second = within(map).getByRole("button", { name: /уровень 2:/i });
    expect(first).toHaveAttribute("aria-current", "step");
    expect(second).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /я сделала — продолжить/i }));
    expect(screen.queryByRole("navigation", { name: /карта уровней/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /открыть карту уровней/i }));
    map = screen.getByRole("navigation", { name: /карта уровней/i });
    expect(within(map).getByRole("button", { name: /уровень 1:.*пройден/i })).toBeEnabled();
    expect(within(map).getByRole("button", { name: /уровень 2:/i })).toHaveAttribute("aria-current", "step");

    vi.mocked(window.scrollTo).mockClear();
    fireEvent.click(within(map).getByRole("button", { name: /уровень 1:.*пройден/i }));
    expect(screen.queryByRole("navigation", { name: /карта уровней/i })).not.toBeInTheDocument();
    expect(container.querySelector(".mobile-quest-step-heading")).toHaveTextContent(/уровень 1 из/i);
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "smooth" });
    await waitFor(() => expect(screen.getByRole("button", { name: /открыть карту уровней/i })).toHaveFocus());

    fireEvent.click(screen.getByRole("button", { name: /открыть карту уровней/i }));
    const revisited = screen.getByRole("button", { name: /уровень 1:.*текущий.*пройден/i });
    expect(revisited).toHaveAttribute("aria-current", "step");
    expect(revisited).toHaveTextContent(/сейчас.*пройден/i);
  });

  it("resets transient mobile workspace state when the route reuses the component for another project", () => {
    localStorage.setItem(preparationKey("mobile:pressure-diary"), JSON.stringify({ version: 1, mode: "demo", checked: [], ready: true }));
    localStorage.setItem(preparationKey("mobile:recipe-book"), JSON.stringify({ version: 1, mode: "demo", checked: [], ready: true }));
    const { rerender } = render(<MobileQuest project={getQuestProject("pressure-diary")!} onHome={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /открыть карту уровней/i }));
    fireEvent.click(screen.getByRole("button", { name: /^нужна помощь$/i }));
    fireEvent.click(screen.getByRole("button", { name: /увеличить мобильный пример/i }));
    expect(screen.getByRole("navigation", { name: /карта уровней/i })).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: /увеличенный мобильный пример/i })).toBeInTheDocument();

    rerender(<MobileQuest project={getQuestProject("recipe-book")!} onHome={vi.fn()} />);

    expect(screen.queryByRole("navigation", { name: /карта уровней/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /увеличенный мобильный пример/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^нужна помощь$/i })).toHaveAttribute("aria-expanded", "false");
  });

  it("uses one mobile step opener for a completed revisit, continuation and back", () => {
    const project = getQuestProject("pressure-diary")!;
    localStorage.setItem(preparationKey("mobile:pressure-diary"), JSON.stringify({ version: 1, mode: "demo", checked: [], ready: true }));
    localStorage.setItem(progressKey("mobile:pressure-diary"), JSON.stringify({ version: 1, activeStep: 2, completed: [1, 2], score: 20 }));
    render(<MobileQuest project={project} onHome={vi.fn()} />);
    vi.mocked(window.scrollTo).mockClear();

    fireEvent.click(screen.getByRole("button", { name: /открыть карту уровней/i }));
    fireEvent.click(screen.getByRole("button", { name: /уровень 1:.*пройден/i }));
    expect(screen.getByRole("button", { name: /^← назад$/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /^продолжить/i }));
    expect(document.querySelector(".mobile-quest-step-heading")).toHaveTextContent(/уровень 2 из/i);
    fireEvent.click(screen.getByRole("button", { name: /^← назад$/i }));
    expect(document.querySelector(".mobile-quest-step-heading")).toHaveTextContent(/уровень 1 из/i);
    expect(window.scrollTo).toHaveBeenCalledTimes(3);
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "smooth" });
  });

  it("finishes the mobile quest in its own progress namespace with a completion date", () => {
    const project = getQuestProject("pressure-diary")!;
    const total = getProjectLevelCount(project);
    localStorage.setItem(preparationKey("mobile:pressure-diary"), JSON.stringify({ version: 1, mode: "demo", checked: [], ready: true }));
    localStorage.setItem(progressKey("mobile:pressure-diary"), JSON.stringify({
      version: 1,
      activeStep: total,
      completed: Array.from({ length: total - 1 }, (_, index) => index + 1),
      score: (total - 1) * 10,
    }));
    localStorage.setItem(progressKey(project.slug), JSON.stringify({ version: 1, activeStep: 1, completed: [], score: 0 }));
    render(<MobileQuest project={project} onHome={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /завершить квест/i }));
    const mobileSaved = JSON.parse(localStorage.getItem(progressKey("mobile:pressure-diary"))!);
    expect(mobileSaved.completed).toHaveLength(total);
    expect(mobileSaved.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(localStorage.getItem(progressKey(project.slug))).toBe(JSON.stringify({ version: 1, activeStep: 1, completed: [], score: 0 }));
    expect(screen.getByRole("button", { name: /квест пройден/i })).toBeDisabled();
  });

  it("uses native accessible screenshot and guide dialogs in the mobile workspace", () => {
    render(<MobileQuest project={getQuestProject("api-keys")!} onHome={vi.fn()} />);
    const screenshotOpener = screen.getByRole("button", { name: /увеличить мобильный пример/i });
    screenshotOpener.focus();
    fireEvent.click(screenshotOpener);

    const screenshotDialog = screen.getByRole("dialog", { name: /увеличенный мобильный пример/i });
    expect(screenshotDialog.tagName).toBe("DIALOG");
    expect(screenshotDialog).not.toHaveAttribute("aria-modal");
    expect(screen.getByRole("button", { name: /закрыть увеличенный мобильный пример/i })).toHaveFocus();
    fireEvent.keyDown(screenshotDialog, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: /увеличенный мобильный пример/i })).not.toBeInTheDocument();
    expect(screenshotOpener).toHaveFocus();

    const guideOpener = screen.getByRole("button", { name: /увеличить кадр 2:/i });
    guideOpener.focus();
    fireEvent.click(guideOpener);
    expect(screen.getByRole("dialog", { name: /увеличенный кадр 2/i }).tagName).toBe("DIALOG");
    fireEvent.click(screen.getByRole("button", { name: /закрыть увеличенный кадр 2/i }));
    expect(guideOpener).toHaveFocus();
  });

  it("keeps preparation and setup choices outside the workspace, then opens server and install quests inside it", async () => {
    const preparation = render(<Quest project={getQuestProject("pressure-diary")!} onHome={vi.fn()} />);
    expect(preparation.container.querySelector('[data-quest-workspace="desktop"]')).toBeNull();
    expect(screen.getByRole("heading", { name: /на каких данных будем работать/i })).toBeInTheDocument();
    preparation.unmount();

    const server = render(<Quest project={getQuestProject("server-152fz")!} onHome={vi.fn()} />);
    expect(server.container.querySelector('[data-quest-workspace="desktop"]')).not.toBeNull();
    expect(screen.getByRole("heading", { name: /скидка 60% на сервер/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /скачать полную инструкцию в PDF/i })).toBeInTheDocument();
    server.unmount();

    const install = render(<Quest project={getQuestProject("install-codex")!} onHome={vi.fn()} />);
    expect(install.container.querySelector('[data-quest-workspace="desktop"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /выбрать Mac/i }));
    expect(await screen.findByText("Компьютер: Mac")).toBeInTheDocument();
    expect(install.container.querySelector('[data-quest-workspace="desktop"]')).not.toBeNull();
  });

  it("uses the pink dashboard for academy surfaces and preserves tactile quests", async () => {
    const { container, rerender } = render(<Academy />);

    expect(await screen.findByRole("main")).toHaveAttribute("data-visual-theme", "elina-burgundy");

    rerender(<Quest project={getQuestProject("pressure-diary")!} onHome={vi.fn()} />);
    expect(container.querySelector('main.quest-shell[data-visual-theme="tactile-album"]')).not.toBeNull();

    rerender(<MobileAcademy onOpen={vi.fn()} />);
    expect(await screen.findByRole("main")).toHaveAttribute("data-dashboard-format", "mobile");

    rerender(<MobileQuest project={getQuestProject("pressure-diary")!} onHome={vi.fn()} />);
    expect(container.querySelector('main.mobile-quest-shell[data-visual-theme="tactile-album"]')).not.toBeNull();
  });

  it("renders the API lesson as an internal quest link", () => {
    render(<QuestLinks links={[{ label: "Сначала пройти квест «Добавляем API-ключи»", href: "?quest=api-keys", note: "Безопасная настройка секрета." }]} />);

    expect(screen.getByRole("link", { name: /добавляем API-ключи/i })).toHaveAttribute("href", "?quest=api-keys");
    expect(screen.getByRole("link", { name: /добавляем API-ключи/i })).not.toHaveAttribute("target", "_blank");
  });

  it("shows the AdminVPS discount and full PDF guide in both server quest formats", () => {
    const project = getQuestProject("server-152fz")!;
    render(<><Quest project={project} onHome={vi.fn()} /><MobileQuest project={project} onHome={vi.fn()} /></>);

    expect(screen.getAllByRole("heading", { name: /скидка 60% на сервер/i })).toHaveLength(2);
    expect(screen.getAllByText("SUBMARINE123")).toHaveLength(2);
    expect(screen.getAllByRole("img", { name: /пример применения промокода/i })).toHaveLength(2);
    for (const link of screen.getAllByRole("link", { name: /скачать полную инструкцию в PDF/i })) {
      expect(link).toHaveAttribute("href", "/materials/adminvps-vps-instruction.pdf");
    }
  });

  it("shows the AdminVPS discount only on the first server page", () => {
    const project = getQuestProject("server-152fz")!;
    const desktop = render(<Quest project={project} onHome={vi.fn()} />);

    expect(screen.getByRole("heading", { name: /скидка 60% на сервер/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /я сделала — продолжить/i }));
    expect(screen.queryByRole("heading", { name: /скидка 60% на сервер/i })).not.toBeInTheDocument();

    desktop.unmount();
    localStorage.clear();
    render(<MobileQuest project={project} onHome={vi.fn()} />);
    expect(screen.getByRole("heading", { name: /скидка 60% на сервер/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /я сделала — продолжить/i }));
    expect(screen.queryByRole("heading", { name: /скидка 60% на сервер/i })).not.toBeInTheDocument();
  });

  it("shows the server lesson as nine fast levels without the repeated guide gallery", () => {
    const project = getQuestProject("server-152fz")!;
    const { rerender } = render(<Quest project={project} onHome={vi.fn()} />);

    expect(screen.getByText("9 коротких уровней")).toBeInTheDocument();
    expect(screen.getByText("0 / 9")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /делайте по картинкам/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /увеличить пример результата/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /я сделала — продолжить/i }));
    expect(screen.getByRole("button", { name: /увеличить пример результата/i })).toBeInTheDocument();

    rerender(<MobileQuest project={project} onHome={vi.fn()} />);
    expect(screen.getByText("0 из 9")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /увеличить мобильный пример/i })).not.toBeInTheDocument();
  });

  it("chooses and restores one short Codex installation path", async () => {
    const project = getQuestProject("install-codex")!;
    const first = render(<Quest project={project} onHome={vi.fn()} />);

    expect(await screen.findByRole("heading", { name: /выберите свой компьютер/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /выбрать Mac/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /выбрать Windows/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /выбрать Mac/i }));
    expect(await screen.findByText("6 коротких уровней")).toBeInTheDocument();
    expect(screen.getByText("Компьютер: Mac")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /делайте по картинкам/i })).not.toBeInTheDocument();
    expect(localStorage.getItem("submarine:setup-platform:desktop:install-codex")).toBe("mac");
    first.unmount();

    render(<Quest project={project} onHome={vi.fn()} />);
    expect(await screen.findByText("Компьютер: Mac")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /выберите свой компьютер/i })).not.toBeInTheDocument();
  });

  it("resets the Codex installation path back to Mac or Windows choice", async () => {
    const project = getQuestProject("install-codex")!;
    localStorage.setItem("submarine:setup-platform:desktop:install-codex", "windows");
    localStorage.setItem(progressKey("install-codex:windows"), JSON.stringify({ version: 1, activeStep: 2, completed: [1], score: 10 }));
    localStorage.setItem(progressKey("planner"), JSON.stringify({ version: 1, activeStep: 2, completed: [1], score: 10 }));
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<Quest project={project} onHome={vi.fn()} />);
    expect(await screen.findByText("Компьютер: Windows")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /сбросить проект и начать с нуля/i }));

    expect(await screen.findByRole("heading", { name: /выберите свой компьютер/i })).toBeInTheDocument();
    expect(localStorage.getItem("submarine:setup-platform:desktop:install-codex")).toBeNull();
    expect(localStorage.getItem(progressKey("install-codex:windows"))).toBeNull();
    expect(localStorage.getItem(progressKey("planner"))).not.toBeNull();
  });

  it("labels authentic server screens and the missing backup screen honestly", () => {
    const project = getQuestProject("server-152fz")!;
    localStorage.setItem(progressKey("server-152fz"), JSON.stringify({ version: 1, activeStep: 2, completed: [1], score: 10 }));
    const desktop = render(<Quest project={project} onHome={vi.fn()} />);

    expect(screen.getByText("реальный экран")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /реальный экран AdminVPS.+выбрала сервер в России/i })).toHaveAttribute(
      "src",
      "/screens/server-152fz/real-step-02.png",
    );
    desktop.unmount();

    localStorage.setItem(progressKey("mobile:server-152fz"), JSON.stringify({ version: 1, activeStep: 7, completed: [1, 2, 3, 4, 5, 6], score: 60 }));
    render(<MobileQuest project={project} onHome={vi.fn()} />);
    expect(screen.getByText("заглушка для замены")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /заглушка.+резервн.+коп/i })).toHaveAttribute(
      "src",
      "/screens/server-152fz/placeholder-step-07.svg",
    );
    expect(screen.getAllByRole("link", { name: /открыть полную PDF-инструкцию/i })).toHaveLength(1);
  });

  it("formats long lesson instructions into readable blocks on desktop and mobile", () => {
    const project = getQuestProject("server-152fz")!;
    const finishedBeforeLast = { version: 1, activeStep: 8, completed: [1, 2, 3, 4, 5, 6, 7], score: 70 };
    localStorage.setItem(progressKey("server-152fz"), JSON.stringify(finishedBeforeLast));

    const desktop = render(<Quest project={project} onHome={vi.fn()} />);
    const desktopAction = desktop.container.querySelector<HTMLElement>('[data-lesson-copy="action"]');
    expect(desktopAction).not.toBeNull();
    expect(desktopAction!.querySelectorAll("p").length).toBeGreaterThanOrEqual(3);
    expect(within(desktopAction!).getAllByRole("listitem").length).toBeGreaterThanOrEqual(3);
    expect(within(desktopAction!).getByText(/что сделать/i, { selector: "strong" })).toBeInTheDocument();
    desktop.unmount();

    localStorage.setItem(progressKey("mobile:server-152fz"), JSON.stringify(finishedBeforeLast));
    const mobile = render(<MobileQuest project={project} onHome={vi.fn()} />);
    const mobileAction = mobile.container.querySelector<HTMLElement>('[data-lesson-copy="action"]');
    expect(mobileAction).not.toBeNull();
    expect(mobileAction!.querySelectorAll("p").length).toBeGreaterThanOrEqual(3);
    expect(within(mobileAction!).getAllByRole("listitem").length).toBeGreaterThanOrEqual(3);
    expect(within(mobileAction!).getByText(/что сделать/i, { selector: "strong" })).toBeInTheDocument();
  });

  it("keeps content-specific finished prototypes on dashboard cards", async () => {
    const { container } = render(<Academy />);
    expect(await screen.findByRole("img", { name: /сервис проекта «планирование»/i })).toHaveAttribute(
      "src",
      "/covers/planner.webp",
    );
    const agentSlide = container.querySelector('.bundle-preview-slide[data-format="agent"]');
    expect(agentSlide).toHaveAttribute("aria-hidden", "true");
    expect(agentSlide?.querySelector("img")).toHaveAttribute(
      "src",
      "/covers/day-planner-agent.webp",
    );
    expect(container.querySelector('.project-preview img[src*="/screens/"]')).toBeNull();
    expect(container.querySelectorAll(".project-preview img").length).toBeGreaterThan(4);
  });

  it("shows three different reference roles and the resulting original design", () => {
    const project = getQuestProject("unique-design")!;
    const { container, rerender } = render(<ExpectedScene project={project} step={8} />);

    expect(container.querySelector('[data-design-marker="three-reference-original-design"]')).not.toBeNull();
    expect(screen.getByText(/логика блоков/i)).toBeInTheDocument();
    expect(screen.getByText(/настроение и типографика/i)).toBeInTheDocument();
    expect(screen.getByText(/одна деталь/i)).toBeInTheDocument();
    expect(screen.getByText(/моя версия/i)).toBeInTheDocument();

    rerender(<MobileExpectedScene project={project} step={14} />);
    expect(container.querySelector('[data-design-marker="three-reference-original-design"]')).not.toBeNull();
    expect(screen.getAllByText(/390 px/i).length).toBeGreaterThan(0);
  });

  it("renders every mobile collection screen without asking for prepared files", () => {
    const { container, rerender } = render(<MobileExpectedScene project={questProjects[0]} step={routeStepFor(questProjects[0], 4)} />);
    const prepared = new Set(getPreparationProfileSlugs());
    for (const project of questProjects) {
      rerender(<MobileExpectedScene project={project} step={routeStepFor(project, 4)} />);
      if (prepared.has(project.slug)) {
        const profile = getPreparationProfile(project.slug);
        expect(container, project.slug).not.toHaveTextContent(profile.sourceFile);
        expect(container, project.slug).not.toHaveTextContent(profile.rulesFile);
      }
      expect(container, project.slug).toHaveTextContent(project.title);
    }
  });

  it("renders a content-specific final-product cover for the first ten projects", () => {
    const featuredProjects = firstCoverPrototypeSlugs.filter((slug) => !["family-expenses", "planner", "idea-vault", "child-schedule"].includes(slug)).map((slug) => getQuestProject(slug)!);
    const { container } = render(<>{featuredProjects.map((project) => <ExpectedScene key={project.slug} project={project} step={routeStepFor(project, 14)} />)}</>);

    for (const project of featuredProjects) {
      const spec = getFirstCoverPrototypeSpec(project.slug);
      const prototype = container.querySelector(`[data-cover-marker="${spec.marker}"]`);
      expect(prototype, project.slug).not.toBeNull();
      expect(prototype).toHaveTextContent(spec.headline);
      expect(prototype).toHaveTextContent(spec.metric);
    }
  });

  it("renders distinct family-budget stages instead of a generic service mockup", () => {
    const project = getQuestProject("family-expenses")!;
    const stages = new Map([[2, "concept"], [7, "expense"], [10, "feature"], [15, "client-copy"], [16, "client-brief"], [17, "portfolio"]]);
    const { container } = render(<>{[...stages.keys()].map((step) => <ExpectedScene key={`d-${step}`} project={project} step={routeStepFor(project, step)} />)}{[...stages.keys()].map((step) => <MobileExpectedScene key={`m-${step}`} project={project} step={routeStepFor(project, step)} />)}</>);

    for (const [step, stage] of stages) {
      expect(container.querySelectorAll(`[data-original-service="family-expenses"][data-original-stage="${stage}"]`), `step ${step}`).toHaveLength(2);
    }
    expect(container.querySelectorAll('[data-palette-choice="Мятная свежесть"]')).toHaveLength(2);
    expect(container.querySelectorAll(".service-scene")).toHaveLength(0);
  });

  it("renders distinct planner stages with a personal and client version", () => {
    const project = getQuestProject("planner")!;
    const stages = new Map([[2, "concept"], [7, "task"], [8, "focus"], [10, "feature"], [15, "client-copy"], [16, "client-brief"], [17, "portfolio"]]);
    const { container } = render(<>{[...stages.keys()].map((step) => <ExpectedScene key={`d-${step}`} project={project} step={routeStepFor(project, step)} />)}{[...stages.keys()].map((step) => <MobileExpectedScene key={`m-${step}`} project={project} step={routeStepFor(project, step)} />)}</>);

    for (const [step, stage] of stages) {
      expect(container.querySelectorAll(`[data-original-service="planner"][data-original-stage="${stage}"]`), `step ${step}`).toHaveLength(2);
    }
    expect(container.querySelectorAll(".service-scene")).toHaveLength(0);
  });

  it("renders distinct idea-vault stages from capture to client portfolio", () => {
    const project = getQuestProject("idea-vault")!;
    const stages = new Map([[2,"concept"],[7,"capture"],[8,"organize"],[10,"feature"],[11,"search"],[15,"client-copy"],[16,"client-brief"],[17,"portfolio"]]);
    const { container } = render(<>{[...stages.keys()].map((step)=><ExpectedScene key={`d-${step}`} project={project} step={routeStepFor(project, step)}/>)}{[...stages.keys()].map((step)=><MobileExpectedScene key={`m-${step}`} project={project} step={routeStepFor(project, step)}/>)}</>);
    for (const [step,stage] of stages) expect(container.querySelectorAll(`[data-original-service="idea-vault"][data-original-stage="${stage}"]`),`step ${step}`).toHaveLength(2);
    expect(container.querySelectorAll(".service-scene")).toHaveLength(0);
  });

  it("renders distinct child-schedule stages from week planning to client portfolio", () => {
    const project = getQuestProject("child-schedule")!;
    const stages = new Map([[2,"concept"],[7,"activity"],[8,"week"],[10,"feature"],[11,"morning"],[15,"client-copy"],[16,"client-brief"],[17,"portfolio"]]);
    const { container } = render(<>{[...stages.keys()].map((step)=><ExpectedScene key={`d-${step}`} project={project} step={routeStepFor(project, step)}/>)}{[...stages.keys()].map((step)=><MobileExpectedScene key={`m-${step}`} project={project} step={routeStepFor(project, step)}/>)}</>);
    for (const [step,stage] of stages) expect(container.querySelectorAll(`[data-original-service="child-schedule"][data-original-stage="${stage}"]`),`step ${step}`).toHaveLength(2);
    expect(container.querySelectorAll(".service-scene")).toHaveLength(0);
  });

  it("shows both click-by-click pictures and the final project prototype in an original quest", () => {
    render(<Quest project={getQuestProject("family-expenses")!} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
    const guide = screen.getByRole("region", { name: /делайте по картинкам/i });
    expect(within(guide).getAllByRole("img", { name: /кадр \d+/i })).toHaveLength(3);
    expect(screen.getByRole("img", { name: /прототип уровня 1/i })).toHaveAttribute("src", "/screens/family-expenses/step-01.png");
  });

  it("renders a different functional result screen for every AI agent", () => {
    const standardMarkers = new Map([
      ["day-planner-agent", "day-plan-timeline"],
      ["home-organizer-agent", "home-week-plan"],
      ["meal-planning-agent", "three-day-family-menu"],
      ["study-agent", "learning-explanation-test"],
      ["idea-analysis-agent", "idea-clusters-score"],
      ["expense-agent", "expense-categories-summary"],
      ["family-schedule-agent", "family-week-calendar"],
      ["habit-agent", "gentle-habit-streak"],
      ["brief-agent", "project-brief-completeness"],
      ["content-agent", "expert-material-drafts"],
      ["expert-assistant-agent", "expert-base-meeting-answer"],
      ["administrator-agent", "admin-rules-handoff"],
      ["consultant-agent", "knowledge-answer-escalation"],
    ]);
    const specialMarkers = new Map([
      ["online-school-agent", "school-student-route"],
      ["event-organizer-agent", "event-control-board"],
      ["client-care-agent", "client-care-workspace"],
      ["fairy-team-agent", "fairy-team-flow"],
    ]);
    const agents = questProjects.filter((project) => project.kind === "agent" && !["carousel-agent", "threads-agent", "webinar-moderator-agent"].includes(project.slug));
    const { container } = render(<>{agents.map((project) => <ExpectedScene key={project.slug} project={project} step={routeStepFor(project, 14)} />)}</>);

    expect(agents).toHaveLength(17);
    for (const [slug, marker] of standardMarkers) {
      expect(container.querySelector(`[data-agent-cover-marker="${marker}"]`), slug).not.toBeNull();
    }
    for (const [slug, marker] of specialMarkers) {
      expect(container.querySelector(`[data-third-cover-marker="${marker}"]`), slug).not.toBeNull();
    }
    expect(container.querySelectorAll(".agent-prototype")).toHaveLength(0);
  });

  it("renders exact final-product prototypes for the four source-backed projects on desktop and mobile", () => {
    const expectations = [
      ["carousel-agent", "carousel", ["PNG-альбом", "11 стилей", "Переделать слайд"]],
      ["threads-agent", "threads", ["10 тредов", "Не беру", "Уже выложила"]],
      ["webinar-moderator-agent", "webinar", ["observe", "ВОПРОС ИЗ ЧАТА", "Ответить"]],
      ["family-health-hub", "health", ["ПРОФИЛИ СЕМЬИ", "Неразобранные", "Не ставит диагноз"]],
    ] as const;
    const projects = expectations.map(([slug]) => getQuestProject(slug)!);
    const { container } = render(<>{projects.map((project) => <ExpectedScene key={`d-${project.slug}`} project={project} step={routeStepFor(project, 14)} />)}{projects.map((project) => <MobileExpectedScene key={`m-${project.slug}`} project={project} step={routeStepFor(project, 14)} />)}</>);

    for (const [slug, marker, phrases] of expectations) {
      const prototypes = container.querySelectorAll(`[data-source-prototype="${marker}"]`);
      expect(prototypes, slug).toHaveLength(2);
      for (const phrase of phrases) {
        expect(prototypes[0], slug).toHaveTextContent(phrase);
        expect(prototypes[1], slug).toHaveTextContent(phrase);
      }
    }
  });

  it("renders a project-specific click guide for a source-backed quest", async () => {
    window.history.replaceState({}, "", "/?capture-guide=threads-agent--real--step-11--frame-02");
    render(<AppEntry />);
    expect(await screen.findByText(/получила подборку по команде \/now/i)).toBeInTheDocument();
    expect(document.querySelector('[data-original-guide="threads-agent"]')).toBeInTheDocument();
    expect(document.querySelector('[data-source-prototype="threads"]')).toBeInTheDocument();
  });

  it("renders a unique content-specific cover for the following site projects", () => {
    const featuredProjects = thirdCoverPrototypeSlugs.map((slug) => getQuestProject(slug)!);
    const { container } = render(<>{featuredProjects.map((project) => <ExpectedScene key={project.slug} project={project} step={routeStepFor(project, 14)} />)}</>);

    for (const project of featuredProjects) {
      const spec = getThirdCoverPrototypeSpec(project.slug);
      const prototype = container.querySelector(`[data-third-cover-marker="${spec.marker}"]`);
      expect(prototype, project.slug).not.toBeNull();
      expect(prototype).toHaveTextContent(spec.headline);
      expect(prototype).toHaveTextContent(spec.metric);
    }
  });

  it("renders a unique content-specific cover for every project through the course finale", () => {
    const featuredProjects = finalCoverPrototypeSlugs.map((slug) => getQuestProject(slug)!);
    const { container } = render(<>{featuredProjects.map((project) => <ExpectedScene key={project.slug} project={project} step={routeStepFor(project, 14)} />)}</>);

    for (const project of featuredProjects) {
      const spec = getFinalCoverPrototypeSpec(project.slug);
      const prototype = container.querySelector(`[data-final-cover-marker="${spec.marker}"]`);
      expect(prototype, project.slug).not.toBeNull();
      expect(prototype).toHaveTextContent(spec.headline);
      expect(prototype).toHaveTextContent(spec.metric);
    }
  });

  it("unlocks quest levels sequentially and saves project-specific progress", () => {
    const project = getQuestProject("planner")!;
    render(<Quest project={project} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
    expect(screen.getAllByRole("button", { name: /уровень/i })).toHaveLength(buildQuest(project).length);
    expect(screen.getByRole("button", { name: /уровень 2/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /я сделала/i }));
    expect(screen.getByRole("button", { name: /уровень 2/i })).toBeEnabled();
    expect(localStorage.getItem(progressKey("planner"))).toContain('"completed":[1]');
  });

  it("returns a desktop quest to the top after the learner presses next", async () => {
    render(<Quest project={getQuestProject("pressure-diary")!} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
    vi.mocked(window.scrollTo).mockClear();

    fireEvent.click(screen.getByRole("button", { name: /я сделала — продолжить/i }));

    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" }));
    expect(screen.getByRole("button", { name: /уровень 2/i })).toBeEnabled();
  });

  it("returns a mobile quest to the top immediately after next", async () => {
    render(<MobileQuest project={getQuestProject("child-schedule")!} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
    vi.mocked(window.scrollTo).mockClear();

    fireEvent.click(screen.getByRole("button", { name: /я сделала — продолжить/i }));

    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" }));
    fireEvent.click(screen.getByRole("button", { name: /открыть карту уровней/i }));
    expect(screen.getByRole("button", { name: /уровень 2:/i })).toBeEnabled();
  });

  it("opens contextual help inside a quest", () => {
    const project = getQuestProject("recipe-book")!;
    render(<Quest project={project} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
    fireEvent.click(screen.getByRole("button", { name: /нужна помощь/i }));
    expect(screen.getByText(/не создавайте папку сами/i)).toBeInTheDocument();
  });

  it("renders the full beginner level contract on desktop and mobile", async () => {
    const project = getQuestProject("recipe-book")!;
    const desktop = render(<Quest project={project} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));

    const desktopTerms = screen.getByRole("region", { name: /новые слова перед началом/i });
    const desktopWhy = desktop.container.querySelector(".quest-purpose")!;
    expect(desktopTerms).toHaveTextContent(/Codex.+создаёт, проверяет и исправляет/is);
    expect(desktopWhy.compareDocumentPosition(desktopTerms) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("прототип")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /я сделала — продолжить/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^нужна помощь$/i }));
    const desktopHelp = desktop.container.querySelector(".help-card")!;
    fireEvent.click(within(desktopHelp).getByRole("button", { name: /скопировать/i }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringMatching(/recipe-book.+не проси меня создавать/is)));
    desktop.unmount();

    const mobile = render(<MobileQuest project={project} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
    const mobileTerms = screen.getByRole("region", { name: /новые слова перед началом/i });
    const mobileWhy = mobile.container.querySelector(".mobile-why")!;
    expect(mobileWhy.compareDocumentPosition(mobileTerms) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("button", { name: /я сделала — продолжить/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^нужна помощь$/i }));
    fireEvent.click(screen.getByRole("button", { name: /скопировать команду помощи/i }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(expect.stringMatching(/мобильная помощь.+техническую часть/is)));
  });

  it("hydrates project cards without changing saved progress during hydration", async () => {
    const project = getQuestProject("planner")!;
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
    const project = getQuestProject("planner")!;
    render(<Quest project={project} onHome={vi.fn()} />);
    expect(screen.getByRole("heading", { name: /на каких данных будем работать/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /уровень 1:/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
    expect(screen.getAllByRole("button", { name: /уровень/i })).toHaveLength(buildQuest(project).length);
    expect(localStorage.getItem(preparationKey("planner"))).toContain('"mode":"demo"');
  });

  it("shows a reset action before data mode selection on desktop and mobile", () => {
    const project = getQuestProject("planner")!;
    render(<><Quest project={project} onHome={vi.fn()} /><MobileQuest project={project} onHome={vi.fn()} /></>);

    expect(screen.getAllByRole("button", { name: /сбросить проект и начать с нуля/i })).toHaveLength(2);
  });

  it("cancels safely and then resets only the current desktop project", async () => {
    const current = getQuestProject("planner")!;
    localStorage.setItem(progressKey("planner"), JSON.stringify({ version: 1, activeStep: 2, completed: [1], score: 10 }));
    localStorage.setItem(preparationKey("planner"), JSON.stringify({ version: 1, mode: "demo", checked: [], ready: true }));
    localStorage.setItem(customizationKey("planner"), JSON.stringify({ audience: "Моя семья" }));
    localStorage.setItem(progressKey("recipe-book"), JSON.stringify({ version: 1, activeStep: 2, completed: [1], score: 10 }));
    const confirmReset = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<Quest project={current} onHome={vi.fn()} />);
    const reset = await screen.findByRole("button", { name: /сбросить проект и начать с нуля/i });
    fireEvent.click(reset);

    expect(localStorage.getItem(progressKey("planner"))).not.toBeNull();
    expect(localStorage.getItem(preparationKey("planner"))).not.toBeNull();
    expect(localStorage.getItem(customizationKey("planner"))).not.toBeNull();

    confirmReset.mockReturnValue(true);
    fireEvent.click(reset);

    expect(confirmReset).toHaveBeenLastCalledWith(expect.stringMatching(/остальные проекты сохранятся/i));
    expect(localStorage.getItem(progressKey("planner"))).toBeNull();
    expect(localStorage.getItem(preparationKey("planner"))).toBeNull();
    expect(localStorage.getItem(customizationKey("planner"))).toBeNull();
    expect(localStorage.getItem(progressKey("recipe-book"))).not.toBeNull();
    expect(screen.getByRole("heading", { name: /на каких данных будем работать/i })).toBeInTheDocument();
    confirmReset.mockRestore();
  });

  it("resets the mobile project without touching its desktop version", async () => {
    const project = getQuestProject("planner")!;
    localStorage.setItem(progressKey("mobile:planner"), JSON.stringify({ version: 1, activeStep: 2, completed: [1], score: 10 }));
    localStorage.setItem(preparationKey("mobile:planner"), JSON.stringify({ version: 1, mode: "demo", checked: [], ready: true }));
    localStorage.setItem(customizationKey("mobile:planner"), JSON.stringify({ audience: "Моя семья" }));
    localStorage.setItem(progressKey("planner"), JSON.stringify({ version: 1, activeStep: 2, completed: [1], score: 10 }));
    const confirmReset = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<MobileQuest project={project} onHome={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /сбросить проект и начать с нуля/i }));

    expect(localStorage.getItem(progressKey("mobile:planner"))).toBeNull();
    expect(localStorage.getItem(preparationKey("mobile:planner"))).toBeNull();
    expect(localStorage.getItem(customizationKey("mobile:planner"))).toBeNull();
    expect(localStorage.getItem(progressKey("planner"))).not.toBeNull();
    expect(screen.getByRole("heading", { name: /на каких данных будем работать/i })).toBeInTheDocument();
    confirmReset.mockRestore();
  });

  it("blocks a real-data quest until its personal checklist is complete", () => {
    render(<Quest project={getQuestProject("psychologist-site")!} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на реальных данных/i }));
    const checks = screen.getAllByRole("checkbox");
    expect(checks).toHaveLength(5);
    const start = screen.getByRole("button", { name: /готова отвечать Codex — начать квест/i });
    expect(start).toBeDisabled();
    checks.forEach((check) => fireEvent.click(check));
    expect(start).toBeEnabled();
    fireEvent.click(start);
    expect(screen.getAllByRole("button", { name: /уровень/i })).toHaveLength(buildQuest(getQuestProject("psychologist-site")!).length);
    expect(localStorage.getItem(preparationKey("psychologist-site"))).toContain('"ready":true');
  });

  it("does not make a family-expenses learner create folders or files by hand", () => {
    render(<Quest project={getQuestProject("family-expenses")!} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на реальных данных/i }));

    expect(screen.getByRole("heading", { name: /ничего заранее создавать не нужно/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Codex сам создаст папку, файлы и структуру/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/создайте.+(?:папк|файл)/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(4);

    const start = screen.getByRole("button", { name: /готова отвечать Codex — начать квест/i });
    expect(start).toBeDisabled();
    screen.getAllByRole("checkbox").forEach((checkbox) => fireEvent.click(checkbox));
    expect(start).toBeEnabled();
  });

  it("does not ask a pressure-diary learner to prepare a folder or data file", () => {
    render(<Quest project={getQuestProject("pressure-diary")!} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на реальных данных/i }));
    expect(screen.getByRole("heading", { name: /ничего заранее создавать не нужно/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Codex сам создаст проект pressure-diary, папки, файлы и нужные поля/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/мои-измерения\.csv|поля-дневника\.txt/i)).not.toBeInTheDocument();
  });

  it("opens the shared learning dashboard from the mobile format route", async () => {
    window.history.replaceState({}, "", "/?format=mobile");
    render(<AppEntry />);
    expect(await screen.findByText(/ваш следующий шаг/i)).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("data-dashboard-format", "mobile");
    expect(screen.getByRole("navigation", { name: /навигация Академии на телефоне/i })).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /сервис проекта «планирование»/i })).not.toHaveLength(0);
    screen.getAllByRole("img", { name: /сервис проекта «планирование»/i }).forEach((image) => {
      expect(image).toHaveAttribute("src", "/covers/planner.webp");
    });
  });

  it("stores phone progress separately and shows a safe Telegram fallback", () => {
    const project = getQuestProject("family-expenses")!;
    render(<MobileQuest project={project} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
    expect(screen.getByRole("heading", { name: /увидела, каким станет мой бюджет/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /открыть фею в telegram/i })).toBeDisabled();
    expect(screen.getByText(/Telegram называет оболочку ботом, но внутри неё работает ваш ИИ-агент/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /я сделала/i }));
    expect(localStorage.getItem(progressKey("mobile:family-expenses"))).toContain('"completed":[1]');
    expect(localStorage.getItem(progressKey("family-expenses"))).toBeNull();
  });

  it("lets a learner personalize the first four quests and restores her choice", () => {
    const project = getQuestProject("family-expenses")!;
    const { unmount } = render(<Quest project={project} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
    fireEvent.click(screen.getByRole("button", { name: /я сделала — продолжить/i }));

    expect(screen.getByRole("heading", { name: /соберите свой семейный бюджет/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Семья с детьми" }));
    fireEvent.click(screen.getByRole("radio", { name: "Куда ушли деньги" }));
    fireEvent.click(screen.getByRole("radio", { name: "Дни без покупок" }));
    expect(screen.getByRole("heading", { name: /^выберите цветовую гамму$/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /пудровое тепло/i }));
    expect(screen.getByLabelText(/живой предпросмотр/i)).toHaveTextContent("Куда ушли деньги");
    fireEvent.click(screen.getByRole("button", { name: /сохранить мою версию/i }));

    expect(screen.getByRole("status")).toHaveTextContent("Семья с детьми");
    expect(screen.getByRole("status")).toHaveTextContent("Дни без покупок");
    expect(screen.getByRole("status")).toHaveTextContent("Пудровое тепло");
    expect(localStorage.getItem(customizationKey("family-expenses"))).toContain("Семья с детьми");
    expect(localStorage.getItem(customizationKey("family-expenses"))).toContain("Пудровое тепло");
    unmount();

    render(<Quest project={project} onHome={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Семья с детьми");
    expect(screen.getByRole("radio", { name: "Дни без покупок" })).toBeChecked();
    expect(screen.getByRole("button", { name: /пудровое тепло/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("lets a learner assemble her own color palette without leaving the quest", () => {
    render(<Quest project={getQuestProject("family-expenses")!} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
    fireEvent.click(screen.getByRole("button", { name: /я сделала — продолжить/i }));

    fireEvent.click(screen.getByRole("button", { name: /собрать свою гамму/i }));
    fireEvent.change(screen.getByLabelText("Фон проекта"), { target: { value: "#fef1f6" } });
    fireEvent.change(screen.getByLabelText("Кнопки и акценты"), { target: { value: "#7b3655" } });
    fireEvent.click(screen.getByRole("button", { name: /сохранить мою версию/i }));

    expect(screen.getByRole("status")).toHaveTextContent("Моя гамма");
    expect(localStorage.getItem(customizationKey("family-expenses"))).toContain("#fef1f6");
    expect(localStorage.getItem(customizationKey("family-expenses"))).toContain("#7b3655");
  });

  it("keeps the phone customization separate from the computer quest", () => {
    localStorage.setItem(customizationKey("family-expenses"), JSON.stringify({
      audience: "Мы вдвоём",
      goal: "Остаток до конца месяца",
      name: "Бюджет пары",
      style: "Мятный порядок",
      tone: "Мягко и заботливо",
      feature: "Недельные конверты",
    }));

    render(<MobileQuest project={getQuestProject("family-expenses")!} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
    fireEvent.click(screen.getByRole("button", { name: /я сделала/i }));

    expect(screen.getByRole("heading", { name: /соберите свой семейный бюджет/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Я сама" })).toBeChecked();
    expect(localStorage.getItem(customizationKey("mobile:family-expenses"))).toBeNull();
  });

  it("walks a real home-helper learner through every click with pictures", () => {
    render(<Quest project={getQuestProject("home-helper")!} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на реальных данных/i }));
    expect(screen.queryByRole("img", { name: /подготовка home-helper/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Codex сам создаст проект home-helper, папки, файлы и нужные поля/i)).toBeInTheDocument();
    screen.getAllByRole("checkbox").forEach((checkbox) => fireEvent.click(checkbox));
    fireEvent.click(screen.getByRole("button", { name: /готова отвечать Codex — начать квест/i }));

    let guide = screen.getByRole("region", { name: /делайте по картинкам/i });
    expect(within(guide).getAllByRole("img", { name: /кадр \d+/i })).toHaveLength(4);
    expect(within(guide).getByRole("heading", { name: /откройте Codex/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /я сделала — продолжить/i }));
    fireEvent.click(screen.getByRole("button", { name: /я сделала — продолжить/i }));
    guide = screen.getByRole("region", { name: /делайте по картинкам/i });
    expect(within(guide).getAllByRole("img", { name: /кадр \d+/i })).toHaveLength(5);
    expect(within(guide).getByRole("heading", { name: /скопируйте команду опроса/i })).toBeInTheDocument();
    expect(within(guide).getByRole("heading", { name: /запустите разговор/i })).toBeInTheDocument();
    expect(within(guide).getByRole("heading", { name: /ответьте обычными словами/i })).toBeInTheDocument();
    expect(within(guide).getAllByText(/готово, если/i)).toHaveLength(5);
    expect(screen.queryByText(/вымышлен|демонстрацион|учебн/i)).not.toBeInTheDocument();
  });

  it("renders a dedicated arrow screenshot scene for each home-helper action", async () => {
    window.history.replaceState({}, "", "/?capture-guide=home-helper--real--step-03--frame-03");
    render(<AppEntry />);
    expect(await screen.findAllByRole("heading", { name: /ответьте обычными словами/i })).not.toHaveLength(0);
    expect(screen.getByText(/пишите сюда/i)).toBeInTheDocument();
    expect(document.querySelector("#capture-guide-scene")).toBeInTheDocument();
  });

  it("renders a project-specific guide scene for family expenses", async () => {
    window.history.replaceState({}, "", "/?capture-guide=family-expenses--real--step-04--frame-02");
    render(<AppEntry />);
    expect(await screen.findByRole("heading", { name: /Codex сам подготовил рабочее место/i })).toBeInTheDocument();
    expect(screen.getByText(/создать всё автоматически/i)).toBeInTheDocument();
    expect(screen.getAllByText(/family-expenses/i).length).toBeGreaterThan(1);
    expect(document.querySelector('[data-original-guide="family-expenses"]')).toBeInTheDocument();
  });

  it("shows the conversational result instead of prepared files in family-expenses screenshots", async () => {
    window.history.replaceState({}, "", "/?capture=family-expenses--step-03");
    render(<AppEntry />);
    expect(await screen.findByRole("heading", { name: /готовые безопасные данные бюджета/i })).toBeInTheDocument();
    expect(screen.getByText(/4 простых ответа/i)).toBeInTheDocument();
    expect(screen.queryByText(/проверила данные расходов|семейные-расходы\.csv/i)).not.toBeInTheDocument();
  });

  it("does not show pre-created files before the family-expenses Codex interview", async () => {
    window.history.replaceState({}, "", "/?capture-guide=family-expenses--real--step-03--frame-02");
    render(<AppEntry />);
    expect(await screen.findByText(/новый проект — пока без файлов/i)).toBeInTheDocument();
    expect(screen.queryByText(/паспорт-проекта\.txt|данные\.csv|правила\.txt/i)).not.toBeInTheDocument();
  });

  it("shows exactly where to choose a palette in the level-two picture guide", async () => {
    window.history.replaceState({}, "", "/?capture-guide=family-expenses--real--step-02--frame-02");
    render(<AppEntry />);
    expect(await screen.findByText("Пудровое тепло")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /собрать свою гамму/i })).toBeInTheDocument();
    expect(screen.getByText("ЖИВОЙ ПРЕДПРОСМОТР")).toBeInTheDocument();
  });

  it("keeps shared result screenshots neutral for real and training routes", async () => {
    window.history.replaceState({}, "", "/?capture=day-planner-agent--step-09");
    render(<AppEntry />);
    expect(await screen.findByRole("heading", { name: /оставила только нужный вопрос/i })).toBeInTheDocument();
    expect(screen.queryByText(/вымышлен|учебной папке/i)).not.toBeInTheDocument();
  });

  it("shows a voice-or-text interview instead of source files in the mobile screenshot", async () => {
    window.history.replaceState({}, "", "/?capture-mobile=pressure-diary--step-03");
    render(<AppEntry />);
    expect(await screen.findByText(/расскажите своими словами/i)).toBeInTheDocument();
    expect(screen.getByText(/Codex сам создаст комнату, поля и файлы/i)).toBeInTheDocument();
    expect(screen.queryByText(/мои-измерения\.csv|поля-дневника\.txt/i)).not.toBeInTheDocument();
  });

  it("does not expose the obsolete manual preparation capture route", async () => {
    window.history.replaceState({}, "", "/?capture-prep=home-helper--prep-02");
    render(<AppEntry />);
    expect(await screen.findByRole("heading", { level: 1, name: /устанавливаем codex/i })).toBeInTheDocument();
    expect(document.querySelector("#capture-guide-scene")).not.toBeInTheDocument();
  });
});
