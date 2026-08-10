import type { DataMode } from "../../lib/preparation";
import { getPreparationProfile } from "../preparation";
import { paletteDescription } from "../customization";
import type {
  ProjectDefinition,
  QuestCustomization,
  QuestGuideFrame,
  QuestGuideScene,
  QuestStep,
} from "../types";

export type OriginalStepInput = {
  id: number;
  title: string;
  eyebrow: string;
  why: string;
  action: string;
  request: string;
  expected: [string, string, string, ...string[]];
  app?: string;
  scene?: QuestGuideScene;
  target?: string;
  help: string;
};

const rewardAt: Record<number, string> = {
  4: "Хранительница своей версии",
  8: "Фея работающего проекта",
  12: "Хранительница надёжного результата",
  17: "Фея клиентского портфолио",
};

function passport(customization: QuestCustomization): string {
  return `Название: «${customization.name}». Для кого: ${customization.audience}. Главная задача: ${customization.goal}. Устройство экрана: ${customization.style}. Цветовая гамма: ${paletteDescription(customization.palette)}. Тон подсказок: ${customization.tone}. Одна особенная функция: ${customization.feature}.`;
}

function dataContext(project: ProjectDefinition, mode: DataMode): string {
  if (mode === "demo") return `Используй только безопасные примеры без имён, карт, счетов и контактов: ${project.demo.join("; ")}.`;
  if (project.slug === "family-expenses") {
    return "РЕЖИМ РЕАЛЬНЫХ ДАННЫХ. Получай сведения только из ответов ученицы в этом диалоге. Задавай один короткий вопрос за раз, принимай ответы голосом или текстом и ничего не додумывай. Все нужные папки, файлы и поля создавай сам внутри текущего рабочего проекта. Никогда не проси ученицу вручную создавать, открывать или заполнять служебные файлы. Не запрашивай и не публикуй номера карт и счетов, коды, пароли и личные сведения членов семьи.";
  }
  const profile = getPreparationProfile(project.slug);
  return `РЕЖИМ РЕАЛЬНЫХ ДАННЫХ. Работай только с копиями из папки «${profile.folderName}». Основные записи находятся в файле «${profile.sourceFile}», правила — в файле «${profile.rulesFile}». Ничего не додумывай, не публикуй личные сведения и не меняй оригиналы вне папки проекта.`;
}

function workspaceContext(project: ProjectDefinition, input: OriginalStepInput): string {
  if (project.slug === "family-expenses" && input.id === 3) {
    return "Папки проекта ещё может не быть. На этом уровне только проведи короткий опрос и дождись подтверждения сводки. Ничего не создавай до подтверждения и не трогай другие проекты или личные документы.";
  }
  if (project.slug === "family-expenses" && input.id === 4) {
    return "Создай новое рабочее место family-expenses только внутри уже разрешённого пространства. Не меняй соседние проекты и личные документы.";
  }
  return "Работай только внутри папки текущего проекта и не удаляй работающие части.";
}

function domainWords(slug: string): { title: string; result: string } {
  if (slug === "family-expenses") return { title: "Помощь с бюджетом на этом уровне", result: "бюджет или расход работает правильно" };
  if (slug === "planner") return { title: "Помощь с планером на этом уровне", result: "планер или дело работает правильно" };
  if (slug === "idea-vault") return { title: "Помощь с копилкой на этом уровне", result: "копилка или идея работает правильно" };
  return { title: "Помощь с расписанием на этом уровне", result: "расписание или занятие работает правильно" };
}

function appFor(input: OriginalStepInput): string {
  if (input.app) return input.app;
  if (input.scene === "finder") return "Папки на компьютере";
  if (input.scene === "codex") return "Codex";
  if (input.scene === "preview") return "Предпросмотр проекта";
  if (input.scene === "publish") return "Публикация";
  if (input.scene === "portfolio") return "Портфолио";
  return "Платформа курса";
}

