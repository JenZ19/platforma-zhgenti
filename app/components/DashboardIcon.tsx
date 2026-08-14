import type { ReactNode } from "react";

export type DashboardIconName = "home" | "projects" | "weeks" | "portfolio" | "fairy" | "search";

const paths: Record<DashboardIconName, ReactNode> = {
  home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10.5V20h13v-9.5" /><path d="M9.5 20v-6h5v6" /></>,
  projects: <><path d="M3.5 6.5h6l2 2h9v10.5H3.5z" /><path d="M3.5 9h17" /></>,
  weeks: <><rect x="4" y="5.5" width="16" height="15" rx="3" /><path d="M8 3.5v4M16 3.5v4M4 10h16" /><path d="m8 15 2 2 5-5" /></>,
  portfolio: <><rect x="3.5" y="6.5" width="17" height="13" rx="3" /><path d="M9 6.5V4h6v2.5M3.5 12h17M10 12v2h4v-2" /></>,
  fairy: <><path d="m12 2 1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z" /><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></>,
};

export function DashboardIcon({ name }: { name: DashboardIconName }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}
