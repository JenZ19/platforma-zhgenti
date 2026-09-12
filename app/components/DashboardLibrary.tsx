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
import type { DashboardSnapshot } from "../lib/academy-dashboard";
import type { QuestSurface } from "../lib/output-format";
import { DashboardIcon } from "./DashboardIcon";
import { DashboardProjectCard } from "./DashboardProjectCard";
import { RewardShelf } from "./RewardShelf";

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
    <main className="dashboard-section" data-dashboard-section="projects" data-dashboard-format={format} data-visual-theme="elina-burgundy">
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
      <RewardShelf snapshot={snapshot} />
    </main>
  );
}

function WeeklyLibrary({ snapshot, initialQuery, format, onOpen, onSave, onQueryChange = () => undefined }: Omit<DashboardLibraryProps, "mode">) {
  const [difficulty, setDifficulty] = useState<DifficultyFilter>(0);
  const [goal, setGoal] = useState<GoalFilter>("Все цели");
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(() => new Set([snapshot.currentWeek]));

  const filters = useMemo(() => ({
    week: 0,
    difficulty,
    goal,
    query: initialQuery,
  } as const), [difficulty, goal, initialQuery]);

  const filtered = useMemo(() => {
    const variants = snapshot.items.flatMap((item) => item.variants ?? [item]);
    const stateBySlug = new Map(variants.map((item) => [item.project.slug, item]));
    return filterAndSortProjects(variants.map((item) => item.project), filters)
      .map((project) => stateBySlug.get(project.slug)!);
  }, [filters, snapshot.items]);

  const hasFilters = Boolean(initialQuery.trim()) || difficulty !== 0 || goal !== "Все цели";
  const filteredWeekBySlug = useMemo(() => new Map(filtered.map((item) => [
    item.project.slug, isProjectBundle(item.project) ? item.project.weeks[0] : item.project.week,
  ])), [filtered]);
  const matchingWeeks = new Set(filteredWeekBySlug.values());
  const autoOpenKey = hasFilters && filtered.length > 0 ? [...matchingWeeks].sort().join(",") : String(snapshot.currentWeek);

  useEffect(() => {
    // A new result set opens its matching weeks once; subsequent clicks remain under learner control.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenWeeks(new Set(autoOpenKey.split(",").map(Number)));
  }, [autoOpenKey]);

  function resetFilters() {
    onQueryChange("");
    setDifficulty(0);
    setGoal("Все цели");
  }

  return (
    <main className="dashboard-section" data-dashboard-section="weeks" data-dashboard-format={format} data-visual-theme="elina-burgundy">
      <header><p>Дополнительная практика</p><h2>Библиотека вариантов</h2><span>На первой неделе — сервисы, на второй — личные ИИ-агенты, дальше — проекты для работы и портфолио. Выбирайте один основной результат на неделю; остальные варианты — по желанию.</span></header>
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
          const expanded = openWeeks.has(week);
          const items = filtered.filter((item) => filteredWeekBySlug.get(item.project.slug) === week);
          return (
            <section className="dashboard-week" key={week}>
              <h2>
                <button
                  type="button"
                  aria-label={`Неделя ${week}`}
                  aria-expanded={expanded}
                  aria-controls={`dashboard-week-${week}`}
                  onClick={() => setOpenWeeks(expanded ? new Set() : new Set([week]))}
                >
                  <span>Неделя {week}</span><small>Вариантов: {items.length}</small><b aria-hidden="true"><DashboardIcon name="chevron" /></b>
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
