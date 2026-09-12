import type { ProjectDefinition, QuestLink, QuestStep } from "./types";

/**
 * Живой пример результата на первом шаге квеста.
 *
 * Раньше открытый пример был только у планера, и остальные проекты приходилось выбирать
 * по названию вслепую. Пример показывает форму результата — не вашу будущую работу,
 * поэтому подпись говорит об этом прямо.
 */
type Example = { href: string; label: string; note: string };

const byKind: Record<string, Example> = {
  service: {
    href: "/materials/planner-example/index.html",
    label: "Открыть учебный пример сервиса",
    note: "Готовый сервис можно потрогать: нажмите его кнопки. Ваш будет про свою задачу и в своих цветах.",
  },
  agent: {
    href: "/materials/agent-example/index.html",
    label: "Открыть учебный пример агента",
    note: "Короткий разговор с готовым помощником: как он уточняет недостающее и где его границы.",
  },
  "simple-site": {
    href: "/materials/site-example/index.html",
    label: "Открыть учебный пример сайта",
    note: "Лендинг вымышленного эксперта: из каких блоков он собран и чем заканчивается.",
  },
  "advanced-site": {
    href: "/materials/pro-site-example/index.html",
    label: "Открыть учебный пример с новой функцией",
    note: "Три частых улучшения готового сайта: калькулятор, заявка и материалы.",
  },
  portfolio: {
    href: "/materials/portfolio-example/index.html",
    label: "Открыть учебный пример портфолио",
    note: "Выпускная страница целиком: работы с честным статусом, услуга и границы заказа.",
  },
};

/** Квест установки показывает настоящие экраны, живой пример там не нужен. */
export function exampleFor(project: ProjectDefinition): Example | undefined {
  if (project.journey === "setup") return undefined;
  return byKind[project.kind];
}

export function attachExampleLink(project: ProjectDefinition, steps: QuestStep[]): QuestStep[] {
  const example = exampleFor(project);
  if (!example || !steps.length) return steps;
  return steps.map((step) => {
    if (step.id !== steps[0].id) return step;
    const links = step.links ?? [];
    // Свой пример проекта важнее общего: планер уже приносит собственный.
    if (links.some((link) => link.href.includes("-example/"))) return step;
    const link: QuestLink = { label: example.label, href: example.href, note: example.note, external: true };
    return { ...step, links: [...links, link] };
  });
}
