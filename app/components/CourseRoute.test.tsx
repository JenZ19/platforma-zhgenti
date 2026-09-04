import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { CourseRoute } from "./CourseRoute";
import { buildDashboardSnapshot } from "../lib/academy-dashboard";
import { projects } from "../content/projects";

beforeEach(() => localStorage.clear());
it("expands project choices below the trigger, saves selection and returns focus", () => {
  const changed = vi.fn();
  render(<CourseRoute snapshot={buildDashboardSnapshot(projects, localStorage, "desktop")} format="desktop" onOpen={vi.fn()} onChange={changed} />);
  const trigger = screen.getAllByRole("button", { name: /Что будем делать/ })[0];
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(trigger);
  const group = screen.getByRole("group", { name: "Проект недели 1" });
  expect(trigger.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.click(within(group).getByRole("radio", { name: "Вести семейный бюджет" }));
  expect(changed).toHaveBeenCalledOnce();
  expect(buildDashboardSnapshot(projects, localStorage, "desktop").course?.[0].selected.slug).toBe("family-budget");
  expect(trigger).toHaveFocus();
  expect(screen.queryByRole("group", { name: "Проект недели 1" })).not.toBeInTheDocument();
  fireEvent.click(trigger);
  fireEvent.keyDown(screen.getAllByRole("radio")[0], { key: "Escape" });
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(trigger).toHaveFocus();
});
