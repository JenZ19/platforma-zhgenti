import { describe, expect, it } from "vitest";
import { getQuestProject } from "../projects";
import { buildSetupQuest } from "../setup-quests";
import { reviewSetupLessons } from "./setup";

describe("reviewed setup lessons", () => {
  it("keeps provider choice at 5 but removes busywork from API", () => {
    const p=getQuestProject("api-keys")!;
    const steps=reviewSetupLessons(p,buildSetupQuest(p));
    expect(steps).toHaveLength(8);
    expect(steps[4].title).toContain("провайдера");
    expect(steps[0].action).not.toContain("Запишите одним предложением");
    expect(steps[5].prompt).toContain("лимит");
    expect(steps[6].prompt).toContain("готово");
    expect(steps.every(s=>!s.guide)).toBe(true);
  });
  it("asks what school already hosts before proposing another server", () => {
    const p=getQuestProject("server-152fz")!;
    const s=reviewSetupLessons(p,buildSetupQuest(p));
    expect(s).toHaveLength(9);
    expect(s[0].prompt).toMatch(/школ|куратор/);
    expect(s[1].prompt).toContain("продления");
    expect(s[1].screenshotKind).toBe("real");
  });
});
