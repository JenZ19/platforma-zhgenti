"use client";

import { useEffect, useState, type MouseEvent } from "react";
import type { ProjectDefinition } from "../content/types";
import { LEVELS_PER_QUEST, loadProgress } from "../lib/progress";
import { ProjectPreview } from "./ProjectPreview";

export function ProjectCard({
  project,
  onOpen,
}: {
  project: ProjectDefinition;
  onOpen?: (slug: string) => void;
}) {
  const [completed, setCompleted] = useState(0);

  useEffect(() => {
    // Keep the first browser render identical to the server, then restore local progress.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompleted(loadProgress(project.slug, window.localStorage).completed.length);
  }, [project.slug]);
  const status = completed === LEVELS_PER_QUEST ? "Готово" : completed > 0 ? `${completed} из 17` : "Не начато";

  function open(event: MouseEvent<HTMLAnchorElement>) {
    if (!onOpen) return;
    event.preventDefault();
    onOpen(project.slug);
  }

  return (
    <article className="project-card">
      <ProjectPreview project={project} />
      <div className="project-card-top">
        <span className="project-symbol" aria-hidden="true">{project.symbol}</span>
        <span className={`project-status ${completed === 17 ? "complete" : ""}`}>{status}</span>
      </div>
      <p className="project-track">Неделя {project.week} · {project.track}</p>
      <h3>{project.title}</h3>
      <p className="project-outcome">{project.outcome}</p>
      <div className="project-meta"><span>17 уровней</span><span>{project.device}</span></div>
      <a href={`?quest=${project.slug}`} onClick={open} aria-label={`Открыть квест: ${project.title}`}>
        Открыть квест <span>→</span>
      </a>
    </article>
  );
}
