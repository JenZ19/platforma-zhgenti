import type { MouseEvent as ReactMouseEvent } from "react";
import { getCatalogDiscoveryProfile } from "../content/discovery";
import { isProjectBundle } from "../content/projects";
import type { ProjectFormat, ProjectKind } from "../content/types";
import type { DashboardProjectState } from "../lib/academy-dashboard";
import type { QuestSurface } from "../lib/output-format";
import { questDurationLabel } from "../lib/quest-duration";
import { ProjectPreview } from "./ProjectPreview";

export type DashboardProjectCardProps = {
  item: DashboardProjectState;
  onOpen: (slug: string, output?: ProjectFormat) => void;
  onSave: (slug: string) => void;
  format: QuestSurface;
  showDiscoveryDetails?: boolean;
};

export function dashboardQuestHref(slug: string, format: QuestSurface, output?: ProjectFormat): string {
  const query = new URLSearchParams();
  if (format === "mobile") query.set("format", "mobile");
  query.set("quest", slug);
  if (output) query.set("output", output);
  return `?${query.toString()}`;
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

const formatLabels: Record<ProjectKind, string> = {
  service: "Сервис",
  agent: "ИИ-агент",
  "simple-site": "Сайт",
  "advanced-site": "Сайт",
  portfolio: "Портфолио",
};

export function DashboardProjectCard({ item, onOpen, onSave, format, showDiscoveryDetails = false }: DashboardProjectCardProps) {
  const { project } = item;
  const bundled = isProjectBundle(project);
  const discovery = getCatalogDiscoveryProfile(project);
  const week = bundled ? "Недели 1–2" : `Неделя ${project.week}`;
  const saveLabel = item.saved
    ? `Убрать ${project.title} из сохранённых`
    : `Сохранить на потом: ${project.title}`;
  const action = item.status === "completed" ? "Открыть проект" : item.status === "new" ? "Начать" : "Продолжить";
  const resultFormat = bundled
    ? item.output ? item.output === "service" ? "Сервис" : "ИИ-агент" : "2 варианта на выбор"
    : formatLabels[project.kind];
  const resultType = bundled
    ? item.output ? item.output === "service" ? "Сервис" : "ИИ-агент" : "экранный сервис / разговорный ИИ-агент"
    : formatLabels[project.kind];

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
        <div className="dashboard-card-facts">
          <p>Время: {questDurationLabel(item.totalLevels, format)}</p>
          <p>Формат: {resultFormat}</p>
          {showDiscoveryDetails ? <p>Тип результата: {resultType}</p> : null}
          {showDiscoveryDetails ? <p>Ключевые слова: {discovery.keywords.join(", ")}</p> : null}
          {showDiscoveryDetails && bundled && !item.output ? <p>Чем отличаются: сервис открывают и нажимают кнопки; с ИИ-агентом переписываются как с помощником</p> : null}
        </div>
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
            href={dashboardQuestHref(project.slug, format, item.output)}
            aria-label={`${action}: ${project.title}`}
            onClick={(event) => {
              if (!shouldHandleSpaNavigation(event)) return;
              event.preventDefault();
              if (item.output) onOpen(project.slug, item.output);
              else onOpen(project.slug);
            }}
          >
            {action} →
          </a>
        </footer>
      </div>
    </article>
  );
}
