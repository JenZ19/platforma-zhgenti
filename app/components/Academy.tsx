"use client";

import type { DashboardSection } from "../lib/academy-dashboard";
import type { ProjectFormat } from "../content/types";
import { AcademyDashboard } from "./AcademyDashboard";

export type AcademyProps = {
  section?: DashboardSection;
  searchQuery?: string;
  onOpen?: (slug: string, output?: ProjectFormat) => void;
  onOpenPortfolio?: () => void;
  onSearchQueryChange?: (query: string) => void;
};

export function Academy({ section = "home", searchQuery = "", onOpen = () => undefined, onOpenPortfolio, onSearchQueryChange }: AcademyProps) {
  return (
    <AcademyDashboard
      section={section}
      searchQuery={searchQuery}
      onOpen={onOpen}
      onOpenPortfolio={onOpenPortfolio}
      onSearchQueryChange={onSearchQueryChange}
      format="desktop"
    />
  );
}
