import { isProjectBundle } from "../content/projects";
import type { CatalogProject } from "../content/types";
import type { DashboardSnapshot } from "../lib/academy-dashboard";
import type { QuestSurface } from "../lib/output-format";
import { dashboardQuestHref, shouldHandleSpaNavigation } from "./DashboardProjectCard";
import { ProjectPreview } from "./ProjectPreview";

export type DashboardPortfolioProps = {
  snapshot: DashboardSnapshot;
  format: QuestSurface;
  onOpen: (slug: string) => void;
};

function audienceFor(project: CatalogProject): string {
  if (!isProjectBundle(project)) return project.audience;
  return [...new Set(Object.values(project.formats).map((branch) => branch.audience))].join("; ");
}

function factualDate(date: string): string {
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}.${month}.${year}` : date;
}

export function DashboardPortfolio({ snapshot, format, onOpen }: DashboardPortfolioProps) {
  if (!snapshot.completed.length) {
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
        {snapshot.completed.map((item) => (
          <article key={item.project.slug} aria-label={item.project.title}>
            <ProjectPreview project={item.project} />
            <div className="portfolio-card-body">
              {item.completedAt ? <p>Готово <time dateTime={item.completedAt}>{factualDate(item.completedAt)}</time></p> : null}
              <h2>{item.project.title}</h2>
              <p><strong>Для кого:</strong> {audienceFor(item.project)}</p>
              <p><strong>Формат:</strong> {item.project.track}</p>
              <a
                href={dashboardQuestHref(item.project.slug, format)}
                aria-label={`Открыть проект: ${item.project.title}`}
                onClick={(event) => {
                  if (!shouldHandleSpaNavigation(event)) return;
                  event.preventDefault();
                  onOpen(item.project.slug);
                }}
              >
                Открыть проект →
              </a>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
