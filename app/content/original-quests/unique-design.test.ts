import { describe, expect, it } from "vitest";
import { getQuestProject } from "../projects";
import { buildQuest } from "../quests";

describe("unique design quest", () => {
  it("turns three reference roles into an original verified result", () => {
    const steps = buildQuest(getQuestProject("unique-design")!, "demo");
    const copy = JSON.stringify(steps);
    expect(steps.map((step) => step.id)).toEqual(steps.map((_, index) => index + 1));
    expect(copy).toMatch(/структура/i);
    expect(copy).toMatch(/настроение/i);
    expect(copy).toMatch(/детал/i);
    expect(copy).toContain("Landingfolio");
    expect(copy).toContain("Lapa Ninja");
    expect(copy).toMatch(/не копир/i);
    expect(copy).toMatch(/перв.+экран.+провер/is);
  });

  it("uses real content without manual technical files and keeps client adaptation optional", () => {
    const steps = buildQuest(getQuestProject("unique-design")!, "real");
    const copy = JSON.stringify(steps);
    expect(copy).toMatch(/РЕЖИМ РЕАЛЬНЫХ ДАННЫХ/i);
    expect(copy).toMatch(/файлы создавай сам|технические файлы создавай сам/i);
    expect(steps.map((step) => step.action).join(" ")).not.toMatch(/создайте.+(?:\.txt|\.csv|служебный файл)/i);
    expect(`${steps.at(-1)?.extension?.title} ${steps.at(-1)?.extension?.description}`).toMatch(/по желанию|можно пропустить/i);
  });
});
