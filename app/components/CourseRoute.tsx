"use client";

import type { DashboardSnapshot } from "../lib/academy-dashboard";
import { selectCourseChoice } from "../lib/course-route";
import type { ProjectFormat } from "../content/types";
import { dashboardQuestHref } from "./DashboardProjectCard";

export function CourseRoute({ snapshot, format, onOpen, onChange, compact = false }: {
  snapshot: DashboardSnapshot; format: "desktop" | "mobile";
  onOpen: (slug: string, output?: ProjectFormat) => void; onChange: () => void; compact?: boolean;
}) {
  const milestones = compact ? snapshot.course?.filter((week) => week.week === snapshot.currentWeek) : snapshot.course;
  return <section className="course-route" aria-label="Основной маршрут курса">
    <header><p className="academy-kicker">Основной маршрут · 6 недель</p><h2>{compact ? "Ваш результат этой недели" : "Один результат за раз"}</h2><p>Выберите по одному варианту на неделе. Остальная библиотека — по желанию. Смена варианта не удаляет прежние работы.</p></header>
    {milestones?.map((week) => <article className="course-milestone" key={week.week}>
      <p className="academy-kicker">Неделя {week.week} · {week.complete ? "Пройдена ✓" : "Один проект на выбор"}</p>
      <h3>{week.title}</h3><p>{week.why}</p>
      <label>Что будем делать
        <select value={`${week.selected.slug}:${week.selected.output ?? ""}`} onChange={(event) => {
          const option = week.choices.find((entry) => `${entry.slug}:${entry.output ?? ""}` === event.target.value);
          if (option) { selectCourseChoice(week.week, option, window.localStorage); onChange(); }
        }}>
          {week.choices.map((option) => <option key={`${option.slug}:${option.output}`} value={`${option.slug}:${option.output ?? ""}`}>{option.label}</option>)}
        </select>
      </label>
      <p><strong>В результате:</strong> {week.result}</p>
      {week.item ? <p>В выбранном квесте пройдено {week.item.completedLevels} из {week.item.totalLevels} шагов.</p> : null}
      <a className="dashboard-primary-action" href={dashboardQuestHref(week.selected.slug, format, week.selected.output)} onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault(); onOpen(week.selected.slug, week.selected.output);
      }}>{week.complete ? "Вернуться к проекту" : "Открыть выбранный проект"} →</a>
    </article>)}
  </section>;
}
