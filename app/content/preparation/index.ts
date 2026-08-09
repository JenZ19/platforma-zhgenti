import { week1Profiles } from "./week-1";
import { week2Profiles } from "./week-2";
import { week3Profiles } from "./week-3";
import { week4Profiles } from "./week-4";
import { week5Profiles } from "./week-5";
import { week6Profiles } from "./week-6";
import type { ProjectPreparationProfile } from "./types";

const profiles: Record<string, ProjectPreparationProfile> = {
  ...week1Profiles,
  ...week2Profiles,
  ...week3Profiles,
  ...week4Profiles,
  ...week5Profiles,
  ...week6Profiles,
};

export function getPreparationProfile(slug: string): ProjectPreparationProfile {
  const profile = profiles[slug];
  if (!profile) throw new Error(`Не найден профиль подготовки для проекта ${slug}`);
  return profile;
}

export function getPreparationProfileSlugs(): string[] {
  return Object.keys(profiles);
}

export type { ProjectPreparationProfile } from "./types";

