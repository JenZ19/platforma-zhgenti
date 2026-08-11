import { describe, expect, it } from "vitest";
import {
  customizationSummary,
  defaultCustomization,
  getCustomizationProfile,
  originalQuestSlugs,
  questColorPalettes,
} from "../content/customization";
import { questProjects } from "../content/projects";
import {
  customizationKey,
  loadCustomization,
  resetCustomization,
  saveCustomization,
} from "./customization";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe("quest customization", () => {
  it("keeps the five fully handcrafted profiles and customizes all 50 project-building paths", () => {
    expect(originalQuestSlugs).toEqual([
      "family-expenses",
      "planner",
      "idea-vault",
      "child-schedule",
      "unique-design",
    ]);
    for (const slug of originalQuestSlugs) {
      const profile = getCustomizationProfile(slug)!;
      const defaults = defaultCustomization(slug)!;
      expect(Object.keys(profile.axes)).toEqual(["audience", "goal", "name", "style", "tone", "feature"]);
      expect(Object.values(profile.axes).every((axis) => axis.options.length >= 3), slug).toBe(true);
      expect(Object.values(defaults).filter((value) => typeof value === "string").every((value) => value.trim().length > 2), slug).toBe(true);
      expect(defaults.palette).toEqual(questColorPalettes[0]);
      expect(customizationSummary(slug, defaults), slug).toContain(defaults.name);
      expect(customizationSummary(slug, defaults), slug).toContain(defaults.feature);
      expect(customizationSummary(slug, defaults), slug).toContain(defaults.palette.name);
      expect(customizationSummary(slug, defaults), slug).toContain(defaults.palette.accent);
    }

    expect(questProjects).toHaveLength(49);
    for (const project of questProjects.filter((item) => item.journey !== "setup")) {
      const profile = getCustomizationProfile(project.slug)!;
      const defaults = defaultCustomization(project.slug)!;
      expect(Object.keys(profile.axes), project.slug).toEqual(["audience", "goal", "name", "style", "tone", "feature"]);
      expect(profile.preview.caption.length, project.slug).toBeGreaterThan(3);
      expect(profile.preview.metric.length, project.slug).toBeGreaterThan(2);
      expect(profile.preview.action.length, project.slug).toBeGreaterThan(2);
      expect(defaults.palette, project.slug).toEqual(questColorPalettes[0]);
      expect(customizationSummary(project.slug, defaults), project.slug).toMatch(/Я создаю (сервис|ИИ-агента|сайт|портфолио)/);
    }
  });

  it.each([
    ["carousel-agent", ["11 арт-направлений", "нейрофоны", "слайда"]],
    ["threads-agent", ["паспорт голоса", "источники", "10 тредов"]],
    ["webinar-moderator-agent", ["observe", "assist", "auto"]],
    ["family-health-hub", ["люди и животные", "неразобранные", "резервная копия"]],
  ])("offers source-backed customization for %s", (slug, phrases) => {
    const profile = getCustomizationProfile(slug)!;
    const text = Object.values(profile.axes)
      .flatMap((axis) => [axis.label, axis.hint, ...axis.options])
      .join(" ");

    for (const phrase of phrases) expect(text).toMatch(new RegExp(phrase, "i"));
  });

  it("stores an agent's own audience, name and palette in separate desktop and mobile branches", () => {
    const storage = new MemoryStorage();
    const desktop = {
      ...defaultCustomization("client-care-agent")!,
      audience: "Для семейного фотографа",
      name: "Лида",
      palette: questColorPalettes[2],
    };
    const mobile = {
      ...defaultCustomization("client-care-agent")!,
      audience: "Для мастера маникюра",
      name: "Мия",
      palette: questColorPalettes[4],
    };

    saveCustomization("client-care-agent", "client-care-agent", desktop, storage);
    saveCustomization("mobile:client-care-agent", "client-care-agent", mobile, storage);

    expect(loadCustomization("client-care-agent", "client-care-agent", storage)).toMatchObject(desktop);
    expect(loadCustomization("mobile:client-care-agent", "client-care-agent", storage)).toMatchObject(mobile);
  });

  it("stores computer and phone choices independently", () => {
    const storage = new MemoryStorage();
    const desktop = { ...defaultCustomization("family-expenses")!, name: "Копим на море", palette: questColorPalettes[1] };
    const mobile = { ...defaultCustomization("family-expenses")!, name: "Наши конверты", palette: questColorPalettes[3] };

    saveCustomization("family-expenses", desktop, storage);
    saveCustomization("mobile:family-expenses", mobile, storage);

    expect(customizationKey("family-expenses")).not.toBe(customizationKey("mobile:family-expenses"));
    expect(loadCustomization("family-expenses", storage)?.name).toBe("Копим на море");
    expect(loadCustomization("mobile:family-expenses", storage)?.name).toBe("Наши конверты");
    expect(loadCustomization("family-expenses", storage)?.palette).toEqual(questColorPalettes[1]);
    expect(loadCustomization("mobile:family-expenses", storage)?.palette).toEqual(questColorPalettes[3]);
  });

  it("recovers from malformed and incomplete saved data", () => {
    const storage = new MemoryStorage();
    storage.setItem(customizationKey("planner"), "broken-json");
    expect(loadCustomization("planner", storage)).toEqual(defaultCustomization("planner"));

    storage.setItem(customizationKey("planner"), JSON.stringify({ name: "  ", feature: "Перенести на завтра" }));
    expect(loadCustomization("planner", storage)).toEqual({
      ...defaultCustomization("planner")!,
      feature: "Перенести на завтра",
    });

    storage.setItem(customizationKey("planner"), JSON.stringify({
      name: "Мой ритм",
      palette: { name: "Сломанная", background: "pink", surface: "#fff", accent: "", text: "#111111" },
    }));
    expect(loadCustomization("planner", storage)?.palette).toEqual(questColorPalettes[0]);
  });

  it("resets one quest without touching another", () => {
    const storage = new MemoryStorage();
    saveCustomization("planner", { ...defaultCustomization("planner")!, name: "Мой ритм" }, storage);
    saveCustomization("idea-vault", { ...defaultCustomization("idea-vault")!, name: "Лови мысль" }, storage);

    resetCustomization("planner", storage);

    expect(loadCustomization("planner", storage)).toEqual(defaultCustomization("planner"));
    expect(loadCustomization("idea-vault", storage)?.name).toBe("Лови мысль");
  });
});
