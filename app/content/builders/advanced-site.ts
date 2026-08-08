import type { ProjectDefinition, QuestStep } from "../types";
import { buildSharedQuest } from "./shared";

export function buildAdvancedSiteQuest(project: ProjectDefinition): QuestStep[] {
  return buildSharedQuest(project, {
    workspace: "проект сложного сайта в Codex",
    foundation: "клиентский сайт с формами и функциями",
    preview: "тестовый предпросмотр сайта",
    coreVerb: "пройти заявку или расчёт",
    persistence: "сохранение заявки, корзины или расчёта",
    correction: "исправление данных и обработку ошибки формы",
    route: "полный клиентский путь до тестового подтверждения",
    backup: "рабочую версию, резерв данных и список подключений",
    launch: "опубликован с безопасными тестовыми подключениями",
  });
}

