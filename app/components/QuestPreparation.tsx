/* eslint-disable @next/next/no-img-element -- generated lesson screens are fixed-size local teaching assets */

import type { ProjectDefinition } from "../content/types";
import { DashboardIcon } from "./DashboardIcon";
import {
  buildRealDataChecklist,
  type QuestPreparation as PreparationState,
} from "../lib/preparation";

export function QuestPreparation({
  project,
  preparation,
  onChooseDemo,
  onChooseReal,
  onToggle,
  onStartReal,
  onBack,
  mobile = false,
}: {
  project: ProjectDefinition;
  preparation: PreparationState;
  onChooseDemo: () => void;
  onChooseReal: () => void;
  onToggle: (id: string) => void;
  onStartReal: () => void;
  onBack: () => void;
  mobile?: boolean;
}) {
  const checklist = buildRealDataChecklist(project, mobile ? "mobile" : "desktop");
  const allChecked = checklist.every((item) => preparation.checked.includes(item.id));

  if (preparation.mode === "real") {
    return (
      <section className="preparation-card real-checklist" aria-label="Подготовка реальных данных">
        <button type="button" className="preparation-back" onClick={onBack}>← Изменить выбор</button>
        <p className="section-kicker">Шаг 0 · Реальный проект</p>
        <h2>Ничего заранее создавать не нужно</h2>
        <p className="preparation-lead">
          Codex сам создаст проект, папки, файлы и нужные поля. Вы только вспомните несколько простых ответов — назвать их можно будет голосом или текстом.
        </p>
        <div className="checklist-progress"><span>{preparation.checked.length} из {checklist.length}</span><i><b style={{ width: `${Math.round((preparation.checked.length / checklist.length) * 100)}%` }} /></i></div>
        <div className={`preparation-list ${checklist.some((item) => item.steps?.length) ? "detailed-preparation-list" : ""}`}>
          {checklist.map((item, index) => {
            const checked = preparation.checked.includes(item.id);
            if (item.steps?.length) {
              return (
                <article className={`preparation-guide-item ${checked ? "checked" : ""}`} key={item.id}>
                  <label>
                    <input type="checkbox" checked={checked} onChange={() => onToggle(item.id)} />
                    <span>{checked ? "✓" : String(index + 1).padStart(2, "0")}</span>
                    <div><b>{item.text}</b><small>{item.detail}</small></div>
                  </label>
                  {item.screenshot && <img src={item.screenshot} alt={`Подготовка home-helper: шаг ${index + 1}`} />}
                  <div className="preparation-guide-copy">
                    <b>Сделайте по порядку</b>
                    <ol>{item.steps.map((step) => <li key={step}>{step}</li>)}</ol>
                  </div>
                  {item.example && <div className="preparation-example"><b>Пример</b><pre>{item.example}</pre></div>}
                  <p className="preparation-done"><strong>✓ Готово, если:</strong> {item.doneWhen}</p>
                </article>
              );
            }
            return (
              <label key={item.id} className={checked ? "checked" : ""}>
                <input type="checkbox" checked={checked} onChange={() => onToggle(item.id)} />
                <span>{checked ? "✓" : String(index + 1).padStart(2, "0")}</span>
                <div><b>{item.text}</b><small>{item.detail}</small></div>
              </label>
            );
          })}
        </div>
        <aside className="privacy-note"><span>!</span><p><b>Важно</b> Не называйте пароли, коды из СМС, токены, реквизиты и паспортные данные. Если проекту понадобится существующий документ или фотография, Codex отдельно объяснит, какую безопасную копию прикрепить.</p></aside>
        <button type="button" className="primary-button preparation-start" disabled={!allChecked} onClick={onStartReal}>Готова отвечать Codex — начать квест →</button>
      </section>
    );
  }

  return (
    <section className="preparation-card mode-choice" aria-label="Выбор данных для квеста">
      <p className="section-kicker">Шаг 0 · Перед началом</p>
      <h2>На каких данных будем работать?</h2>
      <p className="preparation-lead">Выбор сохранится только для квеста «{project.title}». В другом проекте мы спросим снова.</p>
      <div className="mode-options">
        <button type="button" onClick={onChooseDemo} aria-label="Работать на вымышленных данных">
          <span className="mode-option-icon" aria-hidden="true"><DashboardIcon name="fairy" /></span><span className="mode-option-meta">Легче для первого раза</span><span className="mode-option-title">На вымышленных</span><span className="mode-option-copy">Все примеры уже готовы. Можно сразу пройти весь путь проекта и ни о чём не переживать.</span><span className="mode-option-action">Начать тренировку →</span>
        </button>
        <button type="button" onClick={onChooseReal} aria-label="Работать на реальных данных">
          <span className="mode-option-icon" aria-hidden="true"><DashboardIcon name="projects" /></span><span className="mode-option-meta">Для себя или клиента</span><span className="mode-option-title">На реальных</span><span className="mode-option-copy">Сначала вспомним нужные ответы, затем Codex задаст вопросы и сам создаст всё остальное.</span><span className="mode-option-action">Открыть чек-лист →</span>
        </button>
      </div>
      <p className="choice-note">Не уверены? Выбирайте вымышленные данные — проект всё равно получится полноценным.</p>
    </section>
  );
}
