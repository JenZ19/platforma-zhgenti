import { isProjectBundle } from "../content/projects";
import type { CatalogProject } from "../content/types";

export function ProjectPreview({ project }: { project: CatalogProject }) {
  if (isProjectBundle(project)) {
    return (
      <figure className="project-preview project-preview-bundle">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/covers/${project.formats.service.slug}.webp`}
            alt={`Сервис проекта «${project.title}»`}
            loading="lazy"
            decoding="async"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/covers/${project.formats.agent.slug}.webp`}
            alt={`ИИ-агент проекта «${project.title}»`}
            loading="lazy"
            decoding="async"
          />
        </div>
        <figcaption><span>✦</span> Сервис + ИИ-агент</figcaption>
      </figure>
    );
  }
  return (
    <figure className={`project-preview project-preview-${project.kind} ${project.journey === "setup" ? "project-preview-setup" : ""}`}>
      {/* Static course screenshots are already compressed and must preserve their exact crop. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/covers/${project.slug}.webp`}
        alt={`Готовый результат проекта «${project.title}»`}
        loading="lazy"
        decoding="async"
      />
      <figcaption><span>✦</span> {project.journey === "setup" ? "Что будет готово" : "Вот что получится"}</figcaption>
    </figure>
  );
}
