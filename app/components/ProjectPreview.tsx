import type { ProjectDefinition } from "../content/types";

export function ProjectPreview({ project }: { project: ProjectDefinition }) {
  return (
    <figure className={`project-preview project-preview-${project.kind}`}>
      {/* Static course screenshots are already compressed and must preserve their exact crop. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/screens/${project.slug}/step-14.png`}
        alt={`Прототип результата проекта «${project.title}»`}
        loading="lazy"
      />
      <figcaption><span>✦</span> Прототип результата</figcaption>
    </figure>
  );
}
