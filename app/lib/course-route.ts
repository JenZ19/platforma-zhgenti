import { courseWeeks, type CourseChoice, type CourseWeek } from "../content/course-route";
import type { DashboardProjectState } from "./academy-dashboard";
import type { StorageLike } from "./progress";
import { getCatalogProjectProgressState } from "./progress";
import type { QuestSurface } from "./output-format";

export type CourseMilestone = CourseWeek & { selected: CourseChoice; item?: DashboardProjectState; complete: boolean };
const key = "neiroprofi-course-route-v1";
export function selectCourseChoice(week: number, choice: CourseChoice, storage: StorageLike) {
  const allowed = courseWeeks.find((item) => item.week === week)?.choices.find((item) => item.slug === choice.slug && item.output === choice.output);
  if (!allowed) throw new Error("Неизвестный вариант маршрута");
  let previous: Record<string, CourseChoice> = {};
  try { previous = JSON.parse(storage.getItem(key) ?? "{}") ?? {}; } catch { /* retain a valid selection only */ }
  storage.setItem(key, JSON.stringify({ ...previous, [week]: allowed }));
}

export function buildCourseMilestones(items: DashboardProjectState[], storage: StorageLike, surface: QuestSurface): CourseMilestone[] {
  let selected: Record<string, CourseChoice> = {};
  try { selected = JSON.parse(storage.getItem(key) ?? "{}") ?? {}; } catch { /* default route */ }
  return courseWeeks.map((week) => {
    function state(option: CourseChoice) {
      const item = items.find((entry) => entry.project.slug === option.slug);
      if (!item) return undefined;
      const value = getCatalogProjectProgressState(item.project, storage, surface);
      const branch = option.output ? value.branches?.find((entry) => entry.format === option.output) : value;
      if (!branch) return item;
      const completedLevels = branch.progress.completed.length;
      return { ...item, completedLevels, totalLevels: branch.totalLevels, percent: Math.round(completedLevels / branch.totalLevels * 100), status: completedLevels === branch.totalLevels ? "completed" as const : completedLevels ? "started" as const : "new" as const, output: option.output };
    }
    const saved = selected[week.week];
    const option = week.choices.find((entry) => entry.slug === saved?.slug && entry.output === saved?.output)
      ?? week.choices.find((entry) => state(entry)?.status === "completed")
      ?? week.choices.find((entry) => state(entry)?.status === "started")
      ?? week.choices[0];
    const item = state(option);
    return { ...week, selected: option, item, complete: item?.status === "completed" };
  });
}
