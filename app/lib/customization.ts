import { defaultCustomization, getCustomizationProfile } from "../content/customization";
import type { QuestColorPalette, QuestCustomization, QuestCustomizationAxis } from "../content/types";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const axes: QuestCustomizationAxis[] = ["audience", "goal", "name", "style", "tone", "feature"];
const colorFields: (keyof Omit<QuestColorPalette, "name">)[] = ["background", "surface", "accent", "text"];

function safePalette(value: unknown, fallback: QuestColorPalette): QuestColorPalette {
  if (!value || typeof value !== "object") return { ...fallback };
  const raw = value as Partial<Record<keyof QuestColorPalette, unknown>>;
  if (typeof raw.name !== "string" || !raw.name.trim()) return { ...fallback };
  for (const field of colorFields) {
    if (typeof raw[field] !== "string" || !/^#[0-9a-f]{6}$/i.test(raw[field])) return { ...fallback };
  }
  return {
    name: raw.name.trim(),
    background: raw.background as string,
    surface: raw.surface as string,
    accent: raw.accent as string,
    text: raw.text as string,
  };
}

export function customizationKey(storageSlug: string): string {
  return `feya-quest:customization:${storageSlug}`;
}

export function loadCustomization(storageSlug: string, storage: StorageLike): QuestCustomization | undefined {
  const defaults = defaultCustomization(storageSlug);
  if (!defaults || !getCustomizationProfile(storageSlug)) return undefined;
  try {
    const raw = storage.getItem(customizationKey(storageSlug));
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<QuestCustomizationAxis, unknown>> & { palette?: unknown };
    const safe = { ...defaults };
    for (const axis of axes) {
      const value = parsed[axis];
      if (typeof value === "string" && value.trim()) safe[axis] = value.trim();
    }
    safe.palette = safePalette(parsed.palette, defaults.palette);
    return safe;
  } catch {
    return defaults;
  }
}

export function saveCustomization(storageSlug: string, value: QuestCustomization, storage: StorageLike): void {
  if (!getCustomizationProfile(storageSlug)) return;
  const defaults = defaultCustomization(storageSlug)!;
  const safe = {
    ...Object.fromEntries(axes.map((axis) => [axis, value[axis].trim()])),
    palette: safePalette(value.palette, defaults.palette),
  } as QuestCustomization;
  storage.setItem(customizationKey(storageSlug), JSON.stringify(safe));
}

export function resetCustomization(storageSlug: string, storage: StorageLike): void {
  storage.removeItem(customizationKey(storageSlug));
}
