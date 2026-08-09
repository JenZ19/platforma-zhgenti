import { describe, expect, it } from "vitest";
import {
  customizationSummary,
  defaultCustomization,
  getCustomizationProfile,
  originalQuestSlugs,
} from "../content/customization";
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
  it("defines complete profiles only for the first four approved quests", () => {
    expect(originalQuestSlugs).toEqual([
      "family-expenses",
      "planner",
      "idea-vault",
      "child-schedule",
    ]);
    expect(getCustomizationProfile("pressure-diary")).toBeUndefined();

    for (const slug of originalQuestSlugs) {
      const profile = getCustomizationProfile(slug)!;
      const defaults = defaultCustomization(slug)!;
      expect(Object.keys(profile.axes)).toEqual(["audience", "goal", "name", "style", "tone", "feature"]);
      expect(Object.values(profile.axes).every((axis) => axis.options.length >= 3), slug).toBe(true);
      expect(Object.values(defaults).every((value) => value.trim().length > 2), slug).toBe(true);
      expect(customizationSummary(slug, defaults), slug).toContain(defaults.name);
      expect(customizationSummary(slug, defaults), slug).toContain(defaults.feature);
    }
  });

  it("stores computer and phone choices independently", () => {
    const storage = new MemoryStorage();
    const desktop = { ...defaultCustomization("family-expenses")!, name: "Копим на море" };
    const mobile = { ...defaultCustomization("family-expenses")!, name: "Наши конверты" };

    saveCustomization("family-expenses", desktop, storage);
    saveCustomization("mobile:family-expenses", mobile, storage);

    expect(customizationKey("family-expenses")).not.toBe(customizationKey("mobile:family-expenses"));
    expect(loadCustomization("family-expenses", storage)?.name).toBe("Копим на море");
    expect(loadCustomization("mobile:family-expenses", storage)?.name).toBe("Наши конверты");
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
