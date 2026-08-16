"use client";

import { useEffect, useState } from "react";
import { projects } from "../content/projects";
import { isAvailableInMobileTrack } from "../content/mobile-availability";
import type { ProjectFormat } from "../content/types";
import {
  buildDashboardSnapshot,
  toggleSavedProject,
  type DashboardSection,
  type DashboardSnapshot,
} from "../lib/academy-dashboard";
import type { QuestSurface } from "../lib/output-format";
import { DashboardHome } from "./DashboardHome";
import { DashboardLibrary } from "./DashboardLibrary";
import { DashboardPortfolio } from "./DashboardPortfolio";
import { FairyAssistant } from "./FairyAssistant";

export type AcademyDashboardProps = {
  section: DashboardSection;
  searchQuery: string;
  onOpen: (slug: string, output?: ProjectFormat) => void;
  onOpenPortfolio?: () => void;
  onSearchQueryChange?: (query: string) => void;
  format: QuestSurface;
};

function renderDashboardSection(
  section: DashboardSection,
  snapshot: DashboardSnapshot,
  props: Pick<AcademyDashboardProps, "format" | "onOpen" | "onOpenPortfolio" | "onSearchQueryChange" | "searchQuery">,
  onSave: (slug: string) => void,
) {
  switch (section) {
    case "home":
      return (
        <DashboardHome
          snapshot={snapshot}
          format={props.format}
          onOpen={props.onOpen}
          onSave={onSave}
          onOpenPortfolio={props.onOpenPortfolio}
        />
      );
    case "projects":
      return (
        <DashboardLibrary
          snapshot={snapshot}
          mode="projects"
          initialQuery={props.searchQuery}
          format={props.format}
          onOpen={props.onOpen}
          onSave={onSave}
          onQueryChange={props.onSearchQueryChange}
        />
      );
    case "weeks":
      return (
        <DashboardLibrary
          snapshot={snapshot}
          mode="weeks"
          initialQuery={props.searchQuery}
          format={props.format}
          onOpen={props.onOpen}
          onSave={onSave}
          onQueryChange={props.onSearchQueryChange}
        />
      );
    case "portfolio":
      return <DashboardPortfolio snapshot={snapshot} format={props.format} onOpen={props.onOpen} />;
    case "fairy":
      return <FairyAssistant scope="academy" mode="full" format={props.format} />;
  }
  return assertNever(section);
}

function assertNever(value: never): never {
  throw new Error(`Неподдерживаемый раздел дашборда: ${value}`);
}

export function AcademyDashboard({ section, searchQuery, onOpen, onOpenPortfolio, onSearchQueryChange, format }: AcademyDashboardProps) {
  const [dashboardState, setDashboardState] = useState<{ format: QuestSurface; snapshot: DashboardSnapshot } | null>(null);
  const snapshot = dashboardState?.format === format ? dashboardState.snapshot : null;

  useEffect(() => {
    // Progress belongs to this browser and learning surface, so read it only after mount.
    const availableProjects = format === "mobile" ? projects.filter(isAvailableInMobileTrack) : projects;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDashboardState({ format, snapshot: buildDashboardSnapshot(availableProjects, window.localStorage, format) });
  }, [format]);

  function onSave(slug: string) {
    toggleSavedProject(slug, window.localStorage);
    const availableProjects = format === "mobile" ? projects.filter(isAvailableInMobileTrack) : projects;
    setDashboardState({ format, snapshot: buildDashboardSnapshot(availableProjects, window.localStorage, format) });
  }

  if (!snapshot) {
    return (
      <main
        className="dashboard-loading"
        data-dashboard-format={format}
        data-visual-theme="elina-burgundy"
        aria-label="Учебный кабинет"
      >
        <p role="status" aria-live="polite">Загружаем учебный кабинет…</p>
      </main>
    );
  }

  return renderDashboardSection(section, snapshot, { format, onOpen, onOpenPortfolio, onSearchQueryChange, searchQuery }, onSave);
}
