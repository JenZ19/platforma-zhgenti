"use client";

import { useEffect, useState } from "react";
import { projects } from "../content/projects";
import {
  buildDashboardSnapshot,
  toggleSavedProject,
  type DashboardSection,
  type DashboardSnapshot,
} from "../lib/academy-dashboard";
import type { QuestSurface } from "../lib/output-format";
import { DashboardHome } from "./DashboardHome";

export type AcademyDashboardProps = {
  section: DashboardSection;
  searchQuery: string;
  onOpen: (slug: string) => void;
  format: QuestSurface;
};

const sectionCopy: Record<Exclude<DashboardSection, "home">, { title: string; description: string }> = {
  projects: {
    title: "Мои проекты",
    description: "Здесь будут начатые, готовые и сохранённые на потом проекты.",
  },
  weeks: {
    title: "Квесты по неделям",
    description: "Здесь будет программа всех шести недель с поиском и фильтрами.",
  },
  portfolio: {
    title: "Портфолио",
    description: "Здесь будут автоматически появляться завершённые работы.",
  },
  fairy: {
    title: "Феечка",
    description: "Здесь можно будет собрать вопрос по текущему экрану и сохранить его для помощи.",
  },
};

function DashboardSectionStub({ section, searchQuery, format }: {
  section: Exclude<DashboardSection, "home">;
  searchQuery: string;
  format: QuestSurface;
}) {
  const copy = sectionCopy[section];
  return (
    <main
      className="dashboard-section dashboard-section-pending"
      data-dashboard-section={section}
      data-dashboard-format={format}
      data-visual-theme="pink-cloud"
      aria-label={copy.title}
    >
      <header><p>Учебный кабинет</p><h1>{copy.title}</h1></header>
      <section className="dashboard-empty" role="status">
        <h2>Раздел готовится</h2>
        <p>{copy.description}</p>
        {searchQuery ? <p>Поиск «{searchQuery}» сохранён и будет применён в каталоге.</p> : null}
      </section>
    </main>
  );
}

function renderDashboardSection(
  section: DashboardSection,
  snapshot: DashboardSnapshot,
  props: Pick<AcademyDashboardProps, "format" | "onOpen" | "searchQuery">,
  onSave: (slug: string) => void,
) {
  switch (section) {
    case "home":
      return <DashboardHome snapshot={snapshot} format={props.format} onOpen={props.onOpen} onSave={onSave} />;
    case "projects":
    case "weeks":
    case "portfolio":
    case "fairy":
      return <DashboardSectionStub section={section} searchQuery={props.searchQuery} format={props.format} />;
  }
  return assertNever(section);
}

function assertNever(value: never): never {
  throw new Error(`Неподдерживаемый раздел дашборда: ${value}`);
}

export function AcademyDashboard({ section, searchQuery, onOpen, format }: AcademyDashboardProps) {
  const [dashboardState, setDashboardState] = useState<{ format: QuestSurface; snapshot: DashboardSnapshot } | null>(null);
  const snapshot = dashboardState?.format === format ? dashboardState.snapshot : null;

  useEffect(() => {
    // Progress belongs to this browser and learning surface, so read it only after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDashboardState({ format, snapshot: buildDashboardSnapshot(projects, window.localStorage, format) });
  }, [format]);

  function onSave(slug: string) {
    toggleSavedProject(slug, window.localStorage);
    setDashboardState({ format, snapshot: buildDashboardSnapshot(projects, window.localStorage, format) });
  }

  if (!snapshot) {
    return (
      <main
        className="dashboard-loading"
        data-dashboard-format={format}
        data-visual-theme="pink-cloud"
        aria-label="Учебный кабинет"
      >
        <p role="status" aria-live="polite">Загружаем учебный кабинет…</p>
      </main>
    );
  }

  return renderDashboardSection(section, snapshot, { format, onOpen, searchQuery }, onSave);
}
