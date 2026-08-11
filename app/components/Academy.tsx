"use client";

/* eslint-disable @next/next/no-img-element -- these are local, generated project previews */
import { useEffect, useMemo, useState } from "react";
import {
  difficultyLabels,
  filterAndSortProjects,
  goalKeywords,
  type DifficultyFilter,
  type GoalFilter,
} from "../content/discovery";
import { projects } from "../content/projects";
import { getAcademyStats, getProjectLevelCount } from "../lib/progress";
import { ProjectCard } from "./ProjectCard";

const weekLabels = ["Все проекты", "Неделя 1", "Неделя 2", "Неделя 3", "Неделя 4", "Неделя 5", "Неделя 6"];

export function Academy({ onOpen }: { onOpen?: (slug: string) => void }) {
  const [week, setWeek] = useState(0);
  const [difficulty, setDifficulty] = useState<DifficultyFilter>(0);
  const [goal, setGoal] = useState<GoalFilter>("Все цели");
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState({ totalProjects: projects.length, startedProjects: 0, completedProjects: 0, completedSteps: 0, totalSteps: projects.reduce((total, project) => total + getProjectLevelCount(project), 0), score: 0 });

  useEffect(() => {
    // Overall progress is device-local and can only be read after the page mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStats(getAcademyStats(projects, window.localStorage));
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

  return (
    <main className="academy-shell" data-visual-theme="tactile-album">
      <header className="site-header">
        <a className="brand" href="https://submarineedu.ru/feya/" target="_blank" rel="noreferrer"><span>S</span><b>SUBMARINE<small>Академия квестов</small></b></a>
        <div className="header-actions">
          <a className="phone-version-link" href="?format=mobile"><span>◒</span> Версия только с телефона</a>
          <div className="header-score"><i>✦</i> {stats.score} искр</div>
        </div>
      </header>

      <section className="academy-hero">
        <div className="academy-hero-copy">
          <p className="kicker">Весь курс в формате игры</p>
          <h1>Выбери проект.<br /><em>Собери свою версию.</em></h1>
          <p className="hero-lead">Никакого пустого листа. В каждом квесте уже есть готовые команды для Codex, понятные проверки и экран того, что должно получиться.</p>
        </div>
        <section className="academy-album" role="group" aria-label="Живой альбом готовых проектов">
          <header><span>Моя будущая коллекция</span><b>Три результата из {projects.length}</b></header>
          <div className="album-leaves">
            <figure>
              <span className="album-tape" aria-hidden="true" />
              <img src="/screens/planner/step-14.png" width="960" height="640" alt="Готовый проект: планер на день и неделю" />
              <figcaption><b>Спокойный планер</b><span>сервис или ИИ-агент</span></figcaption>
            </figure>
            <figure>
              <span className="album-tape" aria-hidden="true" />
              <img src="/screens/family-expenses/step-14.png" width="960" height="640" alt="Готовый проект: учёт расходов семьи" />
              <figcaption><b>Семейный бюджет</b><span>настоящие итоги и категории</span></figcaption>
            </figure>
            <figure>
              <span className="album-tape" aria-hidden="true" />
              <img src="/screens/webinar-moderator-agent/step-14.png" width="960" height="640" alt="Готовый проект: ИИ-агент модератор вебинаров" />
              <figcaption><b>Модератор вебинара</b><span>ИИ-агент для клиента</span></figcaption>
            </figure>
          </div>
          <p>Листай, выбирай и собирай свою версию</p>
        </section>
        <div className="academy-stats" aria-label="Общий прогресс">
          <div><strong>{projects.length}</strong><span>проекта</span></div>
          <div><strong>{stats.startedProjects}</strong><span>начато</span></div>
          <div><strong>{stats.completedProjects}</strong><span>готово</span></div>
          <div><strong>{stats.completedSteps}</strong><span>уровней пройдено</span></div>
        </div>
      </section>

      <section className="catalogue" aria-label="Каталог проектов">
        <div className="catalogue-head">
          <div><p className="section-kicker">Твоя мастерская</p><h2>{projects.length} проекта</h2></div>
          <label className="search-field"><span>⌕</span><input type="search" aria-label="Найти проект" placeholder="Найти проект…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        </div>
        <div className="week-tabs" role="group" aria-label="Фильтр по неделям">
          {weekLabels.map((label, index) => <button type="button" key={label} className={week === index ? "active" : ""} aria-label={label} onClick={() => setWeek(index)}>{label}</button>)}
        </div>
        <div className="discovery-panel">
          <div className="difficulty-filter" role="group" aria-label="Выберите сложность">
            <span>Сложность</span>
            <button type="button" className={difficulty === 0 ? "active" : ""} aria-label="Сложность: любая" onClick={() => setDifficulty(0)}>Любая</button>
            {([1, 2, 3, 4] as const).map((level) => <button type="button" key={level} className={difficulty === level ? "active" : ""} aria-label={`Сложность: ${difficultyLabels[level]}`} onClick={() => setDifficulty(level)}><b>{level}</b>{difficultyLabels[level]}</button>)}
          </div>
          <label className="goal-filter"><span>Что хочется сделать</span><select aria-label="Что хочется сделать" value={goal} onChange={(event) => setGoal(event.target.value as GoalFilter)}><option>Все цели</option>{goalKeywords.map((keyword) => <option key={keyword}>{keyword}</option>)}</select></label>
          <div className="discovery-summary"><p>Показано: {visible.length} из {projects.length}</p>{hasFilters && <button type="button" onClick={resetFilters} aria-label="Сбросить все фильтры">Сбросить фильтры ×</button>}</div>
        </div>
        {visible.length ? <div className="project-grid">{visible.map((project) => <ProjectCard key={project.slug} project={project} onOpen={onOpen} />)}</div> : <div className="empty-catalogue"><span>✦</span><h3>Ничего не найдено</h3><p>Попробуйте другое слово или откройте все проекты.</p></div>}
      </section>

      <section className="academy-principle"><p>Посмотрела пример</p><span>→</span><p>Повторила шаги</p><span>→</span><p>Получила результат</p></section>
      <footer className="academy-footer"><span>SUBMARINE</span><p>Здесь ты не просто учишься.<br />Здесь появляется твоё портфолио.</p></footer>
    </main>
  );
}
