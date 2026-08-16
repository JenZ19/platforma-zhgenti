"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { DashboardSection } from "../lib/academy-dashboard";
import { DashboardIcon, type DashboardIconName } from "./DashboardIcon";
import { FairyAssistant } from "./FairyAssistant";

const items: { id: DashboardSection; label: string; mobileLabel: string; icon: DashboardIconName }[] = [
  { id: "home", label: "Главная", mobileLabel: "Главная", icon: "home" },
  { id: "projects", label: "Мои проекты", mobileLabel: "Проекты", icon: "projects" },
  { id: "weeks", label: "Квесты по неделям", mobileLabel: "Недели", icon: "weeks" },
  { id: "portfolio", label: "Портфолио", mobileLabel: "Портфолио", icon: "portfolio" },
  { id: "fairy", label: "Феечка", mobileLabel: "Феечка", icon: "fairy" },
];

export type LearningShellProps = {
  format: "desktop" | "mobile";
  clientReady?: boolean;
  activeSection?: DashboardSection;
  questTitle?: string;
  onNavigate: (section: DashboardSection) => void;
  onSearch: (query: string) => void;
  onFormatChange: () => void;
  searchQuery?: string;
  assistantScope: string;
  children: ReactNode;
};

export function LearningShell({
  activeSection,
  assistantScope,
  clientReady = true,
  children,
  format,
  onFormatChange,
  onNavigate,
  onSearch,
  questTitle,
  searchQuery = "",
}: LearningShellProps) {
  const [search, setSearch] = useState(searchQuery);
  const [fairyOpen, setFairyOpen] = useState(false);
  const fairyOpenerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Route changes can replace the query while the persistent shell stays mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (activeSection !== "fairy" || !fairyOpen) return;
    // The full Fairy page replaces the floating assistant completely.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFairyOpen(false);
  }, [activeSection, fairyOpen]);

  const closeFairy = useCallback(() => {
    setFairyOpen(false);
    fairyOpenerRef.current?.focus();
  }, []);

  function openContextualFairy(opener: HTMLButtonElement) {
    fairyOpenerRef.current = opener;
    setFairyOpen(true);
  }

  return (
    <div className={`learning-shell learning-shell-${format}`} data-learning-shell data-client-ready={clientReady ? "true" : "false"} data-visual-theme="elina-burgundy">
      <aside className="learning-sidebar" aria-label="Навигация Академии">
        <button className="learning-brand" type="button" onClick={() => onNavigate("home")} aria-label="На главную Академии">
          <DashboardIcon name="fairy" />
          <b>НЕЙРОПРОФИ<small>Академия квестов</small></b>
        </button>
        <nav>
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={activeSection === item.id ? "active" : ""}
              aria-current={activeSection === item.id ? "page" : undefined}
              onClick={() => onNavigate(item.id)}
            >
              <DashboardIcon name={item.icon} />
              {item.label}
            </button>
          ))}
        </nav>
        <button className="format-switch" type="button" onClick={onFormatChange}>
          {format === "mobile" ? "Открыть версию для компьютера" : "Открыть версию для телефона"}
        </button>
      </aside>
      {format === "desktop" && (
        <button
          type="button"
          className="mobile-format-switch"
          aria-label="Переключиться на версию для телефона"
          onClick={onFormatChange}
        >
          Открыть версию для телефона
        </button>
      )}
      <div className="learning-main">
        <header className="learning-topbar">
          <form role="search" onSubmit={(event) => { event.preventDefault(); onSearch(search); }}>
            <label>
              <DashboardIcon name="search" />
              <input type="search" aria-label="Найти проект" placeholder="Найти проект…" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <button type="submit">Найти</button>
          </form>
          <strong>{questTitle ?? "Мой учебный кабинет"}</strong>
        </header>
        {children}
      </div>
      {activeSection !== "fairy" && (
        <>
          <button
            type="button"
            className="fairy-floating-trigger"
            aria-label="Открыть Феечку"
            aria-haspopup="dialog"
            aria-expanded={fairyOpen}
            onClick={(event) => openContextualFairy(event.currentTarget)}
          >
            <DashboardIcon name="fairy" />
            <span>Спросить Феечку</span>
          </button>
          {fairyOpen && <FairyAssistant key={assistantScope} scope={assistantScope} mode="floating" onClose={closeFairy} />}
        </>
      )}
      <nav className="learning-bottom-nav" aria-label="Навигация Академии на телефоне">
        {items.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-label={`${item.label}, нижняя навигация`}
            aria-current={activeSection === item.id ? "page" : undefined}
            aria-haspopup={item.id === "fairy" && assistantScope !== "academy" ? "dialog" : undefined}
            aria-expanded={item.id === "fairy" && assistantScope !== "academy" ? fairyOpen : undefined}
            onClick={(event) => {
              if (item.id === "fairy" && assistantScope !== "academy") openContextualFairy(event.currentTarget);
              else onNavigate(item.id);
            }}
          >
            <DashboardIcon name={item.icon} />
            <small>{item.mobileLabel}</small>
          </button>
        ))}
      </nav>
    </div>
  );
}
