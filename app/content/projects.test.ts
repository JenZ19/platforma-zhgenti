import { describe, expect, it } from "vitest";
import { getProject, getQuestProject, isProjectBundle, projects, questProjects } from "./projects";

describe("project registry", () => {
  it("uses one complete client agent instead of five repeated projects", () => {
    const clientAgent = getQuestProject("client-care-agent");

    expect(clientAgent?.title).toBe("ИИ-агент для работы с клиентами");
    expect(clientAgent?.features).toEqual(expect.arrayContaining([
      "приём заявки",
      "уточнение запроса",
      "подбор и объяснение",
      "подготовка записи",
      "продажа и сопровождение",
    ]));

    for (const repeatedSlug of ["lead-agent", "selector-agent", "booking-agent", "sales-manager-agent"]) {
      expect(getQuestProject(repeatedSlug), repeatedSlug).toBeUndefined();
    }
    expect(getQuestProject("administrator-agent")?.title).toBe("ИИ-администратор");
  });

  it("contains the complete approved collection of 42 unique catalogue projects", () => {
    expect(projects).toHaveLength(42);
    expect(new Set(projects.map((project) => project.slug)).size).toBe(42);
  });

  it("matches the exact concrete project counts by kind", () => {
    const count = (kind: string) => questProjects.filter((project) => project.kind === kind && project.journey !== "setup").length;
    expect(count("service")).toBe(10);
    expect(count("agent")).toBe(20);
    expect(count("simple-site")).toBe(11);
    expect(count("advanced-site")).toBe(4);
    expect(count("portfolio")).toBe(1);
    expect(questProjects.filter((project) => project.journey === "setup")).toHaveLength(3);
  });

  it("adds the four projects backed by Jenya's working originals", () => {
    expect([
      "carousel-agent",
      "threads-agent",
      "webinar-moderator-agent",
      "family-health-hub",
    ].map((slug) => getQuestProject(slug)?.title)).toEqual([
      "ИИ-агент каруселей",
      "ИИ-агент Threads",
      "ИИ-агент — модератор вебинаров",
      "Хаб здоровья семьи",
    ]);
  });

  it("gives every project complete, specific configuration", () => {
    for (const project of questProjects) {
      expect(project.title.length, project.slug).toBeGreaterThan(4);
      expect(project.audience.length, project.slug).toBeGreaterThan(4);
      expect(project.outcome.length, project.slug).toBeGreaterThan(12);
      expect(project.entities.length, project.slug).toBeGreaterThanOrEqual(2);
      expect(project.features.length, project.slug).toBeGreaterThanOrEqual(4);
      expect(project.demo.length, project.slug).toBeGreaterThanOrEqual(2);
      expect(project.safety.length, project.slug).toBeGreaterThan(8);
      expect(project.portfolioAngle.length, project.slug).toBeGreaterThan(8);
    }
  });

  it("finds a project by slug and rejects an unknown slug", () => {
    const planning = getProject("planning");
    expect(planning && isProjectBundle(planning) ? planning.title : undefined).toBe("Планирование");
    expect(getProject("missing-project")).toBeUndefined();
  });
});
