import type { DataMode } from "../lib/preparation";
import type { ProjectDefinition, QuestCustomization, QuestStep, SetupPlatform } from "./types";
import { buildQuest } from "./quests";

export type MobileCapability = "phone-full" | "phone-template" | "curator";
export type MobileTool = "telegram" | "lovable" | "chatium" | "screenshot" | "curator";
export type MobileAction = { tool: MobileTool; label: string; href?: string; note?: string };
export type MobileQuestStep = QuestStep & { mobileAction: MobileAction };
export type MobileCapabilityInfo = { id: MobileCapability; label: string; detail: string };

export function getMobileCapability(project: ProjectDefinition): MobileCapabilityInfo {
  if (project.journey === "setup") return { id: "curator", label: "Действия на компьютере", detail: "Телефон можно держать рядом как инструкцию" };
  if (project.kind === "advanced-site" || ["family-health-hub", "webinar-moderator-agent", "fairy-team-agent", "small-shop-site"].includes(project.slug)) return { id: "curator", label: "С помощью куратора", detail: "Сервер, доступы и внешние подключения проверяем вместе с куратором. Это дополнительный сложный проект." };
  return { id: "phone-template", label: "С телефона после настройки", detail: "Нужны личный помощник от школы и доступ к выбранному конструктору. Установка Codex на телефон не требуется." };
}

/** One source of truth for the objective, prompt and success checks on both surfaces. */
export function buildMobileQuest(project: ProjectDefinition, mode: DataMode = "demo", customization?: QuestCustomization, setupPlatform: SetupPlatform = "mac"): MobileQuestStep[] {
  const steps = buildQuest(project, mode, customization, setupPlatform);
  if (project.journey === "setup") return steps.map((step) => ({ ...step, mobileAction: { tool: "curator", label: "Продолжить на компьютере", note: "Этот инструмент настраивается на Mac или Windows. На телефоне можно прочитать инструкцию." } }));
  const host = project.kind === "agent" ? "подключённый личный помощник в Telegram" : "тот же проект в Lovable или подключённый личный помощник в Telegram";
  const boundaries = `ФОРМАТ: С ТЕЛЕФОНА. Работай только с текущим проектом ${project.slug}. Не проси ученицу открывать терминал, локальные папки или создавать файлы вручную. Если команда упоминает Codex или файл, выполни техническую работу сам в подключённом рабочем месте. Не утверждай, что подключение или перенос в Lovable/Чатиум выполнен, пока это не проверено. Не создавай ещё один проект вместо продолжения текущего. Если доступа нет, назови, какой именно доступ нужен от куратора. Не проси пароли и API-ключи в чате. Для внешних действий, публикации и расходов сначала покажи план и дождись согласия.`;
  return steps.map((step) => ({
    ...step,
    kind: "prompt",
    action: `Откройте ${host}. Скопируйте команду ниже и отправьте её целиком. Ответьте на уточнение, если оно появится.\n\nЗатем откройте полученный результат на телефоне и проверьте пункты «Готово, если». Не переходите дальше только потому, что помощник написал «сделано»: проверьте результат сами.`,
    prompt: `${boundaries}\n\nТЕКУЩАЯ ЗАДАЧА: ${step.title}\n\n${step.prompt ?? step.action}\n\nПРОВЕРКА РЕЗУЛЬТАТА:\n${step.expected.map((item) => `- ${item}`).join("\n")}`,
    guide: undefined,
    showScreenshot: step.screenshotKind === "real" || step.screenshotKind === "placeholder",
    help: { ...step.help, prompt: `${boundaries}\n\n${step.help.prompt}` },
    mobileAction: { tool: "telegram", label: "Открыть моего помощника", note: "Откроется чат. Команда не отправляется автоматически: вставьте её в поле сообщения и отправьте." },
    links: [...(step.links ?? []), ...(project.kind !== "agent" ? [{ label: "Открыть Lovable", href: "https://lovable.dev/", external: true, note: "Войдите и откройте уже созданный проект. Переноса из Telegram автоматически нет." }] : [])],
  }));
}
