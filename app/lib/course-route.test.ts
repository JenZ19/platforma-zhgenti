import { beforeEach, expect, it } from "vitest";
import { projects } from "../content/projects";
import { buildDashboardSnapshot } from "./academy-dashboard";
import { selectCourseChoice } from "./course-route";
import { saveProgress, createEmptyProgress, completeStep } from "./progress";
import { exportLearningBackup, importLearningBackup, normalizePersonalBot } from "./learning-backup";
beforeEach(() => localStorage.clear());
function finish(slug: string, count: number) { let value = createEmptyProgress(); for (let i = 1; i <= count; i++) value = completeStep(value, i, count); saveProgress(slug, value, localStorage, () => new Date(), count); }
it("advances after one chosen service, not every optional project", () => {
  finish("planning:service", 17);
  const snapshot = buildDashboardSnapshot(projects, localStorage, "desktop");
  expect(snapshot.currentWeek).toBe(2);
  expect(snapshot.course?.[1].complete).toBe(false);
});
it("counts Mac installation stored under its actual platform key", () => {
  finish("install-codex:mac", 6);
  expect(buildDashboardSnapshot(projects, localStorage, "desktop").next?.project.slug).toBe("planning");
});
it("switching the selected route preserves completed work", () => {
  finish("planning:service", 17);
  selectCourseChoice(1, { slug: "recipes", label: "", output: "service" }, localStorage);
  expect(buildDashboardSnapshot(projects, localStorage, "desktop").currentWeek).toBe(1);
  expect(localStorage.getItem("feya-academy-progress-v1:planning:service")).not.toBeNull();
});
it("exports only learning records and never question notes or keys", () => {
  finish("planner", 17); localStorage.setItem("OPENAI_API_KEY", "secret"); localStorage.setItem("feya-dashboard-v1:notes:academy", "private");
  const backup = exportLearningBackup(localStorage);
  expect(backup).not.toContain("secret"); expect(backup).not.toContain("private");
  localStorage.clear(); expect(importLearningBackup(backup, localStorage)).toBe(1);
  expect(localStorage.getItem("feya-academy-progress-v1:planner")).not.toBeNull();
});
it("rejects unrelated backups and unsafe bot URLs", () => {
  expect(() => importLearningBackup('{"type":"wrong"}', localStorage)).toThrow();
  expect(normalizePersonalBot("https://evil.test/bot")).toBeUndefined();
  expect(normalizePersonalBot("https://t.me/good_bot?token=secret")).toBeUndefined();
  expect(normalizePersonalBot("@student_fairy_bot")).toBe("https://t.me/student_fairy_bot");
});
