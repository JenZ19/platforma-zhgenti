import type { CatalogProject } from "./types";

export function isAvailableInMobileTrack(project: CatalogProject): boolean {
  return project.journey !== "setup";
}
