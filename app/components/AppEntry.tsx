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
  | { type: "home"; format: "desktop" | "mobile"; formatExplicit: boolean; section: DashboardSection; search: string }
  | { type: "quest"; slug: string; output?: ProjectFormat; format: "desktop" | "mobile"; formatExplicit: boolean }
  | { type: "capture"; slug: string; step: number }
  | { type: "capture-mobile"; slug: string; step: number }
  | { type: "capture-guide"; slug: string; mode: "real" | "demo"; step: number; frame: number };

const dashboardSections: readonly DashboardSection[] = ["home", "projects", "weeks", "portfolio", "fairy"];

type ParsedRoute = {
  route: Route;
  canonicalSearch?: string;
};

function dashboardQuery(section: DashboardSection, format: "desktop" | "mobile", search = "", explicitDesktop = false): string {
  const query = new URLSearchParams();
  if (format === "mobile") query.set("format", "mobile");
  else if (explicitDesktop) query.set("format", "desktop");
  if (section !== "home") query.set("section", section);
  if (search.trim()) query.set("q", search);
  const value = query.toString();
  return value ? `?${value}` : "";
}

function questQuery(resolved: { slug: string; output?: ProjectFormat; legacy: boolean }, format: "desktop" | "mobile", explicitDesktop = false): string {
  const canonical = canonicalQuestQuery(resolved, format === "mobile");
  if (format !== "desktop" || !explicitDesktop) return canonical;
  return canonical.replace(/^\?/, "?format=desktop&");
}

function parseRoute(search: string, savedSection: DashboardSection = "home", clientDefaultFormat: "desktop" | "mobile" = "desktop", formatParamImplicit = false): ParsedRoute {
  const query = new URLSearchParams(search);
  const guideCapture = query.get("capture-guide")?.match(/^(.+)--(real|demo)--step-(\d{2})--frame-(\d{2})$/);
  if (guideCapture) return { route: { type: "capture-guide", slug: guideCapture[1], mode: guideCapture[2] as "real" | "demo", step: Number(guideCapture[3]), frame: Number(guideCapture[4]) } };
  const mobileCapture = query.get("capture-mobile")?.match(/^(.+)--step-(\d{2})$/);
  if (mobileCapture) return { route: { type: "capture-mobile", slug: mobileCapture[1], step: Number(mobileCapture[2]) } };
  const capture = query.get("capture")?.match(/^(.+)--step-(\d{2})$/);
  if (capture) return { route: { type: "capture", slug: capture[1], step: Number(capture[2]) } };
  const quest = query.get("quest");
  const rawFormat = formatParamImplicit ? null : query.get("format");
  const formatExplicit = rawFormat === "mobile" || rawFormat === "desktop";
  const format = rawFormat === "mobile" ? "mobile" : rawFormat === "desktop" ? "desktop" : clientDefaultFormat;
  const rawSection = query.get("section");
  const section = rawSection === null
    ? savedSection
    : dashboardSections.includes(rawSection as DashboardSection)
      ? rawSection as DashboardSection
      : "home";
  if (!quest) {
    const dashboardSearch = query.get("q") ?? "";
    const canonicalSearch = rawSection !== null && (rawSection === "home" || section === "home")
      ? dashboardQuery("home", format, dashboardSearch, formatExplicit && format === "desktop")
      : undefined;
    const missingClientFormat = !formatExplicit && clientDefaultFormat === "mobile";
    const implicitFormatSearch = formatParamImplicit
      ? dashboardQuery(section, format, dashboardSearch)
      : undefined;
    return {
      route: { type: "home", format, formatExplicit, section, search: dashboardSearch },
      canonicalSearch: canonicalSearch
        ?? implicitFormatSearch
        ?? (missingClientFormat ? dashboardQuery(section, format, dashboardSearch) : undefined),
    };
  }
  const resolved = resolvePublicProjectRoute(quest, query.get("output") ?? undefined);
  if (!resolved) return { route: { type: "home", format, formatExplicit, section, search: query.get("q") ?? "" } };
  const canonical = questQuery(resolved, format, formatExplicit && format === "desktop");
  return {
    route: { type: "quest", slug: resolved.slug, output: resolved.output, format, formatExplicit },
    canonicalSearch: canonical,
  };
}

function dashboardUrl(section: DashboardSection, format: "desktop" | "mobile", search = "", explicitDesktop = false): string {
  return dashboardQuery(section, format, search, explicitDesktop) || window.location.pathname;
}

