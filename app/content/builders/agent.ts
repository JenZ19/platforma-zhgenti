import type { ProjectDefinition, QuestStep } from "../types";
import { buildSharedQuest } from "./shared";

export function buildAgentQuest(project: ProjectDefinition): QuestStep[] {
  return buildSharedQuest(project, {
    workspace: "задачу Codex и конструктор агента",
    foundation: "паспорт, инструкция и тестовую среду агента",
    preview: "демонстрационный диалог агента",
    coreVerb: "получить первый полезный ответ",
    persistence: "понимание инструкции и загруженных материалов",
    correction: "уточнение запроса и признание границ",
    route: "путь от запроса до проверенного результата агента",
    backup: "копию инструкции, паспорта и безопасных тестов",
    launch: "настроен и готов к демонстрации",
  });
}

