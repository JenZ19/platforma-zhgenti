/* eslint-disable @next/next/no-img-element -- generated lesson screens are fixed-size local teaching assets */

import type { ProjectDefinition } from "../content/types";
import { getPreparationProfile } from "../content/preparation";
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
  const profile = getPreparationProfile(project.slug);
  const checklist = buildRealDataChecklist(project, mobile ? "mobile" : "desktop");
  const allChecked = checklist.every((item) => preparation.checked.includes(item.id));
  const codexCreatesEverything = project.slug === "family-expenses";

  if (preparation.mode === "real") {
    return (
      <section className="preparation-card real-checklist" aria-label="Подготовка реальных данных">
        <button type="button" className="preparation-back" onClick={onBack}>← Изменить выбор</button>
        <p className="section-kicker">Шаг 0 · Реальный проект</p>
        <h2>{codexCreatesEverything ? "Ничего заранее создавать не нужно" : "Сначала соберите материалы"}</h2>
        <p className="preparation-lead">
          {codexCreatesEverything
            ? "Codex сам создаст папку, файлы и структуру проекта. Вы только вспомните несколько простых ответов — назвать их можно будет голосом или текстом."
            : mobile
              ? <>Не нужно делать всё идеально. Соберите безопасные копии для комнаты <b>{profile.folderName}</b> в Telegram и отмечайте готовое.</>
              : <>Не нужно делать всё идеально. Просто положите безопасные копии в папку <b>{profile.folderName}</b> и отмечайте готовое.</>}
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
        <aside className="privacy-note"><span>!</span><p><b>Важно</b>{codexCreatesEverything ? " Не называйте номера карт и счетов, коды из СМС, пароли и точные данные членов семьи. Для сервиса нужны только сумма, дата и категория расхода." : mobile ? " Codex получает только материалы из личной комнаты проекта. Оригиналы, пароли и закрытые документы в Telegram не отправляем." : " Codex получает только то, что лежит в этой папке. Оригиналы, пароли и закрытые документы туда не кладём."}</p></aside>
        <button type="button" className="primary-button preparation-start" disabled={!allChecked} onClick={onStartReal}>{codexCreatesEverything ? "Готова отвечать Codex — начать квест →" : "Материалы готовы — начать квест →"}</button>
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
          <span>✦</span><small>Легче для первого раза</small><h3>На вымышленных</h3><p>Все примеры уже готовы. Можно сразу идти по 17 уровням и ни о чём не переживать.</p><b>Начать тренировку →</b>
        </button>
        <button type="button" onClick={onChooseReal} aria-label="Работать на реальных данных">
          <span>◇</span><small>Для себя или клиента</small><h3>На реальных</h3><p>Сначала соберём материалы по чек-листу, затем Codex будет работать с вашей папкой.</p><b>Открыть чек-лист →</b>
        </button>
      </div>
      <p className="choice-note">Не уверены? Выбирайте вымышленные данные — проект всё равно получится полноценным.</p>
    </section>
  );
}
