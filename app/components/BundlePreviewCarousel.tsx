"use client";

import { useEffect, useState } from "react";
import { getProjectCardIdentityBySlug } from "../content/project-card-identities";
import type { ProjectBundleDefinition, ProjectFormat } from "../content/types";

const AUTOPLAY_MS = 4200;
const formats: ProjectFormat[] = ["service", "agent"];

function nextFormat(format: ProjectFormat): ProjectFormat {
  return format === "service" ? "agent" : "service";
}

export function BundlePreviewCarousel({ project }: { project: ProjectBundleDefinition }) {
  const [activeFormat, setActiveFormat] = useState<ProjectFormat>("service");
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const activeBranch = project.formats[activeFormat];
  const activeIdentity = getProjectCardIdentityBySlug(activeBranch.slug);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion) return;
    const timer = window.setInterval(() => {
      setActiveFormat((current) => nextFormat(current));
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [activeFormat, paused, reducedMotion]);

  return (
    <div
      className="bundle-preview-carousel"
      data-active-format={activeFormat}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      {formats.map((format) => {
        const branch = project.formats[format];
        const active = format === activeFormat;
        return (
          <div
            className={`bundle-preview-slide ${active ? "is-active" : ""}`}
            data-format={format}
            aria-hidden={!active}
            key={format}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/covers/${branch.slug}.webp`}
              alt={`${format === "service" ? "Сервис" : "ИИ-агент"} проекта «${project.title}»`}
              loading="lazy"
              decoding="async"
            />
          </div>
        );
      })}

      <span className="bundle-preview-format">
        <b>{activeFormat === "service" ? "Сервис" : "ИИ-агент"}</b>
        <span aria-hidden="true"> · </span>
        {activeIdentity.label}
      </span>

      <span className="bundle-preview-dots" aria-label="Выбрать вариант результата">
        {formats.map((format) => (
          <button
            type="button"
            aria-label={format === "service" ? "Показать сервис" : "Показать ИИ-агента"}
            aria-pressed={format === activeFormat}
            onClick={() => setActiveFormat(format)}
            key={format}
          >
            <span aria-hidden="true" />
          </button>
        ))}
      </span>
    </div>
  );
}
