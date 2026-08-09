import { describe, expect, it } from "vitest";
import { projects } from "./projects";
import { botPrototypeSlugs, getBotPrototypeSpec } from "./bot-prototypes";

describe("bot prototype registry", () => {
  it("maps every bot project explicitly", () => {
    const projectSlugs = projects
      .filter((project) => project.kind === "bot")
      .map((project) => project.slug)
      .sort();

    expect([...botPrototypeSlugs].sort()).toEqual(projectSlugs);
    expect(botPrototypeSlugs).toHaveLength(13);
  });

  it("gives every bot a unique function marker and theme", () => {
    const specs = botPrototypeSlugs.map((slug) => getBotPrototypeSpec(slug));

    expect(new Set(specs.map((spec) => spec.marker)).size).toBe(13);
    expect(new Set(specs.map((spec) => spec.theme)).size).toBe(13);
  });

  it("fails loudly when a bot has no dedicated prototype", () => {
    expect(() => getBotPrototypeSpec("new-unmapped-bot")).toThrow(
      "Нет персонального прототипа для бота: new-unmapped-bot",
    );
  });
});