function guideFrames(project: ProjectDefinition, mode: DataMode, input: OriginalStepInput, prompt: string): QuestGuideFrame[] {
  const scene = input.scene ?? "academy";
  const app = appFor(input);
  const path = `/guides/${project.slug}/step-${String(input.id).padStart(2, "0")}`;
  return [
    {
      id: 1,
      title: `Откройте: ${app}`,
      app,
      action: `Откройте ${app}. Найдите проект «${project.title}» и уровень ${input.id}. Пока ничего не меняйте — сначала убедитесь, что открыта правильная версия проекта.`,
      after: `На экране видно название «${project.title}» и действие этого уровня: «${input.title}».`,
      doneWhen: `Открыт именно проект «${project.title}», а не соседний квест или старая клиентская копия.`,
      fallback: `Если название другое, вернитесь на страницу всех проектов, снова откройте «${project.title}» и перейдите к уровню ${input.id}.`,
      screenshot: `${path}-frame-01.png`,
      scene,
      target: input.target ?? "Нужный проект открыт",
    },
    {
      id: 2,
      title: input.title,
      app,
      action: input.action,
      exactText: prompt,
      after: `Действие выполнено только внутри проекта «${project.title}». Выбранный режим данных — ${mode === "real" ? project.slug === "family-expenses" ? "реальные ответы, которые Codex получил в диалоге" : "реальные данные из подготовленной папки" : "безопасные примеры"}.`,
      doneWhen: input.expected[0],
      fallback: `Если нужной кнопки или поля нет, не нажимайте случайные пункты. Откройте помощь этого уровня и скопируйте готовую команду для исправления проекта «${project.title}».`,
      screenshot: `${path}-frame-02.png`,
      scene,
      target: input.target ?? "Нажмите сюда",
    },
    {
      id: 3,
      title: "Сверьте результат",
      app,
      action: `Ничего больше не добавляйте. Сравните экран с тремя признаками готовности и отметьте уровень выполненным только тогда, когда видите каждый из них.`,
      after: input.expected.join(" · "),
      doneWhen: input.expected.join("; "),
      fallback: `Если хотя бы один признак не совпадает, отправьте Codex команду из блока «Нужна помощь» и повторите проверку именно этого уровня.`,
      screenshot: `${path}-frame-03.png`,
      scene: input.id >= 15 ? scene : "preview",
      target: "Проверьте эти три пункта",
    },
  ];
}

export function makeOriginalStep(
  project: ProjectDefinition,
  mode: DataMode,
  customization: QuestCustomization,
  input: OriginalStepInput,
): QuestStep {
  const domain = domainWords(project.slug);
  const prompt = `Ты помогаешь новичку без ручного кода сделать проект «${project.title}». ${workspaceContext(project, input)} ${dataContext(project, mode)}\n\nПАСПОРТ МОЕЙ ВЕРСИИ. ${passport(customization)}\n\nЗАДАЧА УРОВНЯ ${input.id}. ${input.request}\n\nПосле выполнения сам проверь результат, перечисли три видимых признака готовности и объясни мне только: что нажать, что увидеть и что делать, если экран отличается.`;
  return {
    id: input.id,
    title: input.title,
    eyebrow: input.eyebrow,
    why: input.why,
    action: input.action,
    kind: "prompt",
    prompt,
    expected: input.expected,
    screenshot: `/screens/${project.slug}/step-${String(input.id).padStart(2, "0")}.png`,
    reward: rewardAt[input.id],
    help: {
      title: domain.title,
      body: input.help,
      prompt: `В проекте «${project.title}» я застряла на уровне ${input.id} «${input.title}». ${dataContext(project, mode)} Моя версия: ${passport(customization)} Не переделывай весь проект. Проверь только этот уровень, найди одну причину расхождения и исправь её. Затем напиши одно действие для меня и три видимых признака, по которым я пойму, что ${domain.result}.`,
    },
    guide: guideFrames(project, mode, input, prompt),
  };
}