export function AppEntry({ initialSearch = "" }: { initialSearch?: string }) {
  const [route, setRoute] = useState<Route>(() => parseRoute(initialSearch).route);
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    const readBrowserRoute = (restoreSavedSection: boolean) => {
      const savedSection = restoreSavedSection ? loadDashboardSection(window.localStorage) : "home";
      const clientDefaultFormat = window.innerWidth <= 767 ? "mobile" : "desktop";
      const formatParamImplicit = window.history.state?.submarineImplicitFormat === true;
      if (new URLSearchParams(window.location.search).get("section") === "home") {
        saveDashboardSection("home", window.localStorage);
      }
      const parsed = parseRoute(window.location.search, savedSection, clientDefaultFormat, formatParamImplicit);
      if (parsed.canonicalSearch !== undefined && window.location.search !== parsed.canonicalSearch) {
        const historyState = !parsed.route.type.startsWith("capture") && "formatExplicit" in parsed.route && !parsed.route.formatExplicit
          ? { submarineImplicitFormat: true }
          : {};
        window.history.replaceState(historyState, "", `${window.location.pathname}${parsed.canonicalSearch}${window.location.hash}`);
      }
      return parsed.route;
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoute(readBrowserRoute(true));
    setClientReady(true);
    const onPopState = () => setRoute(readBrowserRoute(false));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if ((route.type !== "home" && route.type !== "quest") || route.formatExplicit) return;
    const media = typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 767px)") : null;
    const syncImplicitFormat = () => {
      const format = (media?.matches ?? window.innerWidth <= 767) ? "mobile" : "desktop";
      if (format === route.format) return;
      const search = route.type === "quest"
        ? questQuery({ slug: route.slug, output: route.output, legacy: false }, format)
        : dashboardQuery(route.section, format, route.search);
      window.history.replaceState({ submarineImplicitFormat: true }, "", `${window.location.pathname}${search}${window.location.hash}`);
      setRoute({ ...route, format });
    };
    media?.addEventListener?.("change", syncImplicitFormat);
    window.addEventListener("resize", syncImplicitFormat);
    return () => {
      media?.removeEventListener?.("change", syncImplicitFormat);
      window.removeEventListener("resize", syncImplicitFormat);
    };
  }, [route]);

  useEffect(() => {
    if (route.type === "quest") saveLastActiveProject(route.slug, route.format, window.localStorage);
  }, [route]);

  function openQuest(
    slug: string,
    format: "desktop" | "mobile" = route.type === "home" || route.type === "quest" ? route.format : "desktop",
    output?: ProjectFormat,
  ) {
    const formatExplicit = (route.type === "home" || route.type === "quest") && route.formatExplicit;
    const query = questQuery({ slug, output, legacy: false }, format, format === "desktop" && formatExplicit);
    window.history.pushState(formatExplicit ? {} : { submarineImplicitFormat: true }, "", query);
    setRoute({ type: "quest", slug, output, format, formatExplicit });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openSection(section: DashboardSection) {
    const format = route.type === "home" || route.type === "quest" ? route.format : "desktop";
    const formatExplicit = (route.type === "home" || route.type === "quest") && route.formatExplicit;
    window.history.pushState(formatExplicit ? {} : { submarineImplicitFormat: true }, "", dashboardUrl(section, format, "", formatExplicit && format === "desktop"));
    saveDashboardSection(section, window.localStorage);
    setRoute({ type: "home", section, search: "", format, formatExplicit });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openSearch(search: string) {
    const format = route.type === "home" || route.type === "quest" ? route.format : "desktop";
    const formatExplicit = (route.type === "home" || route.type === "quest") && route.formatExplicit;
    window.history.pushState(formatExplicit ? {} : { submarineImplicitFormat: true }, "", dashboardUrl("weeks", format, search, formatExplicit && format === "desktop"));
    saveDashboardSection("weeks", window.localStorage);
    setRoute({ type: "home", section: "weeks", search, format, formatExplicit });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateDashboardSearch(search: string) {
    if (route.type !== "home") return;
    window.history.replaceState(route.formatExplicit ? {} : { submarineImplicitFormat: true }, "", dashboardUrl(route.section, route.format, search, route.formatExplicit && route.format === "desktop"));
    setRoute({ ...route, search });
  }

  function changeOutput(output?: ProjectFormat) {
    if (route.type !== "quest") return;
    const next = { ...route, output };
    const query = questQuery({ slug: route.slug, output, legacy: false }, route.format, route.formatExplicit && route.format === "desktop");
    window.history.replaceState(route.formatExplicit ? {} : { submarineImplicitFormat: true }, "", query);
    setRoute(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function home() {
    openSection("home");
  }

  function changeFormat() {
    if (route.type === "quest") {
      const format = route.format === "mobile" ? "desktop" : "mobile";
      const query = questQuery({ slug: route.slug, output: route.output, legacy: false }, format, format === "desktop");
      window.history.replaceState({}, "", query);
      setRoute({ ...route, format, formatExplicit: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (route.type !== "home") return;
    const format = route.format === "mobile" ? "desktop" : "mobile";
    window.history.replaceState({}, "", dashboardUrl(route.section, format, route.search, format === "desktop"));
    setRoute({ ...route, format, formatExplicit: true });
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
      clientReady={clientReady}
      assistantScope={route.type === "quest" ? route.slug : "academy"}
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
