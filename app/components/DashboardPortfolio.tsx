import { isProjectBundle } from "../content/projects";
import type { ProjectDefinition, ProjectFormat } from "../content/types";
import type { DashboardProjectState, DashboardSnapshot } from "../lib/academy-dashboard";
import type { QuestSurface } from "../lib/output-format";
import { isIsoCalendarDate } from "../lib/progress";
import { dashboardQuestHref, shouldHandleSpaNavigation } from "./DashboardProjectCard";
import { ProjectPreview } from "./ProjectPreview";

export type DashboardPortfolioProps = {
  snapshot: DashboardSnapshot;
  format: QuestSurface;
  onOpen: (slug: string, output?: ProjectFormat) => void;
};

const outputLabels: Record<ProjectFormat, string> = {
  service: "Сервис",
  agent: "ИИ-агент",
};

const outputActions: Record<ProjectFormat, string> = {
  service: "Открыть сервис",
  agent: "Открыть ИИ-агента",
};

function factualDate(date?: string): string | undefined {
  if (!date || !isIsoCalendarDate(date)) return undefined;
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}

function ProjectLink({ item, format, output, onOpen }: {
  item: DashboardProjectState;
  format: QuestSurface;
  output?: ProjectFormat;
  onOpen: DashboardPortfolioProps["onOpen"];
}) {
  const action = output ? outputActions[output] : "Открыть проект";
  return (
    <a
      href={dashboardQuestHref(item.project.slug, format, output)}
      aria-label={`${action}: ${item.project.title}`}
      onClick={(event) => {
        if (!shouldHandleSpaNavigation(event)) return;
        event.preventDefault();
        if (output) onOpen(item.project.slug, output);
        else onOpen(item.project.slug);
      }}
    >
      {action} →
    </a>
  );
}

function CompletionDate({ value, label }: { value?: string; label?: string }) {
  const shown = factualDate(value);
  if (!shown || !value) return null;
  return <p>{label ? `${label}: ` : "Готово "}<time dateTime={value}>{shown}</time></p>;
}

function StandaloneCard({ item, format, onOpen }: {
  item: DashboardProjectState;
  format: QuestSurface;
  onOpen: DashboardPortfolioProps["onOpen"];
}) {
  const project = item.project as ProjectDefinition;
  return (
    <article aria-label={project.title}>
      <ProjectPreview project={project} />
      <div className="portfolio-card-body">
        <CompletionDate value={item.completedAt} />
        <h2>{project.title}</h2>
        <p><strong>Для кого:</strong> {project.audience}</p>
        <p><strong>Формат:</strong> {project.kind === "agent" ? "ИИ-агент" : project.kind === "portfolio" ? "Портфолио" : project.kind.includes("site") ? "Сайт" : "Сервис"}</p>
        <p><strong>Направление:</strong> {project.track}</p>
        <ProjectLink item={item} format={format} onOpen={onOpen} />
      </div>
    </article>
  );
}

function BundleCard({ item, format, onOpen }: {
  item: DashboardProjectState;
  format: QuestSurface;
  onOpen: DashboardPortfolioProps["onOpen"];
}) {
  if (!isProjectBundle(item.project)) return null;
  const { project } = item;
  const completed = item.completedOutputs;
  const only = completed.length === 1 ? completed[0] : undefined;
  if (only) {
    const branch = project.formats[only.format];
    return (
      <article aria-label={project.title}>
        <ProjectPreview project={branch} />
        <div className="portfolio-card-body">
          <CompletionDate value={only.completedAt} />
          <h2>{project.title}</h2>
          <p><strong>Для кого:</strong> {branch.audience}</p>
          <p><strong>Формат:</strong> {outputLabels[only.format]}</p>
          <ProjectLink item={item} format={format} output={only.format} onOpen={onOpen} />
        </div>
      </article>
    );
  }

  return (
    <article aria-label={project.title}>
      <ProjectPreview project={project} />
      <div className="portfolio-card-body">
        <p>Готовы оба формата</p>
        <h2>{project.title}</h2>
        {completed.map((branch) => (
          <section key={branch.format} aria-label={`${outputLabels[branch.format]}: ${project.title}`}>
            <h3>{outputLabels[branch.format]}</h3>
            <p><strong>Для кого:</strong> {project.formats[branch.format].audience}</p>
            <CompletionDate value={branch.completedAt} label="Готово" />
            <ProjectLink item={item} format={format} output={branch.format} onOpen={onOpen} />
          </section>
        ))}
      </div>
    </article>
  );
}

export function DashboardPortfolio({ snapshot, format, onOpen }: DashboardPortfolioProps) {
  const completed = snapshot.items.filter((item) => isProjectBundle(item.project)
    ? item.completedOutputs.length > 0
    : item.status === "completed");

  if (!completed.length) {
    return (
      <main className="dashboard-section" data-dashboard-section="portfolio" data-dashboard-format={format} data-visual-theme="pink-cloud">
        <header><p>Моя витрина</p><h1>Портфолио</h1></header>
        <section className="dashboard-empty">
          <span aria-hidden="true">◇</span>
          <h2>Здесь появится первая готовая работа</h2>
          <p>Завершите любой квест — проект добавится сюда автоматически.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-section" data-dashboard-section="portfolio" data-dashboard-format={format} data-visual-theme="pink-cloud">
      <header><p>Моя витрина</p><h1>Портфолио</h1><span>Работы добавляются автоматически после завершения всех уровней.</span></header>
      <div className="portfolio-grid">
        {completed.map((item) => isProjectBundle(item.project)
          ? <BundleCard key={item.project.slug} item={item} format={format} onOpen={onOpen} />
          : <StandaloneCard key={item.project.slug} item={item} format={format} onOpen={onOpen} />)}
      </div>
    </main>
  );
}
