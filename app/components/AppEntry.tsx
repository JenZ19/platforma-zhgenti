"use client";

import { useEffect, useState } from "react";
import { getProject, getQuestProject } from "../content/projects";
import { canonicalQuestQuery, resolvePublicProjectRoute } from "../content/project-routes";
import type { ProjectFormat } from "../content/types";
import { Academy } from "./Academy";
import { ExpectedScene } from "./ExpectedScene";
import { MobileAcademy } from "./MobileAcademy";
import { MobileExpectedScene } from "./MobileExpectedScene";
import { MobileQuest } from "./MobileQuest";
import { Quest } from "./Quest";
import { HomeHelperGuideScene } from "./HomeHelperGuideScene";
import { OriginalQuestGuideScene } from "./OriginalQuestGuideScene";
import { isOriginalQuestSlug } from "../content/customization";
import { buildQuest } from "../content/quests";
import { isSourcePrototypeSlug } from "./SourceProjectPrototypeScene";
import { isSetupQuestSlug } from "../content/setup-quests";
import {
  loadDashboardSection,
  saveDashboardSection,
  saveLastActiveProject,
  type DashboardSection,
} from "../lib/academy-dashboard";
import { LearningShell } from "./LearningShell";

type Route =
  | { type: "home"; format: "desktop" | "mobile"; section: DashboardSection; search: string }
  | { type: "quest"; slug: string; output?: ProjectFormat; format: "desktop" | "mobile" }
  | { type: "capture"; slug: string; step: number }
  | { type: "capture-mobile"; slug: string; step: number }
  | { type: "capture-guide"; slug: string; mode: "real" | "demo"; step: number; frame: number };

const dashboardSections: readonly DashboardSection[] = ["home", "projects", "weeks", "portfolio", "fairy"];

function readRoute(): Route {
  const query = new URLSearchParams(window.location.search);
  const guideCapture = query.get("capture-guide")?.match(/^(.+)--(real|demo)--step-(\d{2})--frame-(\d{2})$/);
  if (guideCapture) return { type: "capture-guide", slug: guideCapture[1], mode: guideCapture[2] as "real" | "demo", step: Number(guideCapture[3]), frame: Number(guideCapture[4]) };
  const mobileCapture = query.get("capture-mobile")?.match(/^(.+)--step-(\d{2})$/);
  if (mobileCapture) return { type: "capture-mobile", slug: mobileCapture[1], step: Number(mobileCapture[2]) };
  const capture = query.get("capture")?.match(/^(.+)--step-(\d{2})$/);
  if (capture) return { type: "capture", slug: capture[1], step: Number(capture[2]) };
  const quest = query.get("quest");
  const format = query.get("format") === "mobile" ? "mobile" : "desktop";
  const rawSection = query.get("section");
  const section = rawSection === null
    ? loadDashboardSection(window.localStorage)
    : dashboardSections.includes(rawSection as DashboardSection)
      ? rawSection as DashboardSection
      : "home";
  if (!quest) return { type: "home", format, section, search: query.get("q") ?? "" };
  const resolved = resolvePublicProjectRoute(quest, query.get("output") ?? undefined);
  if (!resolved) return { type: "home", format, section, search: query.get("q") ?? "" };
  const canonical = canonicalQuestQuery(resolved, format === "mobile");
  if (window.location.search !== canonical) window.history.replaceState({}, "", canonical);
  return { type: "quest", slug: resolved.slug, output: resolved.output, format };
}

function dashboardUrl(section: DashboardSection, format: "desktop" | "mobile", search = ""): string {
  const query = new URLSearchParams();
  if (format === "mobile") query.set("format", "mobile");
  if (section !== "home") query.set("section", section);
  if (search.trim()) query.set("q", search.trim());
  const value = query.toString();
  return value ? `?${value}` : window.location.pathname;
}

