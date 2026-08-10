"use client";

import { useState } from "react";
import type { ProjectBundleDefinition, ProjectFormat } from "../content/types";
import { QuestResetButton } from "./QuestResetButton";

export function QuestFormatChoice({
  project,
  mobile = false,
  onChoose,
  onHome,
  onReset,
}: {
  project: ProjectBundleDefinition;
  mobile?: boolean;
  onChoose: (format: ProjectFormat) => void;
  onHome: () => void;
  onReset: () => void;
}) {
  const [explanationOpen, setExplanationOpen] = useState(false);
  const shell = mobile ? "mobile-quest-shell format-choice-shell mobile" : "quest-shell format-choice-shell";

  return (
    <main className={shell}>
      <header className={mobile ? "mobile-topbar" : "site-header quest-site-header"}>
        <button type="button" className="brand brand-button" onClick={onHome}>
          <span>S</span><b>SUBMARINE<small>{mobile ? "Квесты с телефона" : "Все квесты"}</small></b>
        </button>
        <span className="format-choice-progress">Шаг 1 из 2</span>
      </header>
      <section className="format-choice-hero">
        <button type="button" className="back-link" onClick={onHome}>← Вернуться ко всем проектам</button>
        <p className="kicker"><span /> Недели 1–2 · {project.track}</p>
        <h1>{project.title}</h1>
        <p>{project.outcome}</p>
        <QuestResetButton mobile={mobile} onReset={onReset} />
      </section>
      <section className="format-choice-card" aria-labelledby="format-choice-title">
        <div className="format-choice-heading">
          <small>Сначала выберите, как будет выглядеть готовый результат</small>
          <h2 id="format-choice-title">Что вы хотите создать?</h2>
          <p>Обе версии решают одну задачу. Отличается только способ общения.</p>
        </div>
        <div className="format-choice-grid">
          <button type="button" className="format-option service" aria-label="Выбрать сервис" onClick={() => onChoose("service")}>
            <span className="format-option-icon">▦</span>
            <small>Экран с кнопками</small>
            <h3>Сервис</h3>
            <p>Вы сами добавляете и меняете данные в красивом приложении.</p>
            <b>Выбрать сервис →</b>
          </button>
          <button type="button" className="format-option agent" aria-label="Выбрать ИИ-агента" onClick={() => onChoose("agent")}>
            <span className="format-option-icon">✦</span>
            <small>Разговор текстом или голосом</small>
            <h3>ИИ-агент</h3>
            <p>Вы рассказываете своими словами, а агент уточняет и готовит результат.</p>
            <b>Выбрать ИИ-агента →</b>
          </button>
        </div>
        <button type="button" className="format-help-toggle" aria-expanded={explanationOpen} onClick={() => setExplanationOpen((value) => !value)}>
          Не знаю, что выбрать
        </button>
        {explanationOpen && (
          <div className="format-help" aria-live="polite">
            <p><span>Сервис</span> В сервисе вы нажимаете кнопки и сами управляете записями.</p>
            <p><span>ИИ-агент</span> Агент понимает текст и голос, задаёт вопросы и сам предлагает следующий шаг.</p>
          </div>
        )}
      </section>
    </main>
  );
}
