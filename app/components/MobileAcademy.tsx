"use client";

import type { DashboardSection } from "../lib/academy-dashboard";
import type { ProjectFormat } from "../content/types";
import { AcademyDashboard } from "./AcademyDashboard";

export type MobileAcademyProps = {
  section?: DashboardSection;
  searchQuery?: string;
  onOpen: (slug: string, output?: ProjectFormat) => void;
  onOpenPortfolio?: () => void;
  onSearchQueryChange?: (query: string) => void;
};

export function MobileAcademy({ section = "home", searchQuery = "", onOpen, onOpenPortfolio, onSearchQueryChange }: MobileAcademyProps) {
  return (
    <AcademyDashboard
      section={section}
      searchQuery={searchQuery}
      onOpen={onOpen}
      onOpenPortfolio={onOpenPortfolio}
      onSearchQueryChange={onSearchQueryChange}
      format="mobile"
    />
  );
}
