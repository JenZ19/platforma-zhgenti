import { isProjectBundle } from "../content/projects";
import type { CatalogProject } from "../content/types";

export function ProjectPreview({ project }: { project: CatalogProject }) {
  if (isProjectBundle(project)) {
    return (
      <figure className="project-preview project-preview-bundle">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/screens/${project.formats.service.slug}/step-14.png`}
            alt={`Сервис проекта «${project.title}»`}
            loading="lazy"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/screens/${project.formats.agent.slug}/step-14.png`}
            alt={`ИИ-агент проекта «${project.title}»`}
            loading="lazy"
          />
        </div>
        <figcaption><span>✦</span> 2 формата внутри</figcaption>
      </figure>
    );
  }
  return (
    <figure className={`project-preview project-preview-${project.kind} ${project.journey === "setup" ? "project-preview-setup" : ""}`}>
      {/* Static course screenshots are already compressed and must preserve their exact crop. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/screens/${project.slug}/step-14.png`}
        alt={`Прототип результата проекта «${project.title}»`}
        loading="lazy"
      />
      <figcaption><span>✦</span> {project.journey === "setup" ? "Что будет готово" : "Прототип результата"}</figcaption>
    </figure>
  );
}
