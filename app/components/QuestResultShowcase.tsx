import type { ProjectDefinition } from "../content/types";
import { projectArtworkUrl } from "../lib/project-artwork";

/** A concept cover is distinct from the verified screenshots inside a lesson. */
export function QuestResultShowcase({ project, stepId = 1 }: { project: ProjectDefinition; stepId?: number }) {
  if (stepId !== 1) return null;
  const src = projectArtworkUrl(project.slug);
  return (
    <figure className="quest-result-showcase" data-result-showcase={project.slug}>
      <a href={src} target="_blank" rel="noreferrer" aria-label={`Открыть пример результата: ${project.title}`}>
        {/* Public WebP is precompressed; direct URLs also work on the /kurs1/ static release. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`Пример оформления результата «${project.title}»`} decoding="async" />
        <span className="showcase-expand" aria-hidden="true">↗</span>
      </a>
      <figcaption>
        <strong>{project.journey === "setup" ? "К чему придём" : "Ваш будущий результат"}</strong>
        <span>{project.journey === "setup"
          ? "Иллюстрация результата. Настоящие экраны и действия — в шагах урока."
          : "Иллюстрация результата, не скриншот инструкции. Цвета и оформление вы сможете выбрать под себя."}</span>
      </figcaption>
    </figure>
  );
}
