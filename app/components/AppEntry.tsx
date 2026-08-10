"use client";

import { useEffect, useState } from "react";
import { getProject } from "../content/projects";
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

type Route =
  | { type: "home"; format: "desktop" | "mobile" }
  | { type: "quest"; slug: string; format: "desktop" | "mobile" }
  | { type: "capture"; slug: string; step: number }
  | { type: "capture-mobile"; slug: string; step: number }
  | { type: "capture-guide"; slug: string; mode: "real" | "demo"; step: number; frame: number };

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
  return quest ? { type: "quest", slug: quest, format } : { type: "home", format };
}

export function AppEntry() {
  const [route, setRoute] = useState<Route>({ type: "home", format: "desktop" });

  useEffect(() => {
    // Query routing is intentionally browser-only for this single-page academy.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoute(readRoute());
    const onPopState = () => setRoute(readRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function openQuest(slug: string, format: "desktop" | "mobile" = route.type === "home" || route.type === "quest" ? route.format : "desktop") {
    window.history.pushState({}, "", format === "mobile" ? `?format=mobile&quest=${slug}` : `?quest=${slug}`);
    setRoute({ type: "quest", slug, format });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function home() {
    const format = route.type === "home" || route.type === "quest" ? route.format : "desktop";
    window.history.pushState({}, "", format === "mobile" ? `${window.location.pathname}?format=mobile` : window.location.pathname);
    setRoute({ type: "home", format });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (route.type === "capture") {
    const project = getProject(route.slug);
    return project ? <ExpectedScene project={project} step={route.step} /> : <div>Проект не найден</div>;
  }
  if (route.type === "capture-guide") {
    const project = getProject(route.slug);
    const frame = project ? buildQuest(project, route.mode)[route.step - 1]?.guide?.[route.frame - 1] : undefined;
    if (!project || !frame) return <div>Кадр не найден</div>;
    return isOriginalQuestSlug(project.slug) ? <OriginalQuestGuideScene project={project} frame={frame} step={route.step} mode={route.mode} /> : <HomeHelperGuideScene frame={frame} step={route.step} mode={route.mode} />;
  }
  if (route.type === "capture-mobile") {
    const project = getProject(route.slug);
    return project ? <MobileExpectedScene project={project} step={route.step} /> : <div>Проект не найден</div>;
  }
  if (route.type === "quest") {
    const project = getProject(route.slug);
    if (route.format === "mobile") return project ? <MobileQuest project={project} onHome={home} /> : <MobileAcademy onOpen={(slug) => openQuest(slug, "mobile")} />;
    return project ? <Quest project={project} onHome={home} /> : <Academy onOpen={(slug) => openQuest(slug, "desktop")} />;
  }
  return route.format === "mobile" ? <MobileAcademy onOpen={(slug) => openQuest(slug, "mobile")} /> : <Academy onOpen={(slug) => openQuest(slug, "desktop")} />;
}