export function AppEntry() {
  const [route, setRoute] = useState<Route>({ type: "home", format: "desktop", section: "home", search: "" });

  useEffect(() => {
    // Query routing is intentionally browser-only for this single-page academy.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoute(readRoute());
    const onPopState = () => setRoute(readRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (route.type === "quest") saveLastActiveProject(route.slug, route.format, window.localStorage);
  }, [route]);

  function openQuest(slug: string, format: "desktop" | "mobile" = route.type === "home" || route.type === "quest" ? route.format : "desktop") {
    window.history.pushState({}, "", format === "mobile" ? `?format=mobile&quest=${slug}` : `?quest=${slug}`);
    setRoute({ type: "quest", slug, format });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openSection(section: DashboardSection) {
    const format = route.type === "home" || route.type === "quest" ? route.format : "desktop";
    window.history.pushState({}, "", dashboardUrl(section, format));
    saveDashboardSection(section, window.localStorage);
    setRoute({ type: "home", section, search: "", format });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openSearch(search: string) {
    const format = route.type === "home" || route.type === "quest" ? route.format : "desktop";
    window.history.pushState({}, "", dashboardUrl("weeks", format, search));
    saveDashboardSection("weeks", window.localStorage);
    setRoute({ type: "home", section: "weeks", search, format });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function changeOutput(output?: ProjectFormat) {
    if (route.type !== "quest") return;
    const next = { ...route, output };
    const query = canonicalQuestQuery({ slug: route.slug, output, legacy: false }, route.format === "mobile");
    window.history.replaceState({}, "", query);
    setRoute(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function home() {
    openSection("home");
  }

  function changeFormat() {
    if (route.type === "quest") {
      const format = route.format === "mobile" ? "desktop" : "mobile";
      const query = canonicalQuestQuery({ slug: route.slug, output: route.output, legacy: false }, format === "mobile");
      window.history.replaceState({}, "", query);
      setRoute({ ...route, format });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (route.type !== "home") return;
    const format = route.format === "mobile" ? "desktop" : "mobile";
    window.history.replaceState({}, "", dashboardUrl(route.section, format, route.search));
    setRoute({ ...route, format });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (route.type === "capture") {
    const project = getQuestProject(route.slug);
    return project ? <ExpectedScene project={project} step={route.step} /> : <div>Проект не найден</div>;
  }
  if (route.type === "capture-guide") {
    const project = getQuestProject(route.slug);
    const frame = project ? buildQuest(project, route.mode)[route.step - 1]?.guide?.[route.frame - 1] : undefined;
    if (!project || !frame) return <div>Кадр не найден</div>;
    return isOriginalQuestSlug(project.slug) || isSourcePrototypeSlug(project.slug) || isSetupQuestSlug(project.slug) ? <OriginalQuestGuideScene project={project} frame={frame} step={route.step} mode={route.mode} /> : <HomeHelperGuideScene frame={frame} step={route.step} mode={route.mode} />;
  }
  if (route.type === "capture-mobile") {
    const project = getQuestProject(route.slug);
    return project ? <MobileExpectedScene project={project} step={route.step} /> : <div>Проект не найден</div>;
  }
  const surface = route.format;
  const project = route.type === "quest" ? getProject(route.slug) : undefined;
  const content = route.type === "quest"
    ? surface === "mobile"
      ? project
        ? <MobileQuest project={project} initialOutput={route.output} onOutputChange={changeOutput} onHome={home} />
        : <MobileAcademy onOpen={(slug) => openQuest(slug, "mobile")} />
      : project
        ? <Quest project={project} initialOutput={route.output} onOutputChange={changeOutput} onHome={home} />
        : <Academy onOpen={(slug) => openQuest(slug, "desktop")} />
    : route.section === "home"
      ? surface === "mobile"
        ? <MobileAcademy onOpen={(slug) => openQuest(slug, "mobile")} />
        : <Academy onOpen={(slug) => openQuest(slug, "desktop")} />
      : <main className="academy-shell" data-dashboard-section={route.section} />;

  return (
    <LearningShell
      format={surface}
      activeSection={route.type === "home" ? route.section : undefined}
      questTitle={route.type === "quest" ? project?.title : undefined}
      onNavigate={openSection}
      onSearch={openSearch}
      searchQuery={route.type === "home" ? route.search : ""}
      onFormatChange={changeFormat}
    >
      {content}
    </LearningShell>
  );
}
