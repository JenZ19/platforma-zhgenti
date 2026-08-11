import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAgentContract } from "../content/agent-contracts";
import { firstCoverPrototypeSlugs, getFirstCoverPrototypeSpec } from "../content/first-cover-prototypes";
import { getThirdCoverPrototypeSpec, thirdCoverPrototypeSlugs } from "../content/third-cover-prototypes";
import { finalCoverPrototypeSlugs, getFinalCoverPrototypeSpec } from "../content/final-cover-prototypes";
import { getQuestProject, questProjects } from "../content/projects";
import { buildQuest } from "../content/quests";
import { getPreparationProfile, getPreparationProfileSlugs } from "../content/preparation";
import { preparationKey } from "../lib/preparation";
import { progressKey } from "../lib/progress";
import { customizationKey } from "../lib/customization";
import { Academy } from "./Academy";
import { AppEntry } from "./AppEntry";
import { ExpectedScene } from "./ExpectedScene";
import { MobileAcademy } from "./MobileAcademy";
import { MobileQuest } from "./MobileQuest";
import { MobileExpectedScene } from "./MobileExpectedScene";
import { ProjectCard } from "./ProjectCard";
import { Quest } from "./Quest";
import { QuestLinks } from "./QuestLinks";

Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});
Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });

function routeStepFor(project: NonNullable<ReturnType<typeof getQuestProject>>, sourceStep: number): number {
  const index = buildQuest(project).findIndex((step) => step.sourceStepId === sourceStep);
  if (index < 0) throw new Error(`Нет исходного уровня ${sourceStep} у ${project.slug}`);
  return index + 1;
}

