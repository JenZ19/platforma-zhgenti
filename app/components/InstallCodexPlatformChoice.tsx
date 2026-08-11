"use client";

import type { ProjectDefinition } from "../content/types";
import type { SetupPlatform } from "../lib/setup-platform";

export function InstallCodexPlatformChoice({
  project,
  mobile = false,
  onChoose,
  onHome,
}: {
  project: ProjectDefinition;
  mobile?: boolean;
  onChoose: (platform: SetupPlatform) => void;
  onHome: () => void;
}) {
  const shell = mobile ? "mobile-quest-shell format-choice-shell mobile" : "quest-shell format-choice-shell";

  return (
    <main className={shell} data-visual-theme="tactile-album">
      <header className={mobile ? "mobile-topbar" : "site-header quest-site-header"}>
        <button type="button" className="brand brand-button" onClick={onHome}>
          <span>S</span><b>SUBMARINE<small>{mobile ? "Квесты с телефона" : "Все квесты"}</small></b>
        </button>
        <span className="format-choice-progress">Перед началом</span>
      </header>

      <section className="format-choice-hero install-platform-hero">
        <button type="button" className="back-link" onClick={onHome}>← Вернуться ко всем проектам</button>
        <p className="kicker"><span /> Неделя 1 · быстрый старт</p>
        <h1>{project.title}</h1>
        <p>Выберите свой компьютер — дальше останется только нужная инструкция без лишней ветки.</p>
      </section>

      <section className="format-choice-card install-platform-card" aria-labelledby="install-platform-title">
        <div className="format-choice-heading">
          <small>Один выбор перед установкой</small>
          <h2 id="install-platform-title">Выберите свой компьютер</h2>
          <p>После выбора вы получите шесть коротких шагов: скачать, установить, открыть Codex и проверить его первой задачей.</p>
        </div>
        <div className="format-choice-grid">
          <button type="button" className="format-option mac" aria-label="Выбрать Mac" onClick={() => onChoose("mac")}>
            <span className="format-option-icon">⌘</span>
            <small>macOS 14 или новее</small>
            <h3>Mac</h3>
            <p>Покажем установку через файл .dmg и папку «Программы».</p>
            <b>Продолжить на Mac →</b>
          </button>
          <button type="button" className="format-option windows" aria-label="Выбрать Windows" onClick={() => onChoose("windows")}>
            <span className="format-option-icon">⊞</span>
            <small>Установка для Windows</small>
            <h3>Windows</h3>
            <p>Покажем установщик и запуск приложения через меню «Пуск».</p>
            <b>Продолжить на Windows →</b>
          </button>
        </div>
      </section>
    </main>
  );
}
