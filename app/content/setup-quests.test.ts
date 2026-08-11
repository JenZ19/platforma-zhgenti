import { describe, expect, it } from "vitest";
import { getQuestProject, questProjects } from "./projects";
import { buildQuest } from "./quests";
import { API_KEYS_QUEST_HREF, needsApiKeysQuestLink } from "./setup-quests";

const setupSlugs = ["install-codex", "server-152fz", "api-keys"] as const;

function allText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(allText).join(" ");
  if (value && typeof value === "object") return Object.values(value).map(allText).join(" ");
  return "";
}

describe("computer setup quests", () => {
  it("registers three computer-only preparation quests", () => {
    for (const slug of setupSlugs) {
      const project = getQuestProject(slug);
      expect(project, slug).toBeDefined();
      expect(project?.journey, slug).toBe("setup");
      expect(project?.device, slug).toBe("компьютер");
      expect(project?.track, slug).toBe("Старт на компьютере");
    }
  });

  it("builds 17 click-by-click levels without the real-or-demo detour", () => {
    for (const slug of setupSlugs) {
      const project = getQuestProject(slug)!;
      const demo = buildQuest(project, "demo");
      const real = buildQuest(project, "real");
      expect(demo, slug).toHaveLength(17);
      expect(real, slug).toEqual(demo);
      expect(demo.map((step) => step.id)).toEqual(Array.from({ length: 17 }, (_, index) => index + 1));
      for (const step of demo) {
        expect(step.guide, `${slug}/${step.id}`).toHaveLength(3);
        expect(step.why.length, `${slug}/${step.id}`).toBeGreaterThan(45);
        expect(step.action.length, `${slug}/${step.id}`).toBeGreaterThan(45);
        expect(step.expected, `${slug}/${step.id}`).toHaveLength(3);
      }
      expect(allText(demo), slug).not.toMatch(/РЕЖИМ РЕАЛЬНЫХ ДАННЫХ|вымышленные данные/i);
    }
  });

  it("teaches the current desktop Codex installation path for Mac and Windows", () => {
    const text = allText(buildQuest(getQuestProject("install-codex")!));
    expect(text).toContain("https://chatgpt.com/download/");
    expect(text).toMatch(/macOS 14.+M1|Apple Silicon|Intel/is);
    expect(text).toMatch(/Windows/i);
    expect(text).toMatch(/верхн.+лев.+Codex/is);
    expect(text).toMatch(/Новая задача/is);
    expect(text).toMatch(/тестов.+папк|учебн.+папк/is);
    expect(text).toMatch(/не видит.+Codex|Codex.+не вид/i);
  });

  it("does not misrepresent a Russian server as complete 152-FZ compliance", () => {
    const text = allText(buildQuest(getQuestProject("server-152fz")!));
    expect(text).toMatch(/покупк.+сервер.+не.+означа.+152.?ФЗ/is);
    expect(text).toMatch(/оператор.+персональн.+данн/is);
    expect(text).toMatch(/стать.+18/is);
    expect(text).toMatch(/стать.+19/is);
    expect(text).toMatch(/уведомлен.+Роскомнадзор/is);
    expect(text).toMatch(/поручени.+обработк/is);
    expect(text).toMatch(/резервн.+копи/is);
    expect(text).toMatch(/SSH|фаервол|firewall/is);
    expect(text).toMatch(/трансгранич|иностранн.+API/is);
    expect(text).toContain("https://docs.selectel.ru/cloud-servers/about/152-fz-cloud-server/");
    expect(text).toContain(API_KEYS_QUEST_HREF);
  });

  it("explains API and gives four provider-specific safe routes", () => {
    const text = allText(buildQuest(getQuestProject("api-keys")!));
    expect(text).toMatch(/API.+программ.+обща|служебн.+двер/is);
    expect(text).toMatch(/ключ.+секрет|секрет.+ключ/is);
    expect(text).toMatch(/Polza\.ai.+агрегатор/is);
    expect(text).toMatch(/OpenRouter.+агрегатор/is);
    expect(text).toMatch(/Qwen.+семейств.+модел|Alibaba Cloud Model Studio/is);
    expect(text).toMatch(/OpenAI.+прям.+провайдер/is);
    expect(text).toContain("https://polza.ai/docs/api-reference/introduction");
    expect(text).toContain("https://openrouter.ai/settings/keys");
    expect(text).toContain("https://www.alibabacloud.com/help/en/model-studio/get-api-key");
    expect(text).toContain("https://platform.openai.com/api-keys");
    expect(text).toMatch(/\.env|переменн.+окружен/is);
    expect(text).toMatch(/не вставля.+чат|не отправля.+чат/is);
    expect(text).toMatch(/браузерн.+код|клиентск.+част/is);
  });

  it("routes every other level that needs an API key to the API lesson", () => {
    for (const project of questProjects.filter((item) => item.slug !== "api-keys")) {
      for (const step of buildQuest(project)) {
        if (!needsApiKeysQuestLink(step)) continue;
        expect(step.links, `${project.slug}/${step.id}`).toContainEqual(expect.objectContaining({ href: API_KEYS_QUEST_HREF }));
      }
    }
  });
});
