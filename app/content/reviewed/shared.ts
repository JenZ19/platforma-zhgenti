import type { DataMode } from "../../lib/preparation";
import type { ProjectDefinition, QuestStep } from "../types";

export type ReviewedLesson = Pick<QuestStep, "title" | "why" | "action" | "expected"> & Partial<QuestStep> & { legacyMilestone: number };

export function finishReviewed(project: ProjectDefinition, mode: DataMode, lessons: ReviewedLesson[]): QuestStep[] {
  const rules = `${mode === "real" ? "РЕЖИМ РЕАЛЬНЫХ ДАННЫХ. Не заменяй мои записи учебными. Недостающие сведения уточняй по одному. Настоящие чувствительные данные вводятся только в защищённый продукт, не в переписку с ИИ." : "РЕЖИМ УЧЕБНЫХ ДАННЫХ. Примеры вымышленные, не выдавай их за реальных клиентов и достижения."}\n\nРаботай только с проектом ${project.slug} и явно согласованной копией. Все технические файлы создавай сам. Не проси секреты в чате. Не публикуй, не отправляй сообщения и не оплачивай подключения без согласования. Не называй результат готовым без проверки.`;
  return lessons.map(({ legacyMilestone, ...lesson }, index) => ({
    ...lesson,
    id: index + 1, sourceStepId: legacyMilestone,
    customization: lesson.customization ?? false,
    eyebrow: "Один полезный результат", kind: lesson.prompt ? "prompt" : "action",
    prompt: lesson.prompt ? `${rules}${index === 0 ? "\nЕсли проект с этим именем уже существует, сначала спроси, продолжить его или сделать отдельную копию. Не перезаписывай существующие файлы и данные без согласования." : ""}\n\n${lesson.prompt}` : undefined,
    screenshot: lesson.screenshot ?? `/screens/${project.slug}/step-${String(legacyMilestone).padStart(2, "0")}.webp`,
    screenshotKind: lesson.screenshotKind ?? "placeholder",
    showScreenshot: lesson.showScreenshot ?? false,
    help: lesson.help ?? { title: "Что-то не получилось", body: "Не начинайте проект заново. Опишите помощнику, что нажали и что увидели. Не прикладывайте ключи и личные записи.", prompt: `${rules}\n\nНе получается шаг «${lesson.title}». Спроси, что произошло, затем исправь только причину ошибки. Сохрани остальные функции и записи. Дай одну повторную проверку. Если нет необходимого доступа, назови его и помоги составить вопрос куратору.` },
    extension: lesson.extension ?? (index === lessons.length - 1 && project.journey !== "setup" && project.kind !== "portfolio" ? {
      title: "По желанию: повторить для заказчика",
      description: "Основной проект закончен. Эту практику можно пропустить. Если заказчика пока нет, используйте явно учебный бриф.",
      prompt: `${rules}\n\nПодготовь отдельную копию ${project.slug}-client без моих данных, секретов и подключений. Оригинал не меняй. Спроси по одному: для кого делаем, какую задачу решаем, что изменим в содержании и оформлении. Не придумывай заказчика: при его отсутствии согласуй учебный пример. Покажи изменения «было / станет» и дождись согласия. Затем проверь основной сценарий копии. Для агента требуется отдельное подключение, для сайта — отдельный проверенный адрес. Подготовь памятку передачи и ограничения, не выдумывай отзыв и заработок.`,
    } : undefined),
  }));
}
