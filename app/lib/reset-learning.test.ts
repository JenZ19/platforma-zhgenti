import { afterEach, expect, it, vi } from "vitest";
import { resetLearning, restoreLearning, resetBackupKey } from "./reset-learning";

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });
it("backs up and clears both tracks and project choices without touching access or notes", () => {
  const keys = ["feya-academy-progress-v1:planner", "feya-academy-progress-v1:mobile:planner", "feya-academy-preparation-v1:planner", "feya-quest:customization:planner", "feya-academy-output-v1:planning", "submarine:setup-platform:desktop:install-codex", "neiroprofi-course-route-v1", "neiroprofi-results-v1", "feya-dashboard-v1:saved", "feya-dashboard-v1:last:desktop"];
  keys.forEach(k => localStorage.setItem(k, "original"));
  ["auth", "neiroprofi-personal-bot-v1", "feya-dashboard-v1:notes:academy", "unrelated"].forEach(k => localStorage.setItem(k, "keep"));
  expect(resetLearning(localStorage)).toBe(keys.length);
  keys.forEach(k => expect(localStorage.getItem(k)).toBeNull());
  expect(localStorage.getItem("auth")).toBe("keep");
  expect(localStorage.getItem("feya-dashboard-v1:notes:academy")).toBe("keep");
  expect(localStorage.getItem("neiroprofi-personal-bot-v1")).toBe("keep");
  expect(localStorage.getItem("unrelated")).toBe("keep");
  expect(resetLearning(localStorage)).toBe(0);
  expect(restoreLearning(localStorage)).toBe(keys.length);
  keys.forEach(k => expect(localStorage.getItem(k)).toBe("original"));
});
it("does not delete anything when the recovery copy cannot be saved", () => {
  localStorage.setItem("feya-academy-progress-v1:planner", "original");
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); });
  expect(() => resetLearning(localStorage)).toThrow();
  expect(localStorage.getItem("feya-academy-progress-v1:planner")).toBe("original");
});
it("rejects a recovery copy containing unrelated keys", () => {
  localStorage.setItem(resetBackupKey, JSON.stringify({version: 1, entries: { auth: "overwrite" }}));
  expect(() => restoreLearning(localStorage)).toThrow();
  expect(localStorage.getItem("auth")).toBeNull();
});
