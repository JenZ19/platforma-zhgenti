"use client";

import type { DashboardSection } from "../lib/academy-dashboard";
import { AcademyDashboard } from "./AcademyDashboard";

export type AcademyProps = {
  section?: DashboardSection;
  searchQuery?: string;
  onOpen?: (slug: string) => void;
  onOpenPortfolio?: () => void;
};

export function Academy({ section = "home", searchQuery = "", onOpen = () => undefined, onOpenPortfolio }: AcademyProps) {
  return (
    <AcademyDashboard
      section={section}
      searchQuery={searchQuery}
      onOpen={onOpen}
      onOpenPortfolio={onOpenPortfolio}
      format="desktop"
    />
  );
}
