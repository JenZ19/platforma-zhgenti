import type { MouseEvent as ReactMouseEvent } from "react";
import { getCatalogDiscoveryProfile } from "../content/discovery";
import { isProjectBundle } from "../content/projects";
import type { DashboardProjectState } from "../lib/academy-dashboard";
import type { QuestSurface } from "../lib/output-format";
import { ProjectPreview } from "./ProjectPreview";

export type DashboardProjectCardProps = {
  item: DashboardProjectState;
  onOpen: (slug: string) => void;
  onSave: (slug: string) => void;
  format: QuestSurface;
};

export function dashboardQuestHref(slug: string, format: QuestSurface): string {
  return format === "mobile"
    ? `?format=mobile&quest=${encodeURIComponent(slug)}`
    : `?quest=${encodeURIComponent(slug)}`;
}

export function shouldHandleSpaNavigation(event: ReactMouseEvent<HTMLAnchorElement>): boolean {
  const target = event.currentTarget.target;
  return !event.defaultPrevented
    && event.button === 0
    && !event.metaKey
    && !event.ctrlKey
    && !event.shiftKey
    && !event.altKey
    && (target === "" || target === "_self");
}

export function DashboardProjectCard({ item, onOpen, onSave, format }: DashboardProjectCardProps) {
  const { project } = item;
  const discovery = getCatalogDiscoveryProfile(project);
  const week = isProjectBundle(project) ? "Недели 1–2" : `Неделя ${project.week}`;
  const saveLabel = item.saved
    ? `Убрать ${project.title} из сохранённых`
    : `Сохранить на потом: ${project.title}`;
  const action = item.status === "new" ? "Начать" : "Продолжить";

  return (
    <article className="dashboard-project-card" aria-label={project.title}>
      <ProjectPreview project={project} />
      <div className="dashboard-card-body">
        <div className="dashboard-card-labels">
          <span>{week}</span>
          <span>{discovery.label}</span>
          <span>{project.device}</span>
        </div>
        <h3>{project.title}</h3>
        <p>{project.outcome}</p>
        <div className="dashboard-progress" aria-label={`Пройдено ${item.completedLevels} из ${item.totalLevels}`}>
          <i aria-hidden="true"><b style={{ width: `${item.percent}%` }} /></i>
          <span>{item.completedLevels}/{item.totalLevels}</span>
        </div>
        <footer>
          <button
            type="button"
            className={item.saved ? "saved" : undefined}
            aria-label={saveLabel}
            aria-pressed={item.saved}
            onClick={() => onSave(project.slug)}
          >
            {item.saved ? "Сохранено ✓" : "На потом"}
          </button>
          <a
            className="dashboard-card-action"
            href={dashboardQuestHref(project.slug, format)}
            aria-label={`${action}: ${project.title}`}
            onClick={(event) => {
              if (!shouldHandleSpaNavigation(event)) return;
              event.preventDefault();
              onOpen(project.slug);
            }}
          >
            {action} →
          </a>
        </footer>
      </div>
    </article>
  );
}
