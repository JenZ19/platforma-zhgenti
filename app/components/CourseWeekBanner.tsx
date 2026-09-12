"use client";

import { useState } from "react";
import { courseWeeks } from "../content/course-route";
import type { DashboardSnapshot } from "../lib/academy-dashboard";
import { useCourseAccount } from "../lib/course-account";

function portfolioHref(format: "desktop" | "mobile"): string {
  return format === "mobile" ? "?format=mobile&section=portfolio" : "?section=portfolio";
}

function daysLabel(days: number): string {
  const last = days % 10;
  const teen = days % 100 >= 11 && days % 100 <= 14;
  if (!teen && last === 1) return `${days} день`;
  if (!teen && last >= 2 && last <= 4) return `${days} дня`;
  return `${days} дней`;
}

/** Календарь маршрута: какая неделя идёт и не отстаёт ли она от закрытых результатов. */
export function CourseWeekBanner({ snapshot, format, compact = false }: {
  snapshot: DashboardSnapshot; format: "desktop" | "mobile"; compact?: boolean;
}) {
  const { account, loading, available, startCourse, forgetCourse } = useCourseAccount();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (loading || !available) return null;

  const { course, weeks } = account;
  const closed = new Set((snapshot.course ?? []).filter((week) => week.complete).map((week) => week.week));

  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await action(); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Не удалось сохранить. Попробуйте ещё раз."); }
    finally { setBusy(false); }
  }

  if (!course.started) {
    return <section className="course-calendar course-calendar-start" aria-labelledby="course-calendar-title">
      <p className="academy-kicker">Ваш темп</p>
      <h2 id="course-calendar-title">Когда начинаем шесть недель?</h2>
      <p>Отметьте день старта — платформа будет показывать, какая неделя идёт, и подскажет, если прошлая осталась незакрытой. Ничего не блокируется: уроки открыты все сразу, а календарь можно сдвинуть или убрать.</p>
      <div className="learning-actions">
        <button type="button" className="dashboard-primary-action" disabled={busy} onClick={() => run(() => startCourse())}>
          {busy ? "Сохраняем…" : "Начинаю сегодня"}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </section>;
  }

  const week = course.week ?? 1;
  const title = courseWeeks[week - 1]?.title ?? "";
  const behind = !course.finished && [...Array(week - 1).keys()].map((index) => index + 1).filter((number) => !closed.has(number));

  return <section className="course-calendar" aria-labelledby="course-calendar-title">
    <p className="academy-kicker">Ваш темп</p>
    {course.finished ? <>
      <h2 id="course-calendar-title">Шесть недель маршрута пройдены</h2>
      <p>Остался выпускной шаг: соберите 3–5 лучших работ, опубликуйте портфолио и получите сертификат.</p>
      <a className="dashboard-primary-action" href={portfolioHref(format)}>Открыть портфолио →</a>
    </> : <>
      <h2 id="course-calendar-title">Идёт неделя {week} из {weeks} — «{title}»</h2>
      <p>
        До конца недели {daysLabel(course.daysLeft ?? 0)}.{" "}
        {closed.has(week)
          ? "Результат этой недели уже закрыт. Можно выдохнуть или взять проект из библиотеки — по желанию."
          : "Достаточно одного проекта, доведённого до рабочего состояния."}
      </p>
      {behind && behind.length > 0 && <p className="course-calendar-behind">
        {behind.length === 1 ? `Неделя ${behind[0]} ещё не закрыта.` : `Не закрыты недели: ${behind.join(", ")}.`}{" "}
        Спокойно доделайте её — маршрут никуда не денется, а календарь можно сдвинуть на сегодня.
      </p>}
    </>}
    {!compact && <details className="course-calendar-settings">
      <summary>Настроить календарь</summary>
      <p>Календарь личный: он ничего не закрывает и виден только вам. Даты хранятся в вашем аккаунте, поэтому переносятся на другое устройство вместе со входом.</p>
      <div className="learning-actions">
        <button type="button" disabled={busy} onClick={() => {
          if (!window.confirm("Сдвинуть календарь так, будто маршрут начался сегодня? Пройденные шаги и работы сохранятся.")) return;
          run(() => startCourse(true));
        }}>Начать отсчёт заново с сегодня</button>
        <button type="button" disabled={busy} onClick={() => {
          if (!window.confirm("Убрать календарь недель? Платформа перестанет показывать, какая неделя идёт. Прогресс и работы сохранятся.")) return;
          run(() => forgetCourse());
        }}>Убрать календарь</button>
      </div>
      {error && <p role="alert">{error}</p>}
    </details>}
  </section>;
}
