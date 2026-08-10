import type { ProjectDefinition, QuestGuideFrame } from "../content/types";
import { OriginalServiceScene } from "./OriginalServiceScene";

function pointerText(frame: QuestGuideFrame) {
  if (/проверь|свер|убедитесь|дождитесь/i.test(`${frame.title} ${frame.action}`)) return "ПРОВЕРЬТЕ ЗДЕСЬ";
  if (/встав|напиш|введ|отправ/i.test(`${frame.title} ${frame.action}`)) return "ВСТАВЬТЕ СЮДА";
  return "НАЖМИТЕ СЮДА";
}

function Pointer({ frame }: { frame: QuestGuideFrame }) {
  return <div className="original-guide-pointer"><span>{pointerText(frame)}</span><b>↓</b><strong>{frame.target}</strong></div>;
}

function PaletteGuide() {
  const palettes = [
    ["Мятная свежесть", "#F3F8F5", "#2F6B5D"],
    ["Пудровое тепло", "#FFF5F4", "#8E4F5B"],
    ["Лавандовый вечер", "#F7F3FC", "#66517F"],
  ];
  return (
    <section className="original-guide-palette">
      <header><small>ШАГ 07</small><b>Выберите цветовую гамму</b><span>Цвета вашего проекта, не сайта курса</span></header>
      <div>
        {palettes.map(([name, background, accent], index) => (
          <article className={index === 1 ? "selected" : ""} key={name}>
            <i style={{ background: `linear-gradient(135deg, ${background} 0 50%, ${accent} 50% 100%)` }} />
            <b>{name}</b>
            <small>{index === 1 ? "выбрано ✓" : "нажмите"}</small>
          </article>
        ))}
      </div>
      <button>＋ Собрать свою гамму</button>
      <footer><small>ЖИВОЙ ПРЕДПРОСМОТР</small><b>Ваше название проекта</b><span>Кнопки · карточки · текст</span></footer>
    </section>
  );
}

function AcademyGuide({ project, frame, step }: { project: ProjectDefinition; frame: QuestGuideFrame; step: number }) {
  return <div className="original-guide-app original-guide-academy"><header><span>S</span><b>Академия квестов</b><small>{project.title}</small></header><aside><b>КАРТА КВЕСТА</b>{[step - 1, step, step + 1].filter((item) => item > 0 && item < 18).map((item) => <div key={item} className={item === step ? "active" : ""}><i>{String(item).padStart(2, "0")}</i><span>{item === step ? frame.title : `Соседний уровень ${item}`}</span></div>)}</aside><main><small>УРОВЕНЬ {String(step).padStart(2, "0")} · ТЕКСТ УЖЕ ГОТОВ</small><h3>{frame.title}</h3><p>{frame.action}</p>{step === 2 ? <PaletteGuide /> : frame.exactText && <div className="original-guide-command"><span>ГОТОВАЯ КОМАНДА</span><p>{frame.exactText.slice(0, 370)}…</p><button>Скопировать команду</button></div>}<Pointer frame={frame}/></main></div>;
}

function CodexGuide({ project, frame, step }: { project: ProjectDefinition; frame: QuestGuideFrame; step: number }) {
  const showResult = frame.id === 3 || /дождитесь|проверь|получ/i.test(`${frame.title} ${frame.action}`);
  const beforeFiles = ["family-expenses", "planner", "idea-vault", "child-schedule"].includes(project.slug) && step === 3;
  return <div className="original-guide-app original-guide-codex"><aside><b>⌘ Codex</b><button>＋ Новая задача</button>{beforeFiles ? <><small>СЕЙЧАС</small><strong>Новый проект — пока без файлов</strong><span className="active">◉ Короткий разговор</span><span>1 вопрос за раз</span><span>Ответ голосом или текстом</span></> : <><button className="open">▱ Открыть папку</button><small>ПРОЕКТ</small><strong>⌄ {project.slug}</strong><span className="active">▤ паспорт-проекта.txt</span><span>▤ данные.csv</span><span>▤ правила.txt</span></>}</aside><main><header><b>{beforeFiles ? "Новый проект" : project.slug}</b><span>{beforeFiles ? "Codex ждёт ваш первый ответ" : "Рабочая папка открыта ✓"}</span></header><section>{showResult ? <div className="original-guide-answer"><small>✦ CODEX ЗАКОНЧИЛ</small><h3>{frame.doneWhen}</h3><p>Проверено внутри проекта «{project.title}».</p><div><i>✓</i><span>Уровень {step} готов к сверке</span></div></div> : <div className="original-guide-message"><small>ВАША КОМАНДА</small><p>{frame.exactText?.slice(0, 480) || frame.action}</p></div>}</section><footer><span>{frame.exactText ? "Команда вставлена — проверьте текст перед отправкой" : "Напишите задачу для Codex…"}</span><button>↑</button></footer><Pointer frame={frame}/></main></div>;
}

function PreviewGuide({ project, frame, step }: { project: ProjectDefinition; frame: QuestGuideFrame; step: number }) {
  return <div className="original-guide-preview"><div className="original-guide-browser"><span>● ● ●</span><b>{project.title} · предпросмотр</b><small>localhost:3000</small></div><div className="original-guide-prototype"><OriginalServiceScene slug={project.slug} step={step}/></div><Pointer frame={frame}/></div>;
}

function GuideVisual({ project, frame, step }: { project: ProjectDefinition; frame: QuestGuideFrame; step: number }) {
  if (frame.scene === "academy") return <AcademyGuide project={project} frame={frame} step={step}/>;
  if (frame.scene === "codex") return <CodexGuide project={project} frame={frame} step={step}/>;
  return <PreviewGuide project={project} frame={frame} step={step}/>;
}

export function OriginalQuestGuideScene({ project, frame, step, mode }: { project: ProjectDefinition; frame: QuestGuideFrame; step: number; mode: "real" | "demo" }) {
  return <main id="capture-guide-scene" className="guide-capture-canvas original-guide-canvas" data-original-guide={project.slug}><header><div className="capture-brand"><span>S</span> SUBMARINE</div><div>{project.slug.toUpperCase()} · УРОВЕНЬ {String(step).padStart(2, "0")} · КАДР {String(frame.id).padStart(2, "0")}</div></header><section className="guide-capture-copy"><small>{mode === "real" ? "ВАШ ПРОЕКТ НА РЕАЛЬНЫХ ДАННЫХ" : "БЕЗОПАСНАЯ ТРЕНИРОВКА"} · {frame.app.toUpperCase()}</small><h1>{frame.title}</h1><p>{frame.action}</p><div><b>✓ Готово, если:</b> {frame.doneWhen}</div></section><section className="guide-capture-visual"><GuideVisual project={project} frame={frame} step={step}/></section></main>;
}
