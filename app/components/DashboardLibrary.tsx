"use client";

import { useEffect, useMemo, useState } from "react";
import {
  difficultyLabels,
  filterAndSortProjects,
  goalKeywords,
  type DifficultyFilter,
  type GoalFilter,
} from "../content/discovery";
import { isProjectBundle } from "../content/projects";
import type { ProjectFormat } from "../content/types";
import type { DashboardProjectState, DashboardSnapshot } from "../lib/academy-dashboard";
import type { QuestSurface } from "../lib/output-format";
import { DashboardProjectCard } from "./DashboardProjectCard";

const weeks = [1, 2, 3, 4, 5, 6] as const;

export type DashboardLibraryProps = {
  snapshot: DashboardSnapshot;
  mode: "projects" | "weeks";
  initialQuery: string;
  format: QuestSurface;
  onOpen: (slug: string, output?: ProjectFormat) => void;
  onSave: (slug: string) => void;
  onQueryChange?: (query: string) => void;
};

function EmptySearch({ onReset }: { onReset: () => void }) {
  return (
    <section className="dashboard-empty" role="status">
      <span aria-hidden="true">⌕</span>
      <h2>Ничего не найдено</h2>
      <p>Сбросьте фильтры или попробуйте другое слово.</p>
      <button type="button" onClick={onReset}>Сбросить фильтры</button>
    </section>
  );
}

function projectBelongsToWeek(item: DashboardProjectState, week: number): boolean {
  return isProjectBundle(item.project)
    ? item.project.weeks.includes(week as 1 | 2)
    : item.project.week === week;
}

