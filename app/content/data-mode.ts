import type { DataMode } from "../lib/preparation";
import { getPreparationProfile } from "./preparation";
import type { ProjectPreparationProfile } from "./preparation";
import type { ProjectDefinition, QuestStep } from "./types";

function sourceReference(profile: ProjectPreparationProfile, index: number): string {
  const row = ["первую", "вторую", "третью"][index] ?? "подходящую";
  return `${row} заполненную строку из файла «${profile.sourceFile}»`;
}

function realText(text: string, project: ProjectDefinition, profile: ProjectPreparationProfile): string {
  let next = text
    .replaceAll(project.slug, profile.folderName)
    .replaceAll(project.demo.join("; "), `заполненные строки из файла «${profile.sourceFile}»`);
  for (const [index, example] of project.demo.entries()) {
    const reference = sourceReference(profile, index);
    next = next.replaceAll(`вымышленный пример «${example}»`, reference);
    next = next.replaceAll(`тестовый пример «${example}»`, reference);
    next = next.replaceAll(`пример «${example}»`, reference);
    next = next.replaceAll(`«${example}»`, reference);
  }
  next = next
    .replaceAll(`Демонстрационные примеры: ${project.demo.join("; ")}.`, `Рабочий источник: файл «${profile.sourceFile}» с вашими заполненными строками.`)
    .replaceAll(`Для проверки используй только эти вымышленные примеры: ${project.demo.join("; ")}.`, `Для проверки используй заполненные строки из файла «${profile.sourceFile}».`)
    .replaceAll("на вымышленных примерах", `на заполненных строках из файла «${profile.sourceFile}»`)
    .replaceAll("только на вымышленных примерах", `только на заполненных строках из файла «${profile.sourceFile}»`)
    .replaceAll("третий демонстрационный пример", sourceReference(profile, 2))
    .replaceAll("демонстрационные данные", `записи из файла «${profile.sourceFile}»`)
    .replaceAll("вымышленные примеры", `записи из файла «${profile.sourceFile}»`)
    .replaceAll("учебную работу", "рабочую копию")
    .replaceAll("учебной версии", "подготовленной версии")
    .replaceAll("учебной папки", "рабочей папки")
    .replaceAll("учебные данные", "подготовленные данные")
    .replaceAll("без реальных личных данных", "без лишних персональных данных")
    .replaceAll("нет секретов и реальных данных", "нет секретов и закрытых исходников")
    .replaceAll("реальные контакты", "частные контакты")
    .replaceAll("личные данные не используй", "используй только минимально необходимые данные внутри рабочей копии и не публикуй частные сведения")
    .replaceAll("Удали из публикуемой версии токены, пароли, личные выгрузки и реальные данные.", "Удали из публикуемой версии токены, пароли, закрытые исходники и частные данные. Оставь только сведения, которые владелец разрешил публиковать.")
    .replace(/демонстрационный/gi, "рабочий")
    .replace(/демонстрационного/gi, "рабочего")
    .replace(/демонстрационные/gi, "рабочие")
    .replace(/демонстрационных/gi, "рабочих")
    .replace(/демонстрационными/gi, "рабочими")
    .replace(/демонстрационную/gi, "рабочую")
    .replace(/вымышленный/gi, "безопасный")
    .replace(/вымышленного/gi, "безопасного")
    .replace(/вымышленные/gi, "безопасные")
    .replace(/вымышленных/gi, "безопасных")
    .replace(/вымышленными/gi, "безопасными")
    .replace(/вымышленную/gi, "безопасную");
  return next;
}

export function adaptQuestToDataMode(
  steps: QuestStep[],
  project: ProjectDefinition,
  mode: DataMode,
): QuestStep[] {
  if (mode === "demo") return steps;
  const profile = getPreparationProfile(project.slug);
  const prefix = `РЕЖИМ РЕАЛЬНЫХ ДАННЫХ. Работай только в папке «${profile.folderName}». Сначала открой файл «${profile.sourceFile}». В нём должны быть поля: ${profile.sourceFields.join(", ")}. Не додумывай отсутствующие факты: если нужная строка не заполнена, задай один простой вопрос. Не показывай и не публикуй закрытые исходники, пароли, токены и частные персональные данные.\n\n`;
  return steps.map((step) => ({
    ...step,
    why: realText(step.why, project, profile),
    action: realText(step.action, project, profile),
    prompt: step.prompt ? prefix + realText(step.prompt, project, profile) : undefined,
    expected: step.expected.map((item) => realText(item, project, profile)),
    help: {
      ...step.help,
      body: realText(step.help.body, project, profile),
      prompt: prefix + realText(step.help.prompt, project, profile),
    },
  }));
}
