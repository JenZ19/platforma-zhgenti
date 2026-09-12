import { isProjectBundle } from "../content/projects";
import type { ProjectDefinition, ProjectFormat } from "../content/types";
import type { DashboardSnapshot } from "../lib/academy-dashboard";
import type { QuestSurface } from "../lib/output-format";
import { PortfolioPublish } from "./PortfolioPublish";
import { PortfolioResultCard } from "./PortfolioResultCard";

export type DashboardPortfolioProps = { snapshot: DashboardSnapshot; format: QuestSurface; onOpen: (slug: string, output?: ProjectFormat) => void };
export function DashboardPortfolio({ snapshot, format, onOpen }: DashboardPortfolioProps) {
  const works = snapshot.items.flatMap<{ id: string; project: ProjectDefinition; output?: ProjectFormat; slug: string }>((item) => {
    if (isProjectBundle(item.project)) {
      const bundle = item.project;
      const outputs = [...new Set([...item.completedOutputs.map((entry) => entry.format), ...(item.status === "started" && item.output ? [item.output] : [])])];
      return outputs.map((output) => ({ id: `${bundle.slug}:${output}`, project: bundle.formats[output], output, slug: bundle.slug }));
    }
    if (item.project.journey === "setup" || item.project.kind === "portfolio" || item.status === "new") return [];
    return [{ id: item.project.slug, project: item.project, output: undefined, slug: item.project.slug }];
  });
  return <main className="dashboard-section" data-dashboard-section="portfolio" data-dashboard-format={format} data-visual-theme="elina-burgundy">
    <header><p>Мои результаты</p><h1>Портфолио</h1><p>Заполняйте карточки по мере работы. Для выпуска выберите 3–5 лучших. Установка приложения и покупка сервера — подготовка, а не отдельные работы.</p></header>
    {!works.length ? <section className="dashboard-empty"><h2>Начните первый проект</h2><p>Как только пройдёте первый шаг сервиса, агента или сайта, здесь можно будет сохранить его название и ссылку. Не нужно ждать последней недели.</p><a href={`?format=${format}&section=weeks`}>Выбрать проект в маршруте →</a></section> : <div className="portfolio-grid">
      {works.map((work) => <PortfolioResultCard key={work.id} id={work.id} project={work.project} output={work.output} onOpen={() => onOpen(work.slug, work.output)} />)}
    </div>}
    {works.length > 0 && <PortfolioPublish works={works} snapshot={snapshot} />}
  </main>;
}
