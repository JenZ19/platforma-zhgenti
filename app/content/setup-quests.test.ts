import { describe, expect, it } from "vitest";
import { getQuestProject } from "./projects";
import { buildQuest } from "./quests";

const setup = (slug: string) => buildQuest(getQuestProject(slug)!);
const copy = (slug: string) => JSON.stringify(setup(slug));

describe("computer setup quests", () => {
  it.each(["install-codex", "server-152fz", "api-keys"])("builds a sequential, testable %s route", (slug) => {
    const steps = setup(slug);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.map((step) => step.id)).toEqual(steps.map((_, index) => index + 1));
    expect(steps.every((step) => step.expected.length >= 2)).toBe(true);
  });

  it("installs Codex from the official source and protects the selected workspace", () => {
    expect(copy("install-codex")).toMatch(/официальн.+OpenAI|OpenAI.+официальн/i);
    expect(copy("install-codex")).toMatch(/папк.+codex-test|codex-test.+папк/i);
    expect(copy("install-codex")).toMatch(/не проси.+парол|пароль.+не/i);
  });

  it("checks whether a server is needed before purchase", () => {
    const text = copy("server-152fz");
    expect(text).toMatch(/нужен ли отдельный сервер|Сейчас не покупаем/i);
    expect(text).toMatch(/покупка сервера.+не подтверждает.+152.?ФЗ/i);
    expect(text).toMatch(/Россия/i);
    expect(text).toContain("https://adminvps.ru/");
    expect(text).toContain("SUBMARINE123");
    expect(text).toMatch(/один сервер|одному серверу/i);
    expect(text).toMatch(/один раз|активируется один раз/i);
    expect(text).toContain("/materials/adminvps-vps-instruction.pdf");
  });

  it("keeps the operational and legal 152-FZ checks after server purchase", () => {
    const text = copy("server-152fz");
    expect(text).toMatch(/оператор.+персональн.+данн/i);
    expect(text).toMatch(/Роскомнадзор|уведомлен/i);
    expect(text).toMatch(/резервн.+коп/i);
    expect(text).toMatch(/SSH/i);
    expect(text).toMatch(/не выводи соответствие закону|не означает полное соответствие|не подтверждает соответствие/i);
  });

  it("keeps API keys out of chat, browser code and repositories", () => {
    const text = copy("api-keys");
    expect(text).toMatch(/API.+ключ|ключ.+API/i);
    expect(text).toMatch(/не вставляйте.+чат|не проси.+ключ|ключ.+защищённ/i);
    expect(text).toMatch(/HTML|клиентск.+JavaScript|репозитор|\.env/i);
    expect(text).toMatch(/лимит|расход/i);
    expect(text).toContain("https://platform.openai.com/api-keys");
  });

  it("does not depend on demo versus real personal records", () => {
    for (const slug of ["install-codex", "server-152fz", "api-keys"]) {
      expect(buildQuest(getQuestProject(slug)!, "real")).toEqual(buildQuest(getQuestProject(slug)!, "demo"));
    }
  });
});