describe("academy interface", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/");
  });

  it("shows one unified client agent card and no repeated client-stage cards", () => {
    render(<Academy />);
    expect(screen.getAllByText("ИИ-агент для работы с клиентами")).toHaveLength(1);
    for (const repeatedTitle of ["ИИ-агент для заявок", "ИИ-агент-подборщик", "ИИ-агент для записи", "Менеджер по продажам"]) {
      expect(screen.queryByText(repeatedTitle)).not.toBeInTheDocument();
    }
    expect(screen.getByText("ИИ-администратор")).toBeInTheDocument();
  });

  it("shows all 42 course projects", () => {
    const { container } = render(<Academy />);
    expect(container.querySelectorAll('a[aria-label^="Открыть квест:"]')).toHaveLength(42);
    expect(screen.getByText("42 проекта")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /версия только с телефона/i })).toHaveAttribute("href", "?format=mobile");
  });

  it("uses the selected tactile-album design across the full desktop and mobile platform", () => {
    const { container, rerender } = render(<Academy />);

    expect(container.querySelector('main[data-visual-theme="tactile-album"]')).not.toBeNull();
    expect(screen.getByRole("group", { name: /живой альбом готовых проектов/i })).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /готовый проект:/i })).toHaveLength(3);

    rerender(<Quest project={getQuestProject("pressure-diary")!} onHome={vi.fn()} />);
    expect(container.querySelector('main.quest-shell[data-visual-theme="tactile-album"]')).not.toBeNull();

    rerender(<MobileAcademy onOpen={vi.fn()} />);
    expect(container.querySelector('main.mobile-academy-shell[data-visual-theme="tactile-album"]')).not.toBeNull();

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

  it("shows the server lesson as nine fast levels without the repeated guide gallery", () => {
    const project = getQuestProject("server-152fz")!;
    const { rerender } = render(<Quest project={project} onHome={vi.fn()} />);

    expect(screen.getByText("9 коротких уровней")).toBeInTheDocument();
    expect(screen.getByText("0 / 9")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /делайте по картинкам/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /увеличить пример результата/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /я сделала — следующий шаг/i }));
    expect(screen.getByRole("button", { name: /увеличить пример результата/i })).toBeInTheDocument();

    rerender(<MobileQuest project={project} onHome={vi.fn()} />);
    expect(screen.getByText("0 из 9")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /увеличить мобильный пример/i })).not.toBeInTheDocument();
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

  it("shows the finished prototype on every desktop project card", () => {
    const { container } = render(<Academy />);
    expect(container.querySelectorAll(".project-preview img")).toHaveLength(49);
    expect(screen.getByRole("img", { name: /сервис проекта «семейный бюджет»/i })).toHaveAttribute(
      "src",
      "/screens/family-expenses/step-14.png",
    );
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

  it("renders a unique conversational prototype for every AI agent", () => {
    const sourceAgents = new Set(["carousel-agent", "threads-agent", "webinar-moderator-agent"]);
    const agents = questProjects.filter((project) => project.kind === "agent" && !sourceAgents.has(project.slug));
    const { container } = render(<>{agents.map((project) => <ExpectedScene key={project.slug} project={project} step={routeStepFor(project, 14)} />)}</>);

    expect(agents).toHaveLength(17);
    for (const project of agents) {
      const contract = getAgentContract(project.slug);
      const prototype = container.querySelector(`[data-agent-prototype="${project.slug}"]`);
      expect(prototype, project.slug).not.toBeNull();
      expect(prototype, project.slug).toHaveTextContent(contract.inputExample);
      expect(prototype, project.slug).toHaveTextContent(contract.firstQuestion);
      expect(prototype, project.slug).toHaveTextContent(contract.resultTitle);
    }
    expect(new Set(questProjects.filter((project) => project.kind === "agent").map((project) => getAgentContract(project.slug).theme)).size).toBe(20);
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

  it("filters the catalogue by week and search", () => {
    render(<Academy />);
    fireEvent.click(screen.getByRole("button", { name: /неделя 2/i }));
    const catalogue = screen.getByRole("region", { name: /каталог проектов/i });
    expect(within(catalogue).getAllByRole("link", { name: /открыть квест/i })).toHaveLength(8);
    fireEvent.change(screen.getByRole("searchbox", { name: /найти проект/i }), { target: { value: "психолог" } });
    expect(within(catalogue).getByText(/ничего не найдено/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /все проекты/i }));
    expect(within(catalogue).getAllByRole("link", { name: /открыть квест/i })).toHaveLength(1);
  });

  it("helps a beginner choose a desktop quest by difficulty, goal and familiar words", () => {
    render(<Academy />);
    const catalogue = screen.getByRole("region", { name: /каталог проектов/i });

    expect(within(catalogue).getByText(/показано: 42 из 42/i)).toBeInTheDocument();
    expect(within(catalogue).getAllByText(/уровень: стартовый/i).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByRole("combobox", { name: /что хочется сделать/i }), { target: { value: "Здоровье" } });
    fireEvent.click(screen.getByRole("button", { name: /сложность: стартовый/i }));
    expect(within(catalogue).getByRole("heading", { name: /дневник давления/i })).toBeInTheDocument();
    expect(within(catalogue).queryByRole("heading", { name: /семейный бюджет/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /сбросить все фильтры/i }));
    fireEvent.change(screen.getByRole("searchbox", { name: /найти проект/i }), { target: { value: "мама" } });
    expect(within(catalogue).getByRole("heading", { name: /семейное расписание/i })).toBeInTheDocument();
  });

  it("uses the same helpful quest filters in the phone-only academy", () => {
    render(<MobileAcademy onOpen={vi.fn()} />);
    const catalogue = screen.getByRole("region", { name: /мобильный каталог проектов/i });

    fireEvent.change(screen.getByRole("combobox", { name: /что хочется сделать с телефона/i }), { target: { value: "Контент" } });
    expect(within(catalogue).getAllByText(/контент/i).length).toBeGreaterThan(0);
    expect(within(catalogue).getByText(/показано:/i)).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: /я сделала — следующий шаг/i }));

    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "instant" }));
    expect(screen.getByRole("button", { name: /уровень 2/i })).toBeEnabled();
  });

  it("returns a mobile quest to the top immediately after next", async () => {
    render(<MobileQuest project={getQuestProject("child-schedule")!} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
    vi.mocked(window.scrollTo).mockClear();

    fireEvent.click(screen.getByRole("button", { name: /я сделала — дальше/i }));

    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "instant" }));
    expect(screen.getByRole("button", { name: /уровень 2/i })).toBeEnabled();
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
    const desktopWhy = desktop.container.querySelector(".why-card")!;
    expect(desktopTerms).toHaveTextContent(/Codex.+создаёт, проверяет и исправляет/is);
    expect(desktopTerms.compareDocumentPosition(desktopWhy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("прототип")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /следующий шаг: заполнен паспорт проекта/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^нужна помощь$/i }));
    const desktopHelp = desktop.container.querySelector(".help-card")!;
    fireEvent.click(within(desktopHelp).getByRole("button", { name: /скопировать/i }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringMatching(/recipe-book.+не проси меня создавать/is)));
    desktop.unmount();

    const mobile = render(<MobileQuest project={project} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
    const mobileTerms = screen.getByRole("region", { name: /новые слова перед началом/i });
    const mobileWhy = mobile.container.querySelector(".mobile-why")!;
    expect(mobileTerms.compareDocumentPosition(mobileWhy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("button", { name: /дальше: заполнен паспорт проекта/i })).toBeInTheDocument();

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

  it("opens a separate phone-only academy from the mobile format route", async () => {
    window.history.replaceState({}, "", "/?format=mobile");
    render(<AppEntry />);
    expect(await screen.findByRole("heading", { name: /академия с телефона/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /открыть мобильный квест/i })).toHaveLength(42);
    expect(document.querySelectorAll(".project-preview img")).toHaveLength(49);
    expect(screen.getByRole("img", { name: /сервис проекта «семейный бюджет»/i })).toHaveAttribute(
      "src",
      "/screens/family-expenses/step-14.png",
    );
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
    fireEvent.click(screen.getByRole("button", { name: /я сделала — следующий шаг/i }));

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
    fireEvent.click(screen.getByRole("button", { name: /я сделала — следующий шаг/i }));

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

    fireEvent.click(screen.getByRole("button", { name: /я сделала — следующий шаг/i }));
    fireEvent.click(screen.getByRole("button", { name: /я сделала — следующий шаг/i }));
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
    expect(await screen.findByRole("heading", { name: /выбери проект/i })).toBeInTheDocument();
    expect(document.querySelector("#capture-guide-scene")).not.toBeInTheDocument();
  });
});
