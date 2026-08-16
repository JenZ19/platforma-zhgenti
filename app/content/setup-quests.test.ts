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

  it("builds long click-by-click paths only for the API lesson", () => {
    for (const slug of ["api-keys"] as const) {
      const project = getQuestProject(slug)!;
      const demo = buildQuest(project, "demo");
      const real = buildQuest(project, "real");
      const expectedCount = 14;
      expect(demo, slug).toHaveLength(expectedCount);
      expect(real, slug).toEqual(demo);
      expect(demo.map((step) => step.id)).toEqual(Array.from({ length: expectedCount }, (_, index) => index + 1));
      for (const step of demo) {
        expect(step.guide, `${slug}/${step.id}`).toHaveLength(3);
        expect(step.why.length, `${slug}/${step.id}`).toBeGreaterThan(45);
        expect(step.action.length, `${slug}/${step.id}`).toBeGreaterThan(45);
        expect(step.expected, `${slug}/${step.id}`).toHaveLength(3);
      }
      expect(allText(demo), slug).not.toMatch(/РЕЖИМ РЕАЛЬНЫХ ДАННЫХ|вымышленные данные/i);
    }
  });

  it("keeps the server purchase lesson fast and removes repeated picture guides", () => {
    const project = getQuestProject("server-152fz")!;
    const steps = buildQuest(project, "real");

    expect(steps).toHaveLength(9);
    expect(steps.map((step) => step.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(steps.every((step) => step.guide === undefined)).toBe(true);
    expect(steps.filter((step) => step.showScreenshot !== false).map((step) => step.id)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(allText(steps)).not.toMatch(/остановитесь и сверьте|название окна и основная кнопка совпадают/i);
  });

  it("uses only authentic AdminVPS screens or an explicit replacement placeholder", () => {
    const steps = buildQuest(getQuestProject("server-152fz")!, "real");

    expect(steps.slice(1, 6).map((step) => step.screenshotKind)).toEqual(["real", "real", "real", "real", "real"]);
    expect(steps.slice(1, 6).map((step) => step.screenshot)).toEqual([
      "/screens/server-152fz/real-step-02.webp",
      "/screens/server-152fz/real-step-03.jpg",
      "/screens/server-152fz/real-step-04.webp",
      "/screens/server-152fz/real-step-05.webp",
      "/screens/server-152fz/real-step-06.webp",
    ]);
    expect(steps[6]).toMatchObject({
      screenshotKind: "placeholder",
      screenshot: "/screens/server-152fz/placeholder-step-07.svg",
    });
    expect(steps[0].showScreenshot).toBe(false);
    expect(steps[7].showScreenshot).toBe(false);
    expect(steps[8].showScreenshot).toBe(false);
  });

  it("gives the learner one safe everyday command for using the server", () => {
    const usage = buildQuest(getQuestProject("server-152fz")!, "real")[7];
    const text = allText(usage);

    expect(usage.title).toMatch(/пользоваться сервером/i);
    expect(text).toMatch(/впервые опубликовать.+обновить.+найти.+проблем/is);
    expect(text).toMatch(/покаж.+план.+до.+изменен/is);
    expect(text).toMatch(/резервн.+копи.+рискован/is);
    expect(text).toMatch(/приватн.+SSH.+парол.+не.+прос/is);
    expect(text).toMatch(/проект.+адрес.+проверк/is);
  });

  it("collects legal facts one question at a time without making decisions for the learner", () => {
    const legal = buildQuest(getQuestProject("server-152fz")!, "real")[8];
    const text = allText(legal);

    expect(legal.title).toMatch(/факт.+152.?ФЗ/i);
    expect(text).toMatch(/один.+вопрос.+за раз/is);
    expect(text).toMatch(/не знаю/i);
    expect(text).toMatch(/не выбира.+правов.+основан/is);
    expect(text).toMatch(/не реша.+уведомлен.+Роскомнадзор/is);
    expect(text).toMatch(/не заявля.+соответств.+152.?ФЗ/is);
    expect(text).toMatch(/подтвержд.+факт.+неизвестн.+стоп.+вопрос.+специалист.+материал/is);
    expect(text).toMatch(/не проси.+реальн.+персональн.+данн.+парол.+SSH/is);
    expect(legal.reward).toBe("Фея полностью проверенного результата");
    expect(buildQuest(getQuestProject("server-152fz")!, "real")[7].reward).toBeUndefined();
  });

  it("explains server and SSH key terms before asking the learner to act", () => {
    const steps = buildQuest(getQuestProject("server-152fz")!, "real");

    expect(`${steps[0].why} ${steps[0].action}`).toMatch(/сервер.+отдельн.+компьютер.+дата-центр.+круглосуточ/is);
    expect(`${steps[0].why} ${steps[0].action}`).toMatch(/сам.+по себе.+не означает.+152.?ФЗ/is);
    expect(`${steps[5].why} ${steps[5].action}`).toMatch(/SSH-ключ.+без.+пересылк.+парол/is);
    expect(`${steps[5].why} ${steps[5].action}`).toMatch(/публичн.+част.+AdminVPS.+приватн.+част.+только.+компьютер/is);
    expect(`${steps[5].why} ${steps[5].action}`).toMatch(/\.pub.+можно.+PRIVATE KEY.+нельзя/is);
  });

  it("builds separate six-level Mac and Windows installation paths", () => {
    const project = getQuestProject("install-codex")!;
    const mac = buildQuest(project, "demo", undefined, "mac");
    const windows = buildQuest(project, "demo", undefined, "windows");
    const macText = allText(mac);
    const windowsText = allText(windows);

    for (const [platform, steps] of [["mac", mac], ["windows", windows]] as const) {
      expect(steps, platform).toHaveLength(6);
      expect(steps.map((step) => step.id), platform).toEqual([1, 2, 3, 4, 5, 6]);
      expect(steps.every((step) => step.guide === undefined), platform).toBe(true);
      expect(steps.filter((step) => step.showScreenshot !== false).map((step) => step.id), platform).toEqual([1, 2, 3, 4]);
      expect(allText(steps), platform).toContain("https://chatgpt.com/download/");
      expect(allText(steps), platform).toMatch(/верхн.+лев.+Codex/is);
      expect(allText(steps), platform).toMatch(/codex-test/i);
      expect(allText(steps), platform).not.toMatch(/яблок|четыр.+квадрат|запиш.+лист|пропуст.+уров|если у вас (?:Mac|Windows).+идите дальше/is);
    }

    expect(macText).toMatch(/macOS 14/i);
    expect(macText).toMatch(/\.dmg|Программы|Applications/i);
    expect(macText).not.toMatch(/меню «Пуск»|\.exe/i);
    expect(windowsText).toMatch(/Windows/i);
    expect(windowsText).toMatch(/\.exe|установщик.+Пуск/is);
    expect(windowsText).not.toMatch(/\.dmg|Applications/i);

    expect(mac[0]).toMatchObject({ screenshotKind: "real", screenshot: "/screens/install-codex/real-step-01.jpg" });
    expect(windows[0]).toMatchObject({ screenshotKind: "real", screenshot: "/screens/install-codex/real-step-01.jpg" });
    expect(mac[1]).toMatchObject({ screenshotKind: "placeholder", screenshot: "/screens/install-codex/placeholder-mac-step-02.svg" });
    expect(windows[1]).toMatchObject({ screenshotKind: "placeholder", screenshot: "/screens/install-codex/placeholder-windows-step-02.svg" });
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
    expect(text).toContain("https://my.adminvps.ru/knowledgebase/291/mery-zashchity-personalnykh-dannykh-152-f3.html");
    expect(text).toContain(API_KEYS_QUEST_HREF);
  });

  it("repeats the supplied AdminVPS guide as a complete beginner path", () => {
    const text = allText(buildQuest(getQuestProject("server-152fz")!));
    expect(text).toContain("https://adminvps.ru/");
    expect(text).toContain("/materials/adminvps-vps-instruction.pdf");
    expect(text).toMatch(/5.?10 минут/i);
    expect(text).toMatch(/Россия.+Беларусь.+Казахстан.+Нидерланды.+Германия.+Финляндия.+Польша/is);
    expect(text).toMatch(/Promo.+499.+1.+3[,.]5.+2 ГБ.+15 ГБ/is);
    expect(text).toMatch(/Micro.+799.+2 CPU.+4 ГБ.+30 ГБ/is);
    expect(text).toMatch(/Start.+1289.+4 CPU.+8 ГБ.+60 ГБ/is);
    expect(text).toMatch(/Standard.+2149.+8 CPU.+12 ГБ.+100 ГБ/is);
    expect(text).toMatch(/Ubuntu 22\.04/i);
    expect(text).toMatch(/Оперативная память.+Диск.+IPv4.+Еженедельный бэкап/is);
    expect(text).toMatch(/Фамилия.+Имя.+Телефон.+Email.+пароль/is);
    expect(text).toMatch(/Услуги.+Товары\/Услуги.+IP/is);
    expect(text).toMatch(/Active.+Следующ.+оплат/is);
    expect(text).toMatch(/перезагруз.+выключ.+включ.+смен.+тариф.+резервн/is);
    expect(text).toMatch(/SSH Keys.+Добавить.+публичн.+ключ/is);
    expect(text).not.toMatch(/панел[ьи] Selectel|my\.selectel\.ru|мастер сервера Selectel/i);
  });

  it("includes the SUBMARINE first-month offer without hiding the terms", () => {
    const text = allText(buildQuest(getQuestProject("server-152fz")!));
    expect(text).toMatch(/скидк.+60%/i);
    expect(text).toContain("SUBMARINE123");
    expect(text).toMatch(/одному серверу.+один раз.+1 месяц.+кроме Lite/is);
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
