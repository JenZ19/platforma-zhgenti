import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { LearningKitPreview } from "./LearningKitPreview";

afterEach(cleanup);
it.each(["carousel-agent", "threads-agent", "webinar-moderator-agent", "family-health-hub"])("shows matching approved preview for %s", slug => {
  render(<LearningKitPreview slug={slug} stepId={1} />);
  const img = screen.getByRole("img");
  expect(img).toHaveAttribute("src", `/materials/learning-kit-previews/${slug}-v1.png`);
  expect(existsSync(`public${img.getAttribute("src")}`)).toBe(true);
  expect(screen.getByRole("link", { name: /Открыть изображение целиком/ })).toHaveAttribute("href", img.getAttribute("src"));
  expect(screen.getByText(/учебн/)).toBeVisible();
});
it.each(["threads-agent", "webinar-moderator-agent"])("does not present %s as a connected Telegram screen", slug => {
  render(<LearningKitPreview slug={slug} stepId={1} />);
  expect(screen.getByText(/Это не экран Telegram/)).toBeVisible();
});
it("does not repeat preview in later steps or unrelated quests", () => {
  const { container, rerender } = render(<LearningKitPreview slug="carousel-agent" stepId={2} />);
  expect(container).toBeEmptyDOMElement();
  rerender(<LearningKitPreview slug="planner" stepId={1} />);
  expect(container).toBeEmptyDOMElement();
});
