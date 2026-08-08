"use client";

import { useEffect, useState } from "react";
import { getProject } from "../content/projects";
import { Academy } from "./Academy";
import { ExpectedScene } from "./ExpectedScene";
import { Quest } from "./Quest";

type Route =
  | { type: "home" }
  | { type: "quest"; slug: string }
  | { type: "capture"; slug: string; step: number };

function readRoute(): Route {
  const query = new URLSearchParams(window.location.search);
  const capture = query.get("capture")?.match(/^(.+)--step-(\d{2})$/);
  if (capture) return { type: "capture", slug: capture[1], step: Number(capture[2]) };
  const quest = query.get("quest");
  return quest ? { type: "quest", slug: quest } : { type: "home" };
}

export function AppEntry() {
  const [route, setRoute] = useState<Route>({ type: "home" });

  useEffect(() => {
    // Query routing is intentionally browser-only for this single-page academy.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoute(readRoute());
    const onPopState = () => setRoute(readRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function openQuest(slug: string) {
    window.history.pushState({}, "", `?quest=${slug}`);
    setRoute({ type: "quest", slug });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function home() {
    window.history.pushState({}, "", window.location.pathname);
    setRoute({ type: "home" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (route.type === "capture") {
    const project = getProject(route.slug);
    return project ? <ExpectedScene project={project} step={route.step} /> : <div>Проект не найден</div>;
  }
  if (route.type === "quest") {
    const project = getProject(route.slug);
    return project ? <Quest project={project} onHome={home} /> : <Academy onOpen={openQuest} />;
  }
  return <Academy onOpen={openQuest} />;
}

