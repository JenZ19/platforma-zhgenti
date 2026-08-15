import type { CSSProperties } from "react";
import { getProjectCardIdentity } from "../content/project-card-identities";
import { isProjectBundle } from "../content/projects";
import type { CatalogProject } from "../content/types";
import { BundlePreviewCarousel } from "./BundlePreviewCarousel";

type ProjectStickerStyle = CSSProperties & {
  "--project-sticker-accent": string;
  "--project-sticker-tilt": string;
};

function ProjectSticker({ project }: { project: CatalogProject }) {
  const identity = getProjectCardIdentity(project);
  const style: ProjectStickerStyle = {
    "--project-sticker-accent": identity.accent,
    "--project-sticker-tilt": `${identity.tilt}deg`,
  };

  return (
    <span
      className={`project-preview-sticker sticker-${identity.shape} sticker-${identity.corner}`}
      data-project-sticker={project.slug}
      style={style}
    >
      <b aria-hidden="true">{identity.glyph}</b>
      <span>{identity.label}</span>
    </span>
  );
}

export function ProjectPreview({ project }: { project: CatalogProject }) {
  if (isProjectBundle(project)) {
    return (
      <figure className="project-preview project-preview-bundle">
        <BundlePreviewCarousel project={project} />
        <ProjectSticker project={project} />
        <figcaption><span>✦</span> Два варианта одного проекта</figcaption>
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
      <ProjectSticker project={project} />
      <figcaption><span>✦</span> {project.journey === "setup" ? "Что будет готово" : "Вот что получится"}</figcaption>
    </figure>
  );
}
