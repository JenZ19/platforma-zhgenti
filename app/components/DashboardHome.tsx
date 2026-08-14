import { isProjectBundle } from "../content/projects";
import type { DashboardSnapshot } from "../lib/academy-dashboard";
import { DashboardProjectCard, dashboardQuestHref, shouldHandleSpaNavigation } from "./DashboardProjectCard";
import { ProjectPreview } from "./ProjectPreview";

export type DashboardHomeProps = {
  snapshot: DashboardSnapshot;
  format: "desktop" | "mobile";
  onOpen: (slug: string) => void;
  onSave: (slug: string) => void;
  onOpenPortfolio?: () => void;
};

function portfolioHref(format: "desktop" | "mobile"): string {
  return format === "mobile" ? "?format=mobile&section=portfolio" : "?section=portfolio";
}

export function DashboardHome({ snapshot, format, onOpen, onSave, onOpenPortfolio }: DashboardHomeProps) {
  const { next } = snapshot;
  const weekItems = snapshot.items
    .filter((item) => isProjectBundle(item.project)
      ? item.project.weeks.includes(snapshot.currentWeek as 1 | 2)
      : item.project.week === snapshot.currentWeek)
    .filter((item) => item.status !== "completed")
    .slice(0, 4);
  const started = snapshot.started.slice(0, 3);
  const primaryAction = next?.status === "new" ? "Начать квест" : "Продолжить";

  return (
    <main className="dashboard-home" data-visual-theme="pink-cloud" data-dashboard-section="home" data-dashboard-format={format}>
      <section className="next-quest-banner" aria-labelledby="dashboard-next-title">
        {next ? (
          <>
            <div>
              <p>Ваш следующий шаг</p>
              <h1 id="dashboard-next-title">{next.project.title}</h1>
              <span>{next.project.outcome}</span>
              <a
                className="dashboard-primary-action"
                href={dashboardQuestHref(next.project.slug, format)}
                aria-label={`${primaryAction}: ${next.project.title}`}
                onClick={(event) => {
                  if (!shouldHandleSpaNavigation(event)) return;
                  event.preventDefault();
                  onOpen(next.project.slug);
                }}
              >
                {primaryAction} →
              </a>
            </div>
            <ProjectPreview project={next.project} />
          </>
        ) : (
          <div>
            <p>Все квесты пройдены</p>
            <h1 id="dashboard-next-title">Все проекты готовы</h1>
            <span>Работы уже собраны — можно проверить их и подготовить к показу.</span>
            <a
              className="dashboard-primary-action"
              href={portfolioHref(format)}
              aria-label="Открыть портфолио"
              onClick={(event) => {
                if (!onOpenPortfolio || !shouldHandleSpaNavigation(event)) return;
                event.preventDefault();
                onOpenPortfolio();
              }}
            >
              Открыть портфолио →
            </a>
          </div>
        )}
      </section>

      <section className="dashboard-stat-grid" aria-label="Ваш прогресс">
        <article><span>Текущая неделя</span><strong>{snapshot.currentWeek}</strong></article>
        <article><span>Пройдено уровней</span><strong>{snapshot.completedLevels}</strong></article>
        <article><span>Готово проектов</span><strong>{snapshot.completed.length}</strong></article>
      </section>

      {started.length > 0 ? (
        <section className="dashboard-row" aria-labelledby="dashboard-started-title">
          <header>
            <div><p>Продолжить</p><h2 id="dashboard-started-title">Начатые проекты</h2></div>
          </header>
          <div className="dashboard-card-grid">
            {started.map((item) => (
              <DashboardProjectCard key={item.project.slug} item={item} onOpen={onOpen} onSave={onSave} format={format} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="dashboard-row" aria-labelledby="dashboard-week-title">
        <header>
          <div><p>Неделя {snapshot.currentWeek}</p><h2 id="dashboard-week-title">Рекомендуемый порядок</h2></div>
          <span>Можно выбрать любой проект</span>
        </header>
        {weekItems.length > 0 ? (
          <div className="dashboard-card-grid">
            {weekItems.map((item) => (
              <DashboardProjectCard key={item.project.slug} item={item} onOpen={onOpen} onSave={onSave} format={format} />
            ))}
          </div>
        ) : (
          <div className="dashboard-empty" role="status">
            <h3>На этой неделе нет новых квестов</h3>
            <p>Можно продолжить начатый проект или открыть портфолио.</p>
          </div>
        )}
      </section>
    </main>
  );
}
