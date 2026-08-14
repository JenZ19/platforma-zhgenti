"use client";

import type { DashboardSection } from "../lib/academy-dashboard";
import { AcademyDashboard } from "./AcademyDashboard";

export type AcademyProps = {
  section?: DashboardSection;
  searchQuery?: string;
  onOpen?: (slug: string) => void;
};

export function Academy({ section = "home", searchQuery = "", onOpen = () => undefined }: AcademyProps) {
  return (
    <AcademyDashboard
      section={section}
      searchQuery={searchQuery}
      onOpen={onOpen}
      format="desktop"
    />
  );
}
