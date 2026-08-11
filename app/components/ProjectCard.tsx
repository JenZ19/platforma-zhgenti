"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { getCatalogDiscoveryProfile } from "../content/discovery";
import { isProjectBundle } from "../content/projects";
import type { CatalogProject } from "../content/types";
import { getCatalogProjectProgress, getProjectLevelCount } from "../lib/progress";
import { ProjectPreview } from "./ProjectPreview";

export function ProjectCard({
  project,
  onOpen,
}: {
  project: CatalogProject;
  onOpen?: (slug: string) => void;
}) {
  const [completed, setCompleted] = useState(0);

  useEffect(() => {
    // Keep the first browser render identical to the server, then restore local progress.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompleted(getCatalogProjectProgress(project, window.localStorage).completed.length);
  }, [project]);
  const totalLevels = getProjectLevelCount(project);
  const status = completed === totalLevels ? "Готово" : completed > 0 ? `${completed} из ${totalLevels}` : "Не начато";
  const discovery = getCatalogDiscoveryProfile(project);

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
        <span className={`project-status ${completed === totalLevels ? "complete" : ""}`}>{status}</span>
      </div>
      <p className="project-track">{isProjectBundle(project) ? "Недели 1–2" : `Неделя ${project.week}`} · {project.track}</p>
      <div className="project-discovery-line"><strong>Уровень: {discovery.label}</strong>{discovery.keywords.slice(0, 3).map((keyword) => <i key={keyword}>{keyword}</i>)}</div>
      <h3>{project.title}</h3>
      <p className="project-outcome">{project.outcome}</p>
      <div className="project-meta"><span>{isProjectBundle(project) ? "Столько уровней, сколько нужно пути" : `${totalLevels} уровней`}</span><span>{project.device}</span></div>
      <a href={`?quest=${project.slug}`} onClick={open} aria-label={`Открыть квест: ${project.title}`}>
        Открыть квест <span>→</span>
      </a>
    </article>
  );
}
