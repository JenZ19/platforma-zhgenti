import { render, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { getQuestProject, questProjects, projects, isProjectBundle } from "../content/projects";
import { preparationKey } from "../lib/preparation";
import { Quest } from "./Quest";
import { MobileQuest } from "./MobileQuest";
import { QuestFormatChoice } from "./QuestFormatChoice";

afterEach(() => { cleanup(); localStorage.clear(); });
it.each(questProjects.map(project => project.slug))("applies the refined layout to %s in both formats", (slug) => {
  for (const mobile of [false, true]) {
    localStorage.setItem(preparationKey(`${mobile ? "mobile:" : ""}${slug}`), JSON.stringify({ version: 1, mode: "demo", ready: true, checked: [] }));
    const Component = mobile ? MobileQuest : Quest;
    const { container } = render(<Component project={getQuestProject(slug)!} onHome={vi.fn()} />);
    expect(container.querySelector('main')).toHaveAttribute("data-track-layout", "comfortable");
    if (mobile && slug !== "install-codex") expect(container.querySelector('[data-result-showcase]')).toBeNull();
    else expect(container.querySelector('[data-result-showcase]')).toHaveAttribute("data-result-showcase", slug);
    cleanup();
  }
});
it("also styles preparation before a quest is started", () => {
  const { container } = render(<Quest project={getQuestProject("pressure-diary")!} onHome={vi.fn()} />);
  expect(container.querySelector('main')).toHaveAttribute("data-track-layout", "comfortable");
  expect(container.querySelector('[data-result-showcase]')).toHaveAttribute("data-result-showcase", "pressure-diary");
});
it.each(projects.filter(isProjectBundle).map(project => project.slug))("styles the format selector for %s", (slug) => {
  const project = projects.find(project => project.slug === slug)!;
  if (!isProjectBundle(project)) throw new Error("Expected bundle");
  const { container } = render(<QuestFormatChoice project={project} onChoose={vi.fn()} onHome={vi.fn()} onReset={vi.fn()} />);
  expect(container.querySelector('main')).toHaveAttribute("data-track-layout", "comfortable");
  expect(container.querySelectorAll('.format-result-image')).toHaveLength(2);
});
