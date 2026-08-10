import { getAgentContract } from "../agent-contracts";
import { getQuestProject } from "../projects";
import type { ProjectPreparationProfile } from "./types";

export function makeAgentPreparationProfile(slug: string): ProjectPreparationProfile {
  const project = getQuestProject(slug);
  if (!project || project.kind !== "agent") throw new Error(`Не найден ИИ-агент ${slug}`);
  const contract = getAgentContract(slug);

  return {
    folderName: project.title,
    sourceFile: `${slug}-ответы.txt`,
    sourceTitle: `Вспомните обычный запрос для «${project.title}»`,
    sourceWhy: `Codex задаст вопросы по одному и сам соберёт ответы в рабочую основу. Ничего заранее оформлять не нужно.`,
    sourceFields: contract.requiredFields,
    sourceExample: contract.inputExample,
    rulesFile: `${slug}-правила.txt`,
    rulesTitle: "Вспомните, как агент должен принять решение",
    rulesWhy: `Правило «${contract.decisionRule}» не даёт агенту угадывать или менять логику от разговора к разговору.`,
    rules: [
      `Первый вопрос: ${contract.firstQuestion}`,
      `Решение: ${contract.decisionRule}`,
      contract.confirmationRule,
      `Передача человеку: ${contract.handoff}`,
    ],
    presentationFile: `${slug}-результат.txt`,
    presentationTitle: `Представьте результат «${contract.resultTitle}»`,
    presentationWhy: "Codex сам оформит его на одном экране: достаточно выбрать, что пользователю важно увидеть первым.",
    presentation: [contract.resultTitle, ...contract.resultItems],
    sharingFile: `${slug}-границы.txt`,
    sharingTitle: "Отделите полезный ответ от внешнего действия",
    sharingWhy: "Агент сначала показывает точный черновик, а отправляет, сохраняет или меняет что-либо только после явного согласия.",
    sharing: [contract.confirmationRule, contract.handoff, project.safety],
    safetyChecks: contract.selfCheck,
  };
}
