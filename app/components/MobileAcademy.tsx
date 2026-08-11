"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  difficultyLabels,
  filterAndSortProjects,
  getCatalogDiscoveryProfile,
  goalKeywords,
  type DifficultyFilter,
  type GoalFilter,
} from "../content/discovery";
import { getMobileCapability } from "../content/mobile";
import { isProjectBundle, projects } from "../content/projects";
import { getAcademyStats, getCatalogProjectProgress } from "../lib/progress";
import { ProjectPreview } from "./ProjectPreview";

const weeks = ["Все", "1 неделя", "2 неделя", "3 неделя", "4 неделя", "5 неделя", "6 неделя"];

export function MobileAcademy({ onOpen }: { onOpen: (slug: string) => void }) {
  const [week, setWeek] = useState(0);
  const [difficulty, setDifficulty] = useState<DifficultyFilter>(0);
  const [goal, setGoal] = useState<GoalFilter>("Все цели");
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState({ startedProjects: 0, completedProjects: 0, completedSteps: 0, totalProjects: 45, totalSteps: 765, score: 0 });

  useEffect(() => {
    // Mobile progress has its own namespace and is restored after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStats(getAcademyStats(projects, window.localStorage, "mobile"));
  }, []);

  const visible = useMemo(() => {
    return filterAndSortProjects(projects, { week, difficulty, goal, query });
  }, [difficulty, goal, query, week]);

  const hasFilters = week !== 0 || difficulty !== 0 || goal !== "Все цели" || query.trim() !== "";

  function resetFilters() {
    setWeek(0);
    setDifficulty(0);
    setGoal("Все цели");
    setQuery("");
  }

  function open(event: MouseEvent<HTMLAnchorElement>, slug: string) {
    event.preventDefault();
    onOpen(slug);
  }

  return (
    <main className="mobile-academy-shell">
      <header className="mobile-topbar"><a className="brand" href="https://submarineedu.ru/feya/" target="_blank" rel="noreferrer"><span>S</span><b>SUBMARINE<small>Квесты с телефона</small></b></a><a href="?format=desktop">Версия для компьютера</a></header>
      <section className="mobile-academy-hero">
        <div className="mobile-orbit"><span>✦</span><i>Telegram</i><i>Codex</i><i>Lovable</i></div>
        <p className="kicker"><span /> Только телефон · без кода</p>
        <h1 aria-label="Академия с телефона">Академия<br /><em>с телефона</em></h1>
        <p>Фея ведёт по одному действию: открыли Telegram, запустили свой Codex, собрали проект в Lovable или Чатиуме и получили ссылку.</p>
        <div className="mobile-flow"><span>Telegram</span><b>→</b><span>свой Codex</span><b>→</b><span>проект</span></div>
        <div className="mobile-stats"><div><b>45</b><span>проектов</span></div><div><b>{stats.startedProjects}</b><span>начато</span></div><div><b>{stats.completedProjects}</b><span>готово</span></div></div>
      </section>
      <section className="mobile-catalogue" aria-label="Мобильный каталог проектов">
        <div className="mobile-catalogue-title"><div><p className="section-kicker">Выберите свою магию</p><h2>Все проекты</h2></div><label><span>⌕</span><input type="search" aria-label="Найти мобильный проект" placeholder="Найти проект…" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
        <div className="week-tabs" role="group" aria-label="Фильтр мобильных проектов">{weeks.map((label, index) => <button type="button" className={week === index ? "active" : ""} onClick={() => setWeek(index)} key={label}>{label}</button>)}</div>
        <div className="discovery-panel mobile-discovery-panel">
          <div className="difficulty-filter" role="group" aria-label="Выберите сложность с телефона">
            <span>Сложность</span>
            <button type="button" className={difficulty === 0 ? "active" : ""} onClick={() => setDifficulty(0)}>Любая</button>
            {([1, 2, 3, 4] as const).map((level) => <button type="button" key={level} className={difficulty === level ? "active" : ""} aria-label={`Сложность с телефона: ${difficultyLabels[level]}`} onClick={() => setDifficulty(level)}><b>{level}</b>{difficultyLabels[level]}</button>)}
          </div>
          <label className="goal-filter"><span>Что хочется сделать</span><select aria-label="Что хочется сделать с телефона" value={goal} onChange={(event) => setGoal(event.target.value as GoalFilter)}><option>Все цели</option>{goalKeywords.map((keyword) => <option key={keyword}>{keyword}</option>)}</select></label>
          <div className="discovery-summary"><p>Показано: {visible.length} из {projects.length}</p>{hasFilters && <button type="button" onClick={resetFilters} aria-label="Сбросить все мобильные фильтры">Сбросить фильтры ×</button>}</div>
        </div>
        <div className="mobile-project-grid">
          {visible.map((project) => {
            const discovery = getCatalogDiscoveryProfile(project);
            const capability = isProjectBundle(project)
              ? { id: "phone-full", label: "2 формата внутри", detail: "Сервис или ИИ-агент — выберете внутри" }
              : getMobileCapability(project);
            const completed = typeof window === "undefined" ? 0 : getCatalogProjectProgress(project, window.localStorage, "mobile").completed.length;
            const weekLabel = isProjectBundle(project) ? "Недели 1–2" : `Неделя ${project.week}`;
            return <article className="mobile-project-card" key={project.slug}><ProjectPreview project={project} /><header><span>{project.symbol}</span><small>{completed ? `${completed}/17` : weekLabel}</small></header><div className="project-discovery-line"><strong>Уровень: {discovery.label}</strong>{discovery.keywords.slice(0, 3).map((keyword) => <i key={keyword}>{keyword}</i>)}</div><div className={`mobile-capability ${capability.id}`}>{capability.label}</div><h3>{project.title}</h3><p>{project.outcome}</p><footer><span>{capability.detail}</span><a href={`?format=mobile&quest=${project.slug}`} onClick={(event) => open(event, project.slug)} aria-label={`Открыть мобильный квест: ${project.title}`}>Открыть мобильный квест →</a></footer></article>;
          })}
        </div>
      </section>
      <footer className="mobile-footer"><span>SUBMARINE</span><h2>Один телефон.<br />Сорок пять проектов.<br /><em>Новая профессия.</em></h2></footer>
    </main>
  );
}
