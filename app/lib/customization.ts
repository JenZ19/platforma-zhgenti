import { defaultCustomization, getCustomizationProfile } from "../content/customization";
import type { QuestCustomization, QuestCustomizationAxis } from "../content/types";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const axes: QuestCustomizationAxis[] = ["audience", "goal", "name", "style", "tone", "feature"];

export function customizationKey(storageSlug: string): string {
  return `feya-quest:customization:${storageSlug}`;
}

export function loadCustomization(storageSlug: string, storage: StorageLike): QuestCustomization | undefined {
  const defaults = defaultCustomization(storageSlug);
  if (!defaults || !getCustomizationProfile(storageSlug)) return undefined;
  try {
    const raw = storage.getItem(customizationKey(storageSlug));
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<QuestCustomizationAxis, unknown>>;
    const safe = { ...defaults };
    for (const axis of axes) {
      const value = parsed[axis];
      if (typeof value === "string" && value.trim()) safe[axis] = value.trim();
    }
    return safe;
  } catch {
    return defaults;
  }
}

export function saveCustomization(storageSlug: string, value: QuestCustomization, storage: StorageLike): void {
  if (!getCustomizationProfile(storageSlug)) return;
  const safe = Object.fromEntries(axes.map((axis) => [axis, value[axis].trim()])) as QuestCustomization;
  storage.setItem(customizationKey(storageSlug), JSON.stringify(safe));
}

export function resetCustomization(storageSlug: string, storage: StorageLike): void {
  storage.removeItem(customizationKey(storageSlug));
}
