import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBotPrototypeSpec } from "../content/bot-prototypes";
import { agentCoverPrototypeSlugs, getAgentCoverPrototypeSpec } from "../content/agent-cover-prototypes";
import { firstCoverPrototypeSlugs, getFirstCoverPrototypeSpec } from "../content/first-cover-prototypes";
import { getThirdCoverPrototypeSpec, thirdCoverPrototypeSlugs } from "../content/third-cover-prototypes";
import { getProject, projects } from "../content/projects";
import { preparationKey } from "../lib/preparation";
import { progressKey } from "../lib/progress";
import { Academy } from "./Academy";
import { AppEntry } from "./AppEntry";
import { ExpectedScene } from "./ExpectedScene";
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

  it("shows the finished prototype on every desktop project card", () => {
    render(<Academy />);
    const previews = screen.getAllByRole("img", { name: /прототип результата проекта/i });
    expect(previews).toHaveLength(52);
    expect(screen.getByRole("img", { name: /учёт расходов семьи/i })).toHaveAttribute(
      "src",
      "/screens/family-expenses/step-14.png",
    );
  });

  it("renders a dedicated final-product interface for every bot", () => {
    const bots = projects.filter((project) => project.kind === "bot");
    const { container } = render(<>{bots.map((project) => <ExpectedScene key={project.slug} project={project} step={14} />)}</>);

    for (const project of bots) {
      const spec = getBotPrototypeSpec(project.slug);
      const prototype = container.querySelector(`[data-prototype-marker="${spec.marker}"]`);
      expect(prototype, project.slug).not.toBeNull();
      expect(prototype).toHaveTextContent(spec.headline);
      expect(prototype).toHaveTextContent(spec.metric);
    }
  });

  it("renders a content-specific final-product cover for the first ten projects", () => {
    const featuredProjects = firstCoverPrototypeSlugs.map((slug) => getProject(slug)!);
    const { container } = render(<>{featuredProjects.map((project) => <ExpectedScene key={project.slug} project={project} step={14} />)}</>);

    for (const project of featuredProjects) {
      const spec = getFirstCoverPrototypeSpec(project.slug);
      const prototype = container.querySelector(`[data-cover-marker="${spec.marker}"]`);
      expect(prototype, project.slug).not.toBeNull();
      expect(prototype).toHaveTextContent(spec.headline);
      expect(prototype).toHaveTextContent(spec.metric);
    }
  });

  it("renders a content-specific cover for the next ten agents", () => {
    const featuredProjects = agentCoverPrototypeSlugs.map((slug) => getProject(slug)!);
    const { container } = render(<>{featuredProjects.map((project) => <ExpectedScene key={project.slug} project={project} step={14} />)}</>);

    for (const project of featuredProjects) {
      const spec = getAgentCoverPrototypeSpec(project.slug);
      const prototype = container.querySelector(`[data-agent-cover-marker="${spec.marker}"]`);
      expect(prototype, project.slug).not.toBeNull();
      expect(prototype).toHaveTextContent(spec.headline);
      expect(prototype).toHaveTextContent(spec.metric);
    }
  });

  it("renders a unique content-specific cover for the following ten projects", () => {
    const featuredProjects = thirdCoverPrototypeSlugs.map((slug) => getProject(slug)!);
    const { container } = render(<>{featuredProjects.map((project) => <ExpectedScene key={project.slug} project={project} step={14} />)}</>);

    for (const project of featuredProjects) {
      const spec = getThirdCoverPrototypeSpec(project.slug);
      const prototype = container.querySelector(`[data-third-cover-marker="${spec.marker}"]`);
      expect(prototype, project.slug).not.toBeNull();
      expect(prototype).toHaveTextContent(spec.headline);
      expect(prototype).toHaveTextContent(spec.metric);
    }
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

  it("returns a desktop quest to the top after the learner presses next", () => {
    render(<Quest project={getProject("pressure-diary")!} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на вымышленных данных/i }));
    vi.mocked(window.scrollTo).mockClear();

    fireEvent.click(screen.getByRole("button", { name: /я сделала — следующий шаг/i }));

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    expect(screen.getByRole("button", { name: /уровень 2/i })).toBeEnabled();
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
    const start = screen.getByRole("button", { name: /материалы готовы — начать квест/i });
    expect(start).toBeDisabled();
    checks.forEach((check) => fireEvent.click(check));
    expect(start).toBeEnabled();
    fireEvent.click(start);
    expect(screen.getAllByRole("button", { name: /уровень/i })).toHaveLength(17);
    expect(localStorage.getItem(preparationKey("psychologist-site"))).toContain('"ready":true');
  });

  it("shows the human project folder name instead of the technical slug", () => {
    render(<Quest project={getProject("pressure-diary")!} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на реальных данных/i }));
    expect(screen.getByText(/положите безопасные копии в папку/i)).toHaveTextContent("Дневник давления");
    expect(screen.queryByText(/положите безопасные копии в папку pressure-diary/i)).not.toBeInTheDocument();
  });

  it("opens a separate phone-only academy from the mobile format route", async () => {
    window.history.replaceState({}, "", "/?format=mobile");
    render(<AppEntry />);
    expect(await screen.findByRole("heading", { name: /академия с телефона/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /открыть мобильный квест/i })).toHaveLength(52);
    expect(screen.getAllByRole("img", { name: /прототип результата проекта/i })).toHaveLength(52);
    expect(screen.getByRole("img", { name: /учёт расходов семьи/i })).toHaveAttribute(
      "src",
      "/screens/family-expenses/step-14.png",
    );
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

  it("walks a real home-helper learner through every click with pictures", () => {
    render(<Quest project={getProject("home-helper")!} onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /работать на реальных данных/i }));
    expect(screen.getAllByRole("img", { name: /подготовка home-helper/i })).toHaveLength(8);
    expect(screen.getByText(/запишите пять домашних дел в файл «мои-дела\.txt»/i)).toBeInTheDocument();
    screen.getAllByRole("checkbox").forEach((checkbox) => fireEvent.click(checkbox));
    fireEvent.click(screen.getByRole("button", { name: /материалы готовы — начать квест/i }));

    let guide = screen.getByRole("region", { name: /делайте по картинкам/i });
    expect(within(guide).getAllByRole("img", { name: /кадр \d+/i })).toHaveLength(5);
    expect(within(guide).getByRole("heading", { name: /создайте папку home-helper/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /я сделала — следующий шаг/i }));
    fireEvent.click(screen.getByRole("button", { name: /я сделала — следующий шаг/i }));
    guide = screen.getByRole("region", { name: /делайте по картинкам/i });
    expect(within(guide).getAllByRole("img", { name: /кадр \d+/i })).toHaveLength(6);
    expect(within(guide).getByRole("heading", { name: /скопируйте анкету на сайте/i })).toBeInTheDocument();
    expect(within(guide).getByRole("heading", { name: /вставьте анкету в codex/i })).toBeInTheDocument();
    expect(within(guide).getByRole("heading", { name: /отправьте анкету/i })).toBeInTheDocument();
    expect(within(guide).getAllByText(/готово, если/i)).toHaveLength(6);
    expect(screen.queryByText(/вымышлен|демонстрацион|учебн/i)).not.toBeInTheDocument();
  });

  it("renders a dedicated arrow screenshot scene for each home-helper action", async () => {
    window.history.replaceState({}, "", "/?capture-guide=home-helper--real--step-03--frame-03");
    render(<AppEntry />);
    expect(await screen.findAllByRole("heading", { name: /скопируйте анкету на сайте/i })).not.toHaveLength(0);
    expect(screen.getByText(/нажмите сюда/i)).toBeInTheDocument();
    expect(document.querySelector("#capture-guide-scene")).toBeInTheDocument();
  });

  it("keeps shared result screenshots neutral for real and training routes", async () => {
    window.history.replaceState({}, "", "/?capture=planner-bot--step-09");
    render(<AppEntry />);
    expect(await screen.findByText(/безопасные проверочные данные/i)).toBeInTheDocument();
    expect(screen.queryByText(/вымышлен|учебной папке/i)).not.toBeInTheDocument();
  });

  it("shows the project-specific source in the mobile materials screenshot", async () => {
    window.history.replaceState({}, "", "/?capture-mobile=pressure-diary--step-04");
    render(<AppEntry />);
    expect(await screen.findByText("мои-измерения.csv")).toBeInTheDocument();
    expect(screen.getByText("поля-дневника.txt")).toBeInTheDocument();
  });

  it("renders a dedicated screenshot scene for each preparation action", async () => {
    window.history.replaceState({}, "", "/?capture-prep=home-helper--prep-02");
    render(<AppEntry />);
    expect(await screen.findByRole("heading", { name: /запишите пять домашних дел/i })).toBeInTheDocument();
    expect(document.querySelector("#capture-guide-scene")).toBeInTheDocument();
  });
});
