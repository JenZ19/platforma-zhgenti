import type { ProjectDefinition } from "../content/types";
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
  const checklist = buildRealDataChecklist(project).map((item) => item.id === "folder" && mobile ? {
    ...item,
    text: `Отдельная комната «${project.slug}» в Telegram только для этого проекта`,
    detail: "Отправляйте сюда только безопасные копии материалов. Оригиналы, пароли и закрытые документы оставьте у себя.",
  } : item);
  const allChecked = checklist.every((item) => preparation.checked.includes(item.id));

  if (preparation.mode === "real") {
    return (
      <section className="preparation-card real-checklist" aria-label="Подготовка реальных данных">
        <button type="button" className="preparation-back" onClick={onBack}>← Изменить выбор</button>
        <p className="section-kicker">Шаг 0 · Реальный проект</p>
        <h2>Сначала соберите материалы</h2>
        <p className="preparation-lead">{mobile ? <>Не нужно делать всё идеально. Соберите безопасные копии для комнаты <b>{project.slug}</b> в Telegram и отмечайте готовое.</> : <>Не нужно делать всё идеально. Просто положите безопасные копии в папку <b>{project.slug}</b> и отмечайте готовое.</>}</p>
        <div className="checklist-progress"><span>{preparation.checked.length} из {checklist.length}</span><i><b style={{ width: `${Math.round((preparation.checked.length / checklist.length) * 100)}%` }} /></i></div>
        <div className="preparation-list">
          {checklist.map((item, index) => {
            const checked = preparation.checked.includes(item.id);
            return (
              <label key={item.id} className={checked ? "checked" : ""}>
                <input type="checkbox" checked={checked} onChange={() => onToggle(item.id)} />
                <span>{checked ? "✓" : String(index + 1).padStart(2, "0")}</span>
                <div><b>{item.text}</b><small>{item.detail}</small></div>
              </label>
            );
          })}
        </div>
        <aside className="privacy-note"><span>!</span><p><b>Важно</b>{mobile ? " Codex получает только материалы из личной комнаты проекта. Оригиналы, пароли и закрытые документы в Telegram не отправляем." : " Codex получает только то, что лежит в этой папке. Оригиналы, пароли и закрытые документы туда не кладём."}</p></aside>
        <button type="button" className="primary-button preparation-start" disabled={!allChecked} onClick={onStartReal}>Папка готова — начать квест →</button>
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
