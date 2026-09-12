import { describe, expect, it } from "vitest";
import { getQuestProject } from "./projects";
import { buildQuest } from "./quests";
import { buildMobileQuest } from "./mobile";

describe("reviewed planning journeys", () => {
  it("starts with a working planner, not an imaginary screen or paperwork", () => {
    const steps = buildQuest(getQuestProject("planner")!);
    expect(steps).toHaveLength(9);
    expect(steps[0].prompt).toContain("Используй готовый учебный комплект planner");
    expect(steps[0].links?.some(l => l.href.endsWith("planner-2026-09-09.1.zip"))).toBe(true);
    expect(steps[0].prompt).toContain("предпросмотр");
    expect(steps[0].action).toContain("распакуйте ZIP");
    expect(steps[1].action).toContain("Добавить дело");
  });
  it("keeps client work out of the main finish and preserves real personal data", () => {
    for (const slug of ["planner", "day-planner-agent"]) {
      const steps = buildQuest(getQuestProject(slug)!, "real");
      expect(steps.map(s => s.prompt).join(" ")).not.toMatch(/работай только внутри личной и клиентской|Создай отдельную копию.*client/i);
      expect(steps.at(-1)?.expected.join(" ")).not.toMatch(/две версии|клиентск/i);
      expect(steps.at(-1)?.extension?.prompt).toContain("отдельную");
    }
    expect(buildQuest(getQuestProject("planner")!, "real").map(s => s.prompt).join(" ")).toContain("Не заменяй мои личные записи");
  });
  it("requires an actual connection before claiming a Telegram agent", () => {
    const steps = buildQuest(getQuestProject("day-planner-agent")!);
    expect(steps).toHaveLength(10);
    expect(steps[0].prompt).toMatch(/тест.*не.*Telegram/is);
    expect(steps[1].prompt).toMatch(/нет.*подключения.*остановись/is);
    expect(steps[1].prompt).not.toContain("Используй существующее безопасное подключение");
    expect(steps.map(s => s.title).join(" ")).not.toContain("ответ голосом");
  });
  it("keeps hands-on phone checks instead of turning every step into another prompt", () => {
    const mobile = buildMobileQuest(getQuestProject("planner")!);
    expect(mobile[1].action).toContain("Добавить дело");
    expect(mobile[1].prompt).toBeUndefined();
    expect(mobile.flatMap(s => s.links ?? []).some(l => l.href === "https://lovable.dev/")).toBe(false);
    expect(mobile[0].action).toContain("Откройте Феечку");
  });
});
