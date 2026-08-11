import type { SetupPlatform } from "../content/types";

export type { SetupPlatform };
export type SetupPlatformSurface = "desktop" | "mobile";

export function setupPlatformKey(surface: SetupPlatformSurface, slug = "install-codex"): string {
  return `submarine:setup-platform:${surface}:${slug}`;
}

export function loadSetupPlatform(
  surface: SetupPlatformSurface,
  storage: Pick<Storage, "getItem">,
  slug = "install-codex",
): SetupPlatform | undefined {
  const value = storage.getItem(setupPlatformKey(surface, slug));
  return value === "mac" || value === "windows" ? value : undefined;
}

export function saveSetupPlatform(
  surface: SetupPlatformSurface,
  platform: SetupPlatform,
  storage: Pick<Storage, "setItem">,
  slug = "install-codex",
): void {
  storage.setItem(setupPlatformKey(surface, slug), platform);
}

export function resetSetupPlatform(
  surface: SetupPlatformSurface,
  storage: Pick<Storage, "removeItem">,
  slug = "install-codex",
): void {
  storage.removeItem(setupPlatformKey(surface, slug));
}
