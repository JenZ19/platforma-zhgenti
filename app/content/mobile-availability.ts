import type { CatalogProject } from "./types";

export function isAvailableInMobileTrack(project: CatalogProject): boolean {
  return !("journey" in project && project.journey === "setup");
}
