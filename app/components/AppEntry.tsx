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

type ParsedRoute = {
  route: Route;
  canonicalSearch?: string;
};

function dashboardQuery(section: DashboardSection, format: "desktop" | "mobile", search = ""): string {
  const query = new URLSearchParams();
  if (format === "mobile") query.set("format", "mobile");
  if (section !== "home") query.set("section", section);
  if (search.trim()) query.set("q", search.trim());
  const value = query.toString();
  return value ? `?${value}` : "";
}

function parseRoute(search: string, savedSection: DashboardSection = "home"): ParsedRoute {
  const query = new URLSearchParams(search);
  const guideCapture = query.get("capture-guide")?.match(/^(.+)--(real|demo)--step-(\d{2})--frame-(\d{2})$/);
  if (guideCapture) return { route: { type: "capture-guide", slug: guideCapture[1], mode: guideCapture[2] as "real" | "demo", step: Number(guideCapture[3]), frame: Number(guideCapture[4]) } };
  const mobileCapture = query.get("capture-mobile")?.match(/^(.+)--step-(\d{2})$/);
  if (mobileCapture) return { route: { type: "capture-mobile", slug: mobileCapture[1], step: Number(mobileCapture[2]) } };
  const capture = query.get("capture")?.match(/^(.+)--step-(\d{2})$/);
  if (capture) return { route: { type: "capture", slug: capture[1], step: Number(capture[2]) } };
  const quest = query.get("quest");
  const format = query.get("format") === "mobile" ? "mobile" : "desktop";
  const rawSection = query.get("section");
  const section = rawSection === null
    ? savedSection
    : dashboardSections.includes(rawSection as DashboardSection)
      ? rawSection as DashboardSection
      : "home";
  if (!quest) {
    const dashboardSearch = query.get("q") ?? "";
    const canonicalSearch = rawSection !== null && (rawSection === "home" || section === "home")
      ? dashboardQuery("home", format, dashboardSearch)
      : undefined;
    return { route: { type: "home", format, section, search: dashboardSearch }, canonicalSearch };
  }
  const resolved = resolvePublicProjectRoute(quest, query.get("output") ?? undefined);
  if (!resolved) return { route: { type: "home", format, section, search: query.get("q") ?? "" } };
  const canonical = canonicalQuestQuery(resolved, format === "mobile");
  return {
    route: { type: "quest", slug: resolved.slug, output: resolved.output, format },
    canonicalSearch: canonical,
  };
}

function dashboardUrl(section: DashboardSection, format: "desktop" | "mobile", search = ""): string {
  return dashboardQuery(section, format, search) || window.location.pathname;
}

export function AppEntry({ initialSearch = "" }: { initialSearch?: string }) {
  const [route, setRoute] = useState<Route>(() => parseRoute(initialSearch).route);

  useEffect(() => {
    const readBrowserRoute = (restoreSavedSection: boolean) => {
      const savedSection = restoreSavedSection ? loadDashboardSection(window.localStorage) : "home";
      const parsed = parseRoute(window.location.search, savedSection);
      if (parsed.canonicalSearch !== undefined && window.location.search !== parsed.canonicalSearch) {
        window.history.replaceState({}, "", `${window.location.pathname}${parsed.canonicalSearch}${window.location.hash}`);
      }
      return parsed.route;
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoute(readBrowserRoute(true));
    const onPopState = () => setRoute(readBrowserRoute(false));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (route.type === "quest") saveLastActiveProject(route.slug, route.format, window.localStorage);
  }, [route]);

  function openQuest(
    slug: string,
    format: "desktop" | "mobile" = route.type === "home" || route.type === "quest" ? route.format : "desktop",
    output?: ProjectFormat,
  ) {
    const query = canonicalQuestQuery({ slug, output, legacy: false }, format === "mobile");
    window.history.pushState({}, "", query);
    setRoute({ type: "quest", slug, output, format });
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

  function updateDashboardSearch(search: string) {
    if (route.type !== "home") return;
    const nextSearch = search.trim();
    window.history.replaceState({}, "", dashboardUrl(route.section, route.format, nextSearch));
    setRoute({ ...route, search: nextSearch });
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
        : <MobileAcademy onOpen={(slug, output) => openQuest(slug, "mobile", output)} onOpenPortfolio={() => openSection("portfolio")} onSearchQueryChange={updateDashboardSearch} />
      : project
        ? <Quest project={project} initialOutput={route.output} onOutputChange={changeOutput} onHome={home} />
        : <Academy onOpen={(slug, output) => openQuest(slug, "desktop", output)} onOpenPortfolio={() => openSection("portfolio")} onSearchQueryChange={updateDashboardSearch} />
    : surface === "mobile"
      ? <MobileAcademy section={route.section} searchQuery={route.search} onOpen={(slug, output) => openQuest(slug, "mobile", output)} onOpenPortfolio={() => openSection("portfolio")} onSearchQueryChange={updateDashboardSearch} />
      : <Academy section={route.section} searchQuery={route.search} onOpen={(slug, output) => openQuest(slug, "desktop", output)} onOpenPortfolio={() => openSection("portfolio")} onSearchQueryChange={updateDashboardSearch} />;

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
