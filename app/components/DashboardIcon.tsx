import type { ReactNode } from "react";

export type DashboardIconName = "home" | "projects" | "weeks" | "portfolio" | "fairy" | "search" | "chevron" | "close" | "reset" | "plus" | "service" | "agent" | "laptop" | "windows";

const paths: Record<DashboardIconName, ReactNode> = {
  home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10.5V20h13v-9.5" /><path d="M9.5 20v-6h5v6" /></>,
  projects: <><path d="M3.5 6.5h6l2 2h9v10.5H3.5z" /><path d="M3.5 9h17" /></>,
  weeks: <><rect x="4" y="5.5" width="16" height="15" rx="3" /><path d="M8 3.5v4M16 3.5v4M4 10h16" /><path d="m8 15 2 2 5-5" /></>,
  portfolio: <><rect x="3.5" y="6.5" width="17" height="13" rx="3" /><path d="M9 6.5V4h6v2.5M3.5 12h17M10 12v2h4v-2" /></>,
  fairy: <><path d="m12 2 1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z" /><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></>,
  chevron: <path d="m7 9 5 5 5-5" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  reset: <><path d="M4 9V4h5" /><path d="M5.6 17.2A8 8 0 1 0 6 6" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  service: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M4 9h16M9 9v11" /></>,
  agent: <><path d="M5 5h14v11H9l-4 3z" /><path d="m12 7 .7 2.3L15 10l-2.3.7L12 13l-.7-2.3L9 10l2.3-.7z" /></>,
  laptop: <><rect x="5" y="5" width="14" height="11" rx="2" /><path d="M3 19h18" /></>,
  windows: <><path d="M4 5.5 11 4v7H4zM13 3.7l7-1.2V11h-7zM4 13h7v7l-7-1.3zM13 13h7v8.5L13 20z" /></>,
};

export function DashboardIcon({ name }: { name: DashboardIconName }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}
