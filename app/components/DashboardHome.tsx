import type { ProjectFormat } from "../content/types";
import type { DashboardSnapshot } from "../lib/academy-dashboard";
import { DashboardProjectCard, dashboardQuestHref, shouldHandleSpaNavigation } from "./DashboardProjectCard";
import { ProjectPreview } from "./ProjectPreview";
import { CourseRoute } from "./CourseRoute";
import { CourseWeekBanner } from "./CourseWeekBanner";
import { LearningSetup } from "./LearningSetup";
import { LearningReset } from "./LearningReset";
import { HomeScreenGuide } from "./HomeScreenGuide";
import { PersonalFairy } from "./PersonalFairy";
import { resolveProjectVariant } from "../content/projects";
import { collectRewards, sparksLabel } from "../lib/rewards";

export type DashboardHomeProps = {
  snapshot: DashboardSnapshot;
  format: "desktop" | "mobile";
  onOpen: (slug: string, output?: ProjectFormat) => void;
  onSave: (slug: string) => void;
  onOpenPortfolio?: () => void;
  onRefresh?: () => void;
};

function portfolioHref(format: "desktop" | "mobile"): string {
  return format === "mobile" ? "?format=mobile&section=portfolio" : "?section=portfolio";
}

/** Сколько курса позади: шесть недель целиком, а не «шаг N из M» одного квеста. */
function CourseProgress({ snapshot, format }: { snapshot: DashboardSnapshot; format: "desktop" | "mobile" }) {
  const weeks = snapshot.course ?? [];
  if (!weeks.length) return null;
  const done = weeks.filter((week) => week.complete).length;
  const percent = Math.round(done / weeks.length * 100);
  return <section className="course-progress" aria-labelledby="course-progress-title">
    <header>
      <h2 id="course-progress-title">Маршрут курса</h2>
      <p><strong>{done}</strong> из {weeks.length} недель закрыто</p>
    </header>
    <ol className="course-progress-weeks">
      {weeks.map((week) => {
        const state = week.complete ? "done" : week.item?.status === "started" ? "current" : "waiting";
        return <li key={week.week} data-state={state}>
          <i aria-hidden="true">{week.complete ? "✓" : week.week}</i>
          <span>{week.title}</span>
        </li>;
      })}
    </ol>
    <p className="course-progress-bar" aria-hidden="true"><b style={{ width: `${percent}%` }} /></p>
    <p className="course-progress-hint">
      {done === weeks.length
        ? "Маршрут пройден. Осталось собрать портфолио и получить сертификат."
        : "Неделя закрывается одним доведённым до конца проектом. Остальная библиотека — по желанию."}
      {" "}<a href={`?format=${format}&section=weeks`}>Открыть маршрут →</a>
    </p>
  </section>;
}

