import { describe, expect, it } from "vitest";
import { questProjects } from "../projects";
import { buildQuest } from "../quests";
import { buildMobileQuest } from "../mobile";
import { getJourneyLevelCount } from "../journey-plans";

describe("reviewed curriculum integration", () => {
  const mobileTitles: Record<string, Record<number, string>> = {
    planner: { 7: "Готовим безопасный вариант для показа" },
    "day-planner-agent": { 7: "Добавляем дело одним сообщением" },
    "pressure-diary": { 1: "Создаём закрытый дневник измерений" },
    "unique-design": { 6: "Проверяем читаемость и кнопки" },
  };
  it.each(questProjects.map(p=>p.slug))("keeps %s consistent on desktop and phone", slug=>{
    const p=questProjects.find(p=>p.slug===slug)!;
    for(const mode of ["real","demo"] as const){
      const d=buildQuest(p,mode),m=buildMobileQuest(p,mode);
      expect(d.length).toBe(getJourneyLevelCount(slug));
      expect(m.map(s=>s.title)).toEqual(d.map(s=>mobileTitles[slug]?.[s.id] ?? s.title));
      expect(m.map(s=>s.id)).toEqual(d.map(s=>s.id));
      expect(m.map(s=>s.expected)).toEqual(d.map(s=>s.expected));
      if(p.journey!=="setup"){
        expect(d.at(-1)?.expected.join(" ")).not.toMatch(/обе версии|две версии|личная и клиентская/i);
        expect(d.every(s=>s.customization!==undefined)).toBe(true);
        expect(m.filter(s=>!s.prompt).length).toBe(d.filter(s=>!s.prompt).length);
        expect(m.map(s=>s.action).join(" ")).not.toContain("тот же проект в Lovable или");
      }
    }
  });
});
