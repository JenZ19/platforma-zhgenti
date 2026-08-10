import type { DataMode } from "../lib/preparation";
import { getPreparationProfile } from "./preparation";
import type { ProjectPreparationProfile } from "./preparation";
import type { ProjectDefinition, QuestStep } from "./types";

function sourceReference(index: number): string {
  const row = ["первую", "вторую", "третью"][index] ?? "подходящую";
  return `${row} подтверждённую запись из ответов ученицы`;
}

function realText(text: string, project: ProjectDefinition, profile: ProjectPreparationProfile): string {
  let next = text
    .replaceAll(project.demo.join("; "), "подтверждённые примеры из ответов ученицы")
    .replaceAll(profile.sourceFile, "подтверждённые ответы ученицы")
    .replaceAll(profile.rulesFile, "подтверждённые правила ученицы");
  for (const [index, example] of project.demo.entries()) {
    const reference = sourceReference(index);
    next = next.replaceAll(`вымышленный пример «${example}»`, reference);
    next = next.replaceAll(`тестовый пример «${example}»`, reference);
    next = next.replaceAll(`пример «${example}»`, reference);
    next = next.replaceAll(`«${example}»`, reference);
  }
  next = next
    .replaceAll(`Демонстрационные примеры: ${project.demo.join("; ")}.`, "Рабочие примеры: только ответы, которые ученица подтвердила в диалоге.")
    .replaceAll(`Для проверки используй только эти вымышленные примеры: ${project.demo.join("; ")}.`, "Для проверки используй только подтверждённые ответы ученицы.")
    .replaceAll("на вымышленных примерах", "на подтверждённых примерах ученицы")
    .replaceAll("только на вымышленных примерах", "только на подтверждённых примерах ученицы")
    .replaceAll("третий демонстрационный пример", sourceReference(2))
    .replaceAll("демонстрационные данные", "подтверждённые ответы ученицы")
    .replaceAll("вымышленные примеры", "подтверждённые примеры ученицы")
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
  const sharedRules = `Не проси ученицу вручную создавать, открывать или заполнять служебные папки, файлы и поля — создавай их сам внутри проекта ${project.slug}. Не додумывай отсутствующие факты и не публикуй пароли, токены, закрытые исходники и частные персональные данные.`;
  const prefixFor = (step: QuestStep) => {
    if (step.id <= 2) {
      return `РЕЖИМ РЕАЛЬНЫХ ДАННЫХ. На этом уровне не начинай опрос и не запрашивай материалы: выполни только действие текущего уровня. ${sharedRules}\n\n`;
    }
    if (step.id === 3) {
      return `РЕЖИМ РЕАЛЬНЫХ ДАННЫХ. Сейчас один раз собери сведения для проекта. Задавай строго один короткий вопрос за раз и принимай ответы голосом или текстом. Уточни: ${profile.sourceFields.join(", ")}. Если у ученицы уже есть документ или фотография, можно предложить прикрепить безопасную копию, но не проси создавать служебный файл. После ответов покажи короткую сводку и дождись подтверждения. ${sharedRules}\n\n`;
    }
    return `РЕЖИМ РЕАЛЬНЫХ ДАННЫХ. Используй уже подтверждённые ответы ученицы из этого диалога и не начинай опрос заново. Только если без одного факта нельзя выполнить текущий уровень, задай один короткий вопрос и прими ответ голосом или текстом. ${sharedRules}\n\n`;
  };
  return steps.map((step) => {
    const prefix = prefixFor(step);
    return {
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
    };
  });
}
