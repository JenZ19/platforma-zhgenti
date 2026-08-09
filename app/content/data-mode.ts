import type { DataMode } from "../lib/preparation";
import type { ProjectDefinition, QuestStep } from "./types";

function realText(text: string, project: ProjectDefinition): string {
  let next = text;
  for (const example of project.demo) {
    next = next.replaceAll(`вымышленный пример «${example}»`, `подходящий безопасный пример из папки «${project.slug}»`);
    next = next.replaceAll(`тестовый пример «${example}»`, `подходящий пример из папки «${project.slug}»`);
    next = next.replaceAll(`пример «${example}»`, `подходящий пример из папки «${project.slug}»`);
    next = next.replaceAll(`«${example}»`, `материал из папки «${project.slug}»`);
  }
  next = next
    .replaceAll(`Демонстрационные примеры: ${project.demo.join("; ")}.`, `Рабочие материалы: безопасные копии из подготовленной папки «${project.slug}».`)
    .replaceAll(`Для проверки используй только эти вымышленные примеры: ${project.demo.join("; ")}.`, `Для проверки используй только подходящие материалы из подготовленной папки «${project.slug}».`)
    .replaceAll("на вымышленных примерах", `на безопасных материалах из подготовленной папки «${project.slug}»`)
    .replaceAll("только на вымышленных примерах", `только на безопасных материалах из подготовленной папки «${project.slug}»`)
    .replaceAll("третий демонстрационный пример", `подходящий материал из подготовленной папки «${project.slug}»`)
    .replaceAll("демонстрационные данные", "подготовленные рабочие материалы")
    .replaceAll("вымышленные примеры", "безопасные рабочие примеры")
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
  const prefix = `РЕЖИМ РЕАЛЬНЫХ ДАННЫХ. Сначала используй материалы из подготовленной папки «${project.slug}». Не додумывай отсутствующие факты: если важного материала не хватает, задай один простой вопрос. Не показывай и не публикуй закрытые исходники, пароли, токены и частные персональные данные.\n\n`;
  return steps.map((step) => ({
    ...step,
    why: realText(step.why, project),
    action: `Возьмите подходящий материал из подготовленной папки. ${realText(step.action, project)}`,
    prompt: step.prompt ? prefix + realText(step.prompt, project) : undefined,
    expected: step.expected.map((item) => realText(item, project)),
    help: {
      ...step.help,
      body: realText(step.help.body, project),
      prompt: prefix + realText(step.help.prompt, project),
    },
  }));
}
