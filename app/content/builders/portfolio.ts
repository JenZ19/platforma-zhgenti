import type { ProjectDefinition, QuestStep } from "../types";
import { buildSharedQuest } from "./shared";

export function buildPortfolioQuest(project: ProjectDefinition): QuestStep[] {
  return buildSharedQuest(project, {
    workspace: "проект портфолио в Codex",
    foundation: "галерею работ, услугу и клиентские материалы",
    preview: "предпросмотр портфолио",
    coreVerb: "открыть карточку проекта",
    persistence: "сохранение карточек, ссылок и описания услуги",
    correction: "редактирование карточки и честную подпись учебной работы",
    route: "путь от знакомства со специалистом до обращения",
    backup: "копию портфолио и безопасную папку материалов",
    launch: "опубликован и готов к первому показу",
  });
}

