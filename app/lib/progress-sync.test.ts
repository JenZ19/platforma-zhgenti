import { afterEach, expect, it, vi } from "vitest";
import { localEntries, syncLearningProgress } from "./progress-sync";

afterEach(() => { localStorage.clear(); vi.unstubAllGlobals(); });

const progress = (done: number) => JSON.stringify({ version: 1, activeStep: done + 1, completed: Array.from({ length: done }, (_, index) => index + 1), score: done * 10 });
const key = "feya-academy-progress-v1:planner";

function server(entries: Record<string, string>) {
  const pushed: Record<string, string>[] = [];
  const fetcher = vi.fn(async (_url: string, options?: { method?: string; body?: string }) => {
    if (options?.method === "POST") { pushed.push(JSON.parse(options.body!).entries); return { ok: true, json: async () => ({ entries: JSON.parse(options.body!).entries }) }; }
    return { ok: true, json: async () => ({ entries, updated: 1_800_000_000 }) };
  });
  vi.stubGlobal("fetch", fetcher);
  return pushed;
}

it("берёт из аккаунта то, чего нет в этом браузере", async () => {
  const pushed = server({ [key]: progress(6), "neiroprofi-course-route-v1": '{"1":{"slug":"planning"}}' });
  expect(await syncLearningProgress(window.localStorage)).toBe("merged");
  expect(JSON.parse(localStorage.getItem(key)!).completed).toHaveLength(6);
  expect(pushed[0][key]).toBeDefined();
});

it("не отнимает шаги, пройденные на этом устройстве", async () => {
  localStorage.setItem(key, progress(8));
  const pushed = server({ [key]: progress(3) });
  await syncLearningProgress(window.localStorage);
  expect(JSON.parse(localStorage.getItem(key)!).completed).toHaveLength(8);
  expect(JSON.parse(pushed[0][key]).completed).toHaveLength(8);
});

it("отправляет в аккаунт только учебные записи", async () => {
  localStorage.setItem(key, progress(2));
  localStorage.setItem("neiroprofi-personal-bot-v1", "https://t.me/my_fairy_bot");
  localStorage.setItem("random-key", "лишнее");
  const pushed = server({});
  await syncLearningProgress(window.localStorage);
  expect(Object.keys(pushed[0])).toEqual([key]);
  expect(Object.keys(localEntries(window.localStorage))).toEqual([key]);
});

it("молчит, когда вход не выполнен", async () => {
  localStorage.setItem(key, progress(2));
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) })));
  await expect(syncLearningProgress(window.localStorage)).rejects.toThrow();
  expect(JSON.parse(localStorage.getItem(key)!).completed).toHaveLength(2);
});
