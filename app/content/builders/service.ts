import type { ProjectDefinition, QuestStep } from "../types";
import { buildSharedQuest } from "./shared";

export function buildServiceQuest(project: ProjectDefinition): QuestStep[] {
  return buildSharedQuest(project, {
    workspace: "проект Codex",
    foundation: "мобильная веб-основа",
    preview: "предпросмотр сервиса",
    coreVerb: "записать первый пример",
    persistence: "сохранение данных после обновления",
    correction: "редактирование или удаление записи",
    route: "путь от пустого экрана до сохранённого результата",
    backup: "резервную копию данных и рабочую версию проекта",
    launch: "опубликован",
  });
}

