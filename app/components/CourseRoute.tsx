"use client";

import { useId, useRef, useState } from "react";
import type { CourseChoice } from "../content/course-route";
import type { DashboardSnapshot } from "../lib/academy-dashboard";
import { selectCourseChoice } from "../lib/course-route";
import type { ProjectFormat } from "../content/types";
import { dashboardQuestHref, shouldHandleSpaNavigation } from "./DashboardProjectCard";
import { LearningSetup } from "./LearningSetup";
import { PersonalFairy } from "./PersonalFairy";

function ProjectChoice({ week, selected, choices, onSelect }: {
  week: number; selected: CourseChoice; choices: CourseChoice[]; onSelect: (choice: CourseChoice) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  return <div className="course-choice">
    <span id={`${id}-label`}>Что будем делать</span>
    <button ref={trigger} type="button" className="course-choice-trigger" aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} aria-controls={`${id}-options`} onClick={() => setOpen(!open)}>
      <span id={`${id}-value`}>{selected.label}</span><span aria-hidden="true">{open ? "▴" : "▾"}</span>
    </button>
    {open && <fieldset id={`${id}-options`} className="course-choice-options">
      <legend>Проект недели {week}</legend>
      {choices.map((option) => <label key={`${option.slug}:${option.output}`}>
        <input type="radio" name={id} checked={option.slug === selected.slug && option.output === selected.output} onChange={() => { onSelect(option); close(); }} onKeyDown={(event) => {
          if (event.key === "Escape") { event.preventDefault(); close(); }
        }} />
        <span>{option.label}</span>
      </label>)}
    </fieldset>}
  </div>;
}

export function CourseRoute({ snapshot, format, onOpen, onChange, compact = false }: {
  snapshot: DashboardSnapshot; format: "desktop" | "mobile";
  onOpen: (slug: string, output?: ProjectFormat) => void; onChange: () => void; compact?: boolean;
}) {
  const milestones = compact ? snapshot.course?.filter((week) => week.week === snapshot.currentWeek) : snapshot.course;
  return <section className="course-route" aria-label="Основной маршрут курса">
    <header><p className="academy-kicker">Основной маршрут · 6 недель</p><h2>{compact ? "Ваш результат этой недели" : "Один результат за раз"}</h2><p>Выберите по одному варианту на неделе. Остальная библиотека — по желанию. Смена варианта не удаляет прежние работы.</p></header>
    {!compact && <article className="course-milestone">
      <h3>Перед первым проектом</h3>
      {format === "desktop" ? <><p>Нужен установленный Codex, в котором уже прошла тестовая задача. Если он готов, сразу выбирайте проект недели.</p><a href="?quest=install-codex">Установить и проверить Codex →</a></> : <><p>Отправляйте команды из урока своей Феечке в Telegram, а результат открывайте на телефоне. Сохраните адрес личного бота один раз.</p><PersonalFairy /><LearningSetup mobile initiallyExpanded={false} onRefresh={onChange} /></>}
      <p>Сервер и API-ключи нужны не для каждого проекта. Возвращайтесь к этим урокам, когда в выбранном квесте потребуется подключение. Заранее ничего покупать не нужно.</p>
    </article>}
    {milestones?.map((week) => <article className="course-milestone" key={week.week}>
      <p className="academy-kicker">Неделя {week.week} · {week.complete ? "Пройдена ✓" : "Один проект на выбор"}</p>
      <h3>{week.title}</h3><p>{week.why}</p>
      <ProjectChoice week={week.week} selected={week.selected} choices={week.choices} onSelect={(option) => {
        selectCourseChoice(week.week, option, window.localStorage); onChange();
      }} />
      <p><strong>В результате:</strong> {week.result}</p>
      {week.item ? <p>В выбранном квесте пройдено {week.item.completedLevels} из {week.item.totalLevels} шагов.</p> : null}
      <a className="dashboard-primary-action" href={dashboardQuestHref(week.selected.slug, format, week.selected.output)} onClick={(event) => {
        if (!shouldHandleSpaNavigation(event)) return;
        event.preventDefault(); onOpen(week.selected.slug, week.selected.output);
      }}>{week.complete ? "Вернуться к проекту" : "Открыть выбранный проект"} →</a>
    </article>)}
  </section>;
}
