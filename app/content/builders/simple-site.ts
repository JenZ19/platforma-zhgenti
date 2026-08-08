import type { ProjectDefinition, QuestStep } from "../types";
import { buildSharedQuest } from "./shared";

export function buildSimpleSiteQuest(project: ProjectDefinition): QuestStep[] {
  return buildSharedQuest(project, {
    workspace: "проект сайта в Codex или Lovable",
    foundation: "одностраничный сайт с готовыми блоками",
    preview: "предпросмотр сайта",
    coreVerb: "нажать главную кнопку",
    persistence: "сохранение текстов, изображений и настроек",
    correction: "изменение текста и проверку ссылки",
    route: "путь от первого экрана до контакта",
    backup: "копию проекта перед оформлением",
    launch: "опубликован",
  });
}

