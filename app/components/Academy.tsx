"use client";

import { useEffect, useMemo, useState } from "react";
import { projects } from "../content/projects";
import { getAcademyStats } from "../lib/progress";
import { ProjectCard } from "./ProjectCard";

const weekLabels = ["Все проекты", "Неделя 1", "Неделя 2", "Неделя 3", "Неделя 4", "Неделя 5", "Неделя 6"];

export function Academy({ onOpen }: { onOpen?: (slug: string) => void }) {
  const [week, setWeek] = useState(0);
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState({ totalProjects: 52, startedProjects: 0, completedProjects: 0, completedSteps: 0, totalSteps: 884, score: 0 });

  useEffect(() => {
    // Overall progress is device-local and can only be read after the page mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStats(getAcademyStats(projects, window.localStorage));
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ru");
    return projects.filter((project) => {
      const inWeek = week === 0 || project.week === week;
      const inSearch = !needle || `${project.title} ${project.outcome} ${project.track}`.toLocaleLowerCase("ru").includes(needle);
      return inWeek && inSearch;
    });
  }, [query, week]);

  return (
    <main className="academy-shell">
      <header className="site-header">
        <a className="brand" href="https://submarineedu.ru/feya/" target="_blank" rel="noreferrer"><span>S</span><b>SUBMARINE<small>Академия квестов</small></b></a>
        <div className="header-score"><i>✦</i> {stats.score} искр</div>
      </header>

      <section className="academy-hero">
        <p className="kicker"><span /> Весь курс в формате игры</p>
        <h1>Выбери проект.<br /><em>Сделай его шаг за шагом.</em></h1>
        <p className="hero-lead">Никакого пустого листа. В каждом квесте уже есть готовые команды для Codex, понятные проверки и экран того, что должно получиться.</p>
        <div className="academy-stats" aria-label="Общий прогресс">
          <div><strong>52</strong><span>проекта</span></div>
          <div><strong>{stats.startedProjects}</strong><span>начато</span></div>
          <div><strong>{stats.completedProjects}</strong><span>готово</span></div>
          <div><strong>{stats.completedSteps}</strong><span>уровней пройдено</span></div>
        </div>
      </section>

      <section className="catalogue" aria-label="Каталог проектов">
        <div className="catalogue-head">
          <div><p className="section-kicker">Твоя мастерская</p><h2>52 проекта</h2></div>
          <label className="search-field"><span>⌕</span><input type="search" aria-label="Найти проект" placeholder="Найти проект…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        </div>
        <div className="week-tabs" role="group" aria-label="Фильтр по неделям">
          {weekLabels.map((label, index) => <button type="button" key={label} className={week === index ? "active" : ""} aria-label={label} onClick={() => setWeek(index)}>{label}</button>)}
        </div>
        {visible.length ? <div className="project-grid">{visible.map((project) => <ProjectCard key={project.slug} project={project} onOpen={onOpen} />)}</div> : <div className="empty-catalogue"><span>✦</span><h3>Ничего не найдено</h3><p>Попробуйте другое слово или откройте все проекты.</p></div>}
      </section>

      <section className="academy-principle"><p>Посмотрела пример</p><span>→</span><p>Повторила шаги</p><span>→</span><p>Получила результат</p></section>
      <footer className="academy-footer"><span>SUBMARINE</span><p>Здесь ты не просто учишься.<br />Здесь появляется твоё портфолио.</p></footer>
    </main>
  );
}
