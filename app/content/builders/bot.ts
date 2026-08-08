import type { ProjectDefinition, QuestStep } from "../types";
import { buildSharedQuest } from "./shared";

export function buildBotQuest(project: ProjectDefinition): QuestStep[] {
  return buildSharedQuest(project, {
    workspace: "шаблон бота и задачу Codex",
    foundation: "сценарий бота с приветствием и кнопками",
    preview: "тестовый диалог бота",
    coreVerb: "пройти первую ветку диалога",
    persistence: "сохранение ответа и перехода между сообщениями",
    correction: "повторный ответ и обработку неправильного ввода",
    route: "диалог от приветствия до полезного результата",
    backup: "копию сценария и экспорт безопасных настроек",
    launch: "активирован в тестовом режиме",
  });
}

