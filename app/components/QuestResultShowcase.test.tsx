import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { questProjects } from "../content/projects";
import { QuestResultShowcase } from "./QuestResultShowcase";

afterEach(cleanup);
it.each(questProjects)("shows the individual result for $slug", project => {
  render(<QuestResultShowcase project={project} />);
  expect(screen.getByRole("img")).toHaveAttribute("src", `/covers/${project.slug}.webp?v=20260908-mockups`);
  expect(screen.getByRole("img").getAttribute("alt")).toContain(project.title);
  expect(screen.getByText(/Иллюстрация результата/)).toBeVisible();
  expect(screen.getByRole("link")).toHaveAttribute("href", `/covers/${project.slug}.webp?v=20260908-mockups`);
});
it("does not repeat the result cover in later lessons", () => {
  const { container } = render(<QuestResultShowcase project={questProjects[0]} stepId={2} />);
  expect(container).toBeEmptyDOMElement();
});