function ProjectGroups({ snapshot, format, onOpen, onSave }: Omit<DashboardLibraryProps, "initialQuery" | "mode" | "onQueryChange">) {
  const seen = new Set<string>();
  const groups = [
    {
      id: "started",
      title: "Начатые",
      emptyTitle: "Нет начатых проектов",
      emptyCopy: "Начните любой квест — он появится здесь вместе с фактическим прогрессом.",
      items: snapshot.started,
    },
    {
      id: "completed",
      title: "Готовые",
      emptyTitle: "Нет готовых проектов",
      emptyCopy: "Завершённые квесты автоматически перейдут сюда и в портфолио.",
      items: snapshot.completed,
    },
    {
      id: "saved",
      title: "На потом",
      emptyTitle: "Нет проектов на потом",
      emptyCopy: "Нажмите «На потом» на карточке нового проекта, чтобы сохранить его здесь.",
      items: snapshot.saved,
    },
  ].map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (seen.has(item.project.slug)) return false;
      seen.add(item.project.slug);
      return true;
    }),
  }));

  return (
    <main className="dashboard-section" data-dashboard-section="projects" data-dashboard-format={format} data-visual-theme="pink-cloud">
      <header><p>Мой учебный путь</p><h1>Мои проекты</h1></header>
      <div className="dashboard-project-groups">
        {groups.map((group) => (
          <section className="dashboard-row dashboard-project-group" key={group.id} aria-labelledby={`dashboard-${group.id}-title`}>
            <header><div><h2 id={`dashboard-${group.id}-title`}>{group.title}</h2></div><span>{group.items.length}</span></header>
            {group.items.length ? (
              <div className="dashboard-card-grid">
                {group.items.map((item) => (
                  <DashboardProjectCard
                    key={item.project.slug}
                    item={item}
                    format={format}
                    onOpen={onOpen}
                    onSave={onSave}
                  />
                ))}
              </div>
            ) : (
              <div className="dashboard-empty dashboard-empty-compact">
                <h3>{group.emptyTitle}</h3>
                <p>{group.emptyCopy}</p>
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}

function WeeklyLibrary({ snapshot, initialQuery, format, onOpen, onSave, onQueryChange = () => undefined }: Omit<DashboardLibraryProps, "mode">) {
  const [difficulty, setDifficulty] = useState<DifficultyFilter>(0);
  const [goal, setGoal] = useState<GoalFilter>("Все цели");
  const [openWeek, setOpenWeek] = useState<number | null>(snapshot.currentWeek);

  useEffect(() => {
    // A changed progress snapshot may advance the recommended current week.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenWeek(snapshot.currentWeek);
  }, [snapshot.currentWeek]);

  const filtered = useMemo(() => {
    const stateBySlug = new Map(snapshot.items.map((item) => [item.project.slug, item]));
    return filterAndSortProjects(snapshot.items.map((item) => item.project), {
      week: 0,
      difficulty,
      goal,
      query: initialQuery,
    }).map((project) => stateBySlug.get(project.slug)!);
  }, [difficulty, goal, initialQuery, snapshot.items]);

  const hasFilters = Boolean(initialQuery.trim()) || difficulty !== 0 || goal !== "Все цели";
  const belongsToFilteredWeek = (item: DashboardProjectState, week: number) => isProjectBundle(item.project)
    ? item.project.weeks[0] === week
    : item.project.week === week;
  const matchingWeeks = new Set(weeks.filter((week) => filtered.some((item) => belongsToFilteredWeek(item, week))));

  function resetFilters() {
    onQueryChange("");
    setDifficulty(0);
    setGoal("Все цели");
  }

  return (
    <main className="dashboard-section" data-dashboard-section="weeks" data-dashboard-format={format} data-visual-theme="pink-cloud">
      <header><p>Шесть недель практики</p><h1>Квесты по неделям</h1><span>Все проекты доступны сразу — неделя только подсказывает порядок.</span></header>
      <section className="dashboard-library-filters" aria-label="Фильтры квестов">
        <label>
          <span>Поиск</span>
          <input
            type="search"
            aria-label="Поиск по квестам недели"
            placeholder="Название, цель или результат"
            value={initialQuery}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
        <label>
          <span>Сложность</span>
          <select aria-label="Сложность" value={difficulty} onChange={(event) => setDifficulty(Number(event.target.value) as DifficultyFilter)}>
            <option value={0}>Любая сложность</option>
            {([1, 2, 3, 4] as const).map((value) => <option key={value} value={value}>{difficultyLabels[value]}</option>)}
          </select>
        </label>
        <label>
          <span>Цель</span>
          <select aria-label="Цель проекта" value={goal} onChange={(event) => setGoal(event.target.value as GoalFilter)}>
            <option value="Все цели">Все цели</option>
            {goalKeywords.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </section>
      {hasFilters && filtered.length > 0 ? <button type="button" className="dashboard-filter-reset" onClick={resetFilters}>Сбросить фильтры</button> : null}
      <div className="dashboard-week-list">
        {weeks.map((week) => {
          const expanded = filtered.length === 0 ? openWeek === week : hasFilters ? matchingWeeks.has(week) : openWeek === week;
          const items = filtered.filter((item) => hasFilters ? belongsToFilteredWeek(item, week) : projectBelongsToWeek(item, week));
          return (
            <section className="dashboard-week" key={week}>
              <h2>
                <button
                  type="button"
                  aria-label={`Неделя ${week}`}
                  aria-expanded={expanded}
                  aria-controls={`dashboard-week-${week}`}
                  onClick={() => setOpenWeek(expanded ? null : week)}
                >
                  <span>Неделя {week}</span><small>{items.length} проектов</small><b aria-hidden="true">⌄</b>
                </button>
              </h2>
              {expanded ? (
                <div id={`dashboard-week-${week}`} className="dashboard-week-panel">
                  {items.length ? (
                    <div className="dashboard-card-grid">
                      {items.map((item) => (
                        <DashboardProjectCard
                          key={item.project.slug}
                          item={item}
                          format={format}
                          onOpen={onOpen}
                          onSave={onSave}
                          showDiscoveryDetails
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
      {filtered.length === 0 ? <EmptySearch onReset={resetFilters} /> : null}
    </main>
  );
}

export function DashboardLibrary(props: DashboardLibraryProps) {
  return props.mode === "projects"
    ? <ProjectGroups snapshot={props.snapshot} format={props.format} onOpen={props.onOpen} onSave={props.onSave} />
    : <WeeklyLibrary snapshot={props.snapshot} initialQuery={props.initialQuery} format={props.format} onOpen={props.onOpen} onSave={props.onSave} onQueryChange={props.onQueryChange} />;
}
