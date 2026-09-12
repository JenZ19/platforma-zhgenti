import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getQuestProject, questProjects } from "../projects";
import { ProjectBrief } from "../../components/ProjectBrief";

const metadata = (slug: string) => {
  const p = getQuestProject(slug)!;
  return [p.outcome, p.features.join(" "), p.audience, p.portfolioAngle].join(" ");
};

describe("reviewed project promises", () => {
  it.each(["expert-site", "psychologist-site", "beauty-site", "photographer-site", "consultation-site", "course-site", "event-site"])("%s describes a page and contact, not extra integrations", slug => {
    expect(metadata(slug)).not.toMatch(/оплат|тариф|регистраци|запис[ьи]|форма контакта|форма заявки|отзывы/);
  });
  it.each(["expert-pro-site", "school-pro-site", "service-pro-site", "catalog-pro-site"])("%s improves a working copy without mandatory payments", slug => {
    expect(metadata(slug)).toMatch(/существующ|копи|доработ/);
    expect(metadata(slug)).not.toMatch(/оплат|уведомлен|запись|отзывы/);
  });
  it("removes excess family and design promises", () => {
    expect(metadata("child-schedule")).not.toMatch(/напоминан|уведомлен/);
    expect(metadata("family-expenses")).not.toMatch(/остат|JSON|CSV/);
    expect(metadata("unique-design")).not.toMatch(/два.*концепт|клиентская верси|повторил метод для заказчика/);
    expect(metadata("unique-design")).toMatch(/существующ|копи/);
  });
  it("continues three existing graduate works", () => {
    expect(metadata("graduate-portfolio")).toMatch(/тр[иё].*готов|тр[иё].*существующ/);
    expect(metadata("graduate-portfolio")).not.toMatch(/4–6|3–5|5 лучших/);
    expect(metadata("portfolio-site")).not.toMatch(/3–6/);
  });
  it.each(["carousel-agent", "threads-agent", "webinar-moderator-agent", "family-health-hub"])("%s names the supplied template prerequisite", slug => {
    expect(metadata(slug)).toMatch(/выданн|предоставленн|полученн/);
    expect(metadata(slug)).toMatch(/шаблон|комплект/);
  });
  it("does not require a server purchase or guarantee a discount", () => {
    expect(metadata("server-152fz")).toMatch(/нужен|необходим/);
    expect(metadata("server-152fz")).not.toMatch(/скидкой 60%/);
  });
  it("keeps visible example cards consistent with the reduced routes", () => {
    const demo = (slug: string) => getQuestProject(slug)!.demo.join(" ");
    expect(demo("graduate-portfolio")).not.toMatch(/5 лучших|7 дней/);
    expect(demo("expert-pro-site")).not.toMatch(/платёж|регистрац/);
    expect(demo("course-site")).toMatch(/три|3/i);
    expect(demo("fitness-tracker")).not.toMatch(/стаканов|Сон/);
    expect(demo("family-health-hub")).not.toMatch(/3 профиля|12 документов|требуют внимания/);
  });
  it("introduces one finished version, optional client practice and agent-specific customization", () => {
    for (const project of questProjects) {
      const html = renderToStaticMarkup(createElement(ProjectBrief, { project }));
      expect(html).toMatch(/одна.*верси|один.*результат/i);
      expect(html).toMatch(/заказчик.*необязательн|клиент.*необязательн/i);
      if (project.kind === "agent") expect(html).not.toMatch(/выберите задачу, название, цвета/);
    }
  });
});