export function DashboardHome({ snapshot, format, onOpen, onSave, onOpenPortfolio, onRefresh = () => undefined }: DashboardHomeProps) {
  const { next } = snapshot;
  const isNew = snapshot.completedLevels === 0;
  const mobileStart = isNew && format === "mobile";
  const nextResult = next ? resolveProjectVariant(next.project, next.output) ?? next.project : undefined;
  const started = snapshot.started.filter((item) => item.project.slug !== next?.project.slug).slice(0, 3);
  const primaryAction = next?.status === "started" ? "Продолжить проект" : next?.project.slug === "install-codex" ? "Установить и проверить Codex" : "Открыть проект";
  const { sparks } = collectRewards(snapshot);

  return (
    <main className="dashboard-home" data-visual-theme="elina-burgundy" data-dashboard-section="home" data-dashboard-format={format}>
      <header className="home-orientation">
        <p className="academy-kicker">НЕЙРОПРОФИ · Практический курс</p>
        <h1>{isNew ? "С чего начать обучение" : "Моё обучение"}</h1>
        <p>{isNew ? "Здесь вы научитесь создавать сервисы, сайты и ИИ-агентов для себя и клиентов. В каждом проекте — инструкция, готовые команды для ИИ и пример результата." : "Продолжайте начатую работу или выберите проект своей недели ниже."}</p>
        {isNew && <ol className="home-start-route">
          <li><strong>Подготовьте рабочее место</strong><span>{format === "mobile" ? "Личный помощник школы в Telegram" : "Codex на вашем компьютере"}</span></li>
          <li><strong>Выберите один проект</strong><span>Например, планер для своих дел</span></li>
          <li><strong>Соберите и настройте под себя</strong><span>Следуйте инструкции внутри проекта</span></li>
        </ol>}
      </header>
      <section className="next-quest-banner" aria-labelledby="dashboard-next-title">
        {mobileStart ? <>
          <div>
            <p>Перед первым проектом · телефон</p>
            <h2 id="dashboard-next-title">Ваш помощник — Феечка</h2>
            <span>Сохраните адрес своей личной Феечки один раз. Затем отправляйте ей команды из уроков — она поможет собрать ваш проект.</span>
            <PersonalFairy ask className="dashboard-primary-action" label="Открыть Феечку в Telegram" />
            <a className="home-secondary-action" href="#home-course-route">Помощник уже готов — выбрать проект</a>
          </div>
        </> : next ? (
          <>
            <div>
              <p>{next.status === "started" ? "Продолжить начатое" : next.project.slug === "install-codex" ? "Перед первым проектом · компьютер" : `Выбранный проект · неделя ${snapshot.currentWeek}`}</p>
              <h2 id="dashboard-next-title">{next.project.title}</h2>
              <span>{next.project.slug === "install-codex" ? "Установите Codex и выполните тестовую задачу. После этого сможете собирать свои проекты по инструкциям курса." : nextResult!.outcome}</span>
              {next.status === "started" && <span className="home-resume-progress">Пройдено шагов: {next.completedLevels} из {next.totalLevels}</span>}
              <a
                className="dashboard-primary-action"
                href={dashboardQuestHref(next.project.slug, format, next.output)}
                aria-label={next.project.slug === "install-codex" && next.status !== "started" ? primaryAction : `${primaryAction}: ${next.project.title}`}
                onClick={(event) => {
                  if (!shouldHandleSpaNavigation(event)) return;
                  event.preventDefault();
                  if (next.output) onOpen(next.project.slug, next.output);
                  else onOpen(next.project.slug);
                }}
              >
                {primaryAction} →
              </a>
              {isNew && next.project.slug === "install-codex" && <a className="home-secondary-action" href="#home-course-route">Codex уже готов — выбрать проект</a>}
            </div>
            <ProjectPreview project={nextResult!} />
          </>
        ) : (
          <div>
            <p>Основной маршрут пройден</p>
            <h2 id="dashboard-next-title">Пора показать свои работы</h2>
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

      {isNew && <div className="home-start-note"><p>Сервер и API заранее не покупайте. Проходите по одному проекту на неделе — всю библиотеку делать не нужно.</p><a href={format === "mobile" ? "?format=desktop" : "?format=mobile"}>{format === "mobile" ? "Я буду работать с компьютера" : "Я буду работать с телефона"}</a></div>}
      <CourseWeekBanner snapshot={snapshot} format={format} compact />
      <CourseProgress snapshot={snapshot} format={format} />
      <div id="home-course-route"><CourseRoute snapshot={snapshot} format={format} onOpen={onOpen} onChange={onRefresh} compact /></div>
      {format === "mobile" && <HomeScreenGuide />}
      <div id="home-learning-setup"><LearningSetup mobile={format === "mobile"} initiallyExpanded={false} onRefresh={onRefresh} /></div>
      <LearningReset mobile={format === "mobile"} onRefresh={onRefresh} />

      {!isNew && <section className="dashboard-stat-grid" aria-label="Ваш прогресс">
        <article><span>Текущая неделя</span><strong>{snapshot.currentWeek}</strong></article>
        <article><span>Пройдено шагов</span><strong>{snapshot.completedLevels}</strong></article>
        <article><span>Готово проектов</span><strong>{snapshot.completed.length}</strong></article>
        <article><span>Искры</span><strong>{sparks}</strong><small>{sparksLabel(sparks)} за пройденные шаги</small></article>
      </section>}

      {started.length > 0 ? (
        <section className="dashboard-row" aria-labelledby="dashboard-started-title">
          <header>
            <div><h2 id="dashboard-started-title">Другие начатые проекты</h2></div>
          </header>
          <div className="dashboard-card-grid">
            {started.map((item) => (
              <DashboardProjectCard key={item.project.slug} item={item} onOpen={onOpen} onSave={onSave} format={format} />
            ))}
          </div>
        </section>
      ) : null}

      <nav className="home-more-links" aria-label="Другие разделы обучения">
        <a href={`?format=${format}&section=weeks`}>Все 6 недель и библиотека проектов</a>
        <a href={`?format=${format}&section=projects`}>Мои начатые и сохранённые проекты</a>
      </nav>
    </main>
  );
}
