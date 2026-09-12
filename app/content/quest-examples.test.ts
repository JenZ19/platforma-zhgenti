import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { projects, resolveProjectVariant } from "./projects";
import { buildQuest } from "./quests";
import { exampleFor } from "./quest-examples";

function variants() {
  return projects.flatMap((project) => ("formats" in project
    ? [resolveProjectVariant(project, "service"), resolveProjectVariant(project, "agent")]
    : [project])).filter(Boolean) as ReturnType<typeof resolveProjectVariant>[];
}

describe("живой пример результата", () => {
  it("у каждого проекта курса есть открытый пример на первом шаге", () => {
    for (const project of variants()) {
      if (project!.journey === "setup") continue;
      const first = buildQuest(project!, "demo")[0];
      const links = first.links ?? [];
      expect(links.some((link) => link.href.includes("-example/")), project!.slug).toBe(true);
    }
  });

  it("квест установки живым примером не подменяет настоящие экраны", () => {
    for (const project of variants()) {
      if (project!.journey !== "setup") continue;
      expect(exampleFor(project!), project!.slug).toBeUndefined();
    }
  });

  it("страницы примеров действительно лежат в public", () => {
    const hrefs = new Set(variants().flatMap((project) => {
      const example = exampleFor(project!);
      return example ? [example.href] : [];
    }));
    hrefs.add("/materials/planner-example/index.html");
    for (const href of hrefs) {
      expect(existsSync(resolve(process.cwd(), "public" + href)), href).toBe(true);
    }
  });

  it("у планера остаётся собственный пример, а не общий", () => {
    const planner = variants().find((project) => project!.slug === "planner")!;
    const links = buildQuest(planner, "demo")[0].links ?? [];
    const examples = links.filter((link) => link.href.includes("-example/"));
    expect(examples).toHaveLength(1);
    expect(examples[0].href).toContain("planner-example");
  });
});
