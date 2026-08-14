"use client";

import type { DashboardSection } from "../lib/academy-dashboard";
import { AcademyDashboard } from "./AcademyDashboard";

export type MobileAcademyProps = {
  section?: DashboardSection;
  searchQuery?: string;
  onOpen: (slug: string) => void;
  onOpenPortfolio?: () => void;
};

export function MobileAcademy({ section = "home", searchQuery = "", onOpen, onOpenPortfolio }: MobileAcademyProps) {
  return (
    <AcademyDashboard
      section={section}
      searchQuery={searchQuery}
      onOpen={onOpen}
      onOpenPortfolio={onOpenPortfolio}
      format="mobile"
    />
  );
}
