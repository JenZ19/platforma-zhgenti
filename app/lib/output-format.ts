import type { ProjectFormat } from "../content/types";
import { resetCustomization } from "./customization";
import { resetPreparation } from "./preparation";
import { resetProgress, type StorageLike } from "./progress";

const PREFIX = "feya-academy-output-v1";

export type QuestSurface = "desktop" | "mobile";

export function outputChoiceKey(slug: string, surface: QuestSurface): string {
  return `${PREFIX}:${surface === "mobile" ? "mobile:" : ""}${slug}`;
}

export function branchStorageSlug(
  slug: string,
  format: ProjectFormat,
  surface: QuestSurface,
): string {
  return `${surface === "mobile" ? "mobile:" : ""}${slug}:${format}`;
}

export function parseOutputChoice(raw: string | null): ProjectFormat | undefined {
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw);
    return value === "service" || value === "agent" ? value : undefined;
  } catch {
    return undefined;
  }
}

export function loadOutputChoice(
  slug: string,
  surface: QuestSurface,
  storage: StorageLike,
): ProjectFormat | undefined {
  return parseOutputChoice(storage.getItem(outputChoiceKey(slug, surface)));
}

export function saveOutputChoice(
  slug: string,
  surface: QuestSurface,
  value: ProjectFormat,
  storage: StorageLike,
): void {
  storage.setItem(outputChoiceKey(slug, surface), JSON.stringify(value));
}

export function resetOutputChoice(
  slug: string,
  surface: QuestSurface,
  storage: StorageLike,
): void {
  storage.removeItem(outputChoiceKey(slug, surface));
}

export function resetBundleState(
  slug: string,
  surface: QuestSurface,
  storage: StorageLike,
): void {
  for (const format of ["service", "agent"] as const) {
    const branch = branchStorageSlug(slug, format, surface);
    resetProgress(branch, storage);
    resetPreparation(branch, storage);
    resetCustomization(branch, storage);
  }
  resetOutputChoice(slug, surface, storage);
}
