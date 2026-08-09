import type { QuestGuideFrame, QuestGuideScene } from "../content/types";
import type { PreparationItem } from "../lib/preparation";

function pointerLabel(frame: QuestGuideFrame) {
  if (/жд|не нажимайте/i.test(frame.action)) return "ЖДИТЕ ЗДЕСЬ";
  if (/напечат|встав|введ|запиш|допиш/i.test(frame.action)) return "ПИШИТЕ СЮДА";
  if (/проверь|посмотр|найд|убедитесь|прочитайте/i.test(frame.action)) return "ПРОВЕРЬТЕ ЗДЕСЬ";
  return "НАЖМИТЕ СЮДА";
}

function Target({ frame }: { frame: QuestGuideFrame }) {
  return (
    <div className="guide-capture-target-wrap">
      <div className="guide-capture-pointer"><span>{pointerLabel(frame)}</span><b>↓</b></div>
      <div className="guide-capture-target">{frame.target}</div>
    </div>
  );
}

function Window({ title, children, scene }: { title: string; children: React.ReactNode; scene: QuestGuideScene }) {
  return (
    <div className={`guide-app-window guide-app-${scene}`}>
      <div className="guide-app-bar"><span>● ● ●</span><b>{title}</b><i>— □ ×</i></div>
      {children}
    </div>
  );
}

function FinderMock({ frame }: { frame: QuestGuideFrame }) {
  return (
    <Window title={frame.app} scene="finder">
      <div className="guide-finder">
        <aside><b>Избранное</b><span>Недавние</span><span>Рабочий стол</span><span className="selected">Документы</span><span>Загрузки</span></aside>
        <main>
          <header><button>‹</button><button>›</button><b>Документы</b><button className="new-folder">＋ Новая папка</button></header>
          <div className="finder-files"><div><i>▰</i><span>Семья</span></div><div className="active"><i>▰</i><span>home-helper</span></div><div><i>▰</i><span>Фото</span></div></div>
          <Target frame={frame} />
        </main>
      </div>
    </Window>
  );
}

function CodexMock({ frame }: { frame: QuestGuideFrame }) {
  const showPassport = /паспорт проекта/i.test(frame.target) || /дождитесь паспорта/i.test(frame.title);
  const showPrompt = /поле сообщения|отправ/i.test(frame.target) || /встав|отправ/i.test(frame.title);
  const material = /учебн/i.test(`${frame.action} ${frame.target}`) ? "учебные-дела.txt" : "мои-дела.txt";
  return (
    <Window title="Codex · home-helper" scene="codex">
      <div className="guide-codex">
        <aside>
          <div className="codex-logo">⌘ <b>Codex</b></div>
          <button>＋ Новая задача</button>
          <button className="open-folder">▱ Открыть папку</button>
          <small>ПРОЕКТ</small>
          <strong>⌄ home-helper</strong>
          <span className="active">▤ {material}</span><span>▤ оформление.txt</span><span>▤ можно-показывать.txt</span>
        </aside>
        <main>
          <header><b>home-helper</b><span>Локальная папка ✓</span></header>
          <section className="codex-chat">
            {showPassport ? <div className="passport-answer"><small>✦ CODEX</small><h3>Паспорт проекта</h3><p>1. Для кого — моя семья</p><p>2. Результат — понятные домашние дела</p><p>3. Данные — файл {material}</p><p>4. Функции — дела, покупки, повторы</p><p>5. Ограничения — без личных данных</p></div> : <div className="codex-file"><b>{material}</b><p>Что сделать | Где | Кто | Как часто</p><p>Купить продукты | Кухня | Я | каждую субботу</p><p>Сменить бельё | Спальня | не важно | раз в неделю</p><p>Полить цветы | Гостиная | Я | дважды в неделю</p><p>Заказать воду | Кухня | не важно | раз в месяц</p><p>Разобрать шкаф | Спальня | не важно | один раз</p></div>}
          </section>
          <div className={`codex-input ${showPrompt ? "active" : ""}`}><span>{frame.exactText ? frame.exactText.slice(0, 105) : "Напишите задачу для Codex…"}</span><button>↑</button></div>
          <Target frame={frame} />
        </main>
      </div>
    </Window>
  );
}

function AcademyMock({ frame }: { frame: QuestGuideFrame }) {
  return (
    <Window title="Академия квестов · Помощник для домашних дел" scene="academy">
      <div className="guide-academy">
        <aside><span>S</span><b>Уровень 03</b><small>Паспорт проекта</small><i>3 из 6 кадров</i></aside>
        <main><small>ТЕКСТ УЖЕ ГОТОВ</small><h3>{frame.title}</h3><p>{frame.exactText || "Готовая команда находится в тёмном блоке. Придумывать текст не нужно."}</p><button>Скопировать анкету</button><Target frame={frame} /></main>
      </div>
    </Window>
  );
}

function PreviewMock({ frame }: { frame: QuestGuideFrame }) {
  return (
    <Window title="Помощник для домашних дел · предпросмотр" scene="preview">
      <div className="guide-preview">
        <header><div><small>НАШ ДОМ</small><b>Помощник для домашних дел</b></div><button>＋ Добавить дело</button></header>
        <nav><span className="active">Дела</span><span>Покупки</span><span>Повторы</span><span>Семейный обзор</span></nav>
        <main><section><h3>Сегодня дома</h3><p>Три коротких дела — и можно отдыхать</p><article><i>○</i><div><b>Купить продукты</b><small>Кухня · сегодня</small></div><span>•••</span></article><article><i>○</i><div><b>Полить цветы</b><small>Гостиная · сегодня</small></div><span>•••</span></article></section><aside><small>НОВОЕ ДЕЛО</small><label>Что сделать<input value="Купить продукты" readOnly /></label><label>Где<input value="Кухня" readOnly /></label><button>Сохранить дело</button></aside></main>
        <Target frame={frame} />
      </div>
    </Window>
  );
}

function PublishMock({ frame }: { frame: QuestGuideFrame }) {
  return (
    <Window title="Публикация проекта" scene="publish">
      <div className="guide-publish"><span>✦</span><small>ПРОЕКТ ГОТОВ</small><h3>Помощник для домашних дел</h3><div className="guide-publish-address"><small>Адрес проекта</small><div>https://home-helper.submarine.app</div></div><button>Опубликовать</button><p>После публикации появится безопасная ссылка</p><Target frame={frame} /></div>
    </Window>
  );
}

function PortfolioMock({ frame }: { frame: QuestGuideFrame }) {
  return (
    <Window title="Моё портфолио" scene="portfolio">
      <div className="guide-portfolio"><header><b>Портфолио</b><button>＋ Добавить проект</button></header><article><span>СЕРВИС ДЛЯ СЕМЬИ</span><h3>Помощник для домашних дел</h3><p>Дела, покупки, повторы и семейный обзор в одном спокойном сервисе.</p><div><i>первый экран</i><i>форма дела</i><i>семейный обзор</i></div><button>Открыть проект ↗</button></article><Target frame={frame} /></div>
    </Window>
  );
}

function SceneVisual({ frame }: { frame: QuestGuideFrame }) {
  if (frame.scene === "finder") return <FinderMock frame={frame} />;
  if (frame.scene === "codex") return <CodexMock frame={frame} />;
  if (frame.scene === "academy") return <AcademyMock frame={frame} />;
  if (frame.scene === "publish") return <PublishMock frame={frame} />;
  if (frame.scene === "portfolio") return <PortfolioMock frame={frame} />;
  return <PreviewMock frame={frame} />;
}

export function HomeHelperGuideScene({ frame, step, mode }: { frame: QuestGuideFrame; step: number; mode: "real" | "demo" }) {
  return (
    <main id="capture-guide-scene" className="guide-capture-canvas">
      <header><div className="capture-brand"><span>S</span> SUBMARINE</div><div>HOME-HELPER · УРОВЕНЬ {String(step).padStart(2, "0")} · КАДР {String(frame.id).padStart(2, "0")}</div></header>
      <section className="guide-capture-copy"><small>{mode === "real" ? "ВАШ РЕАЛЬНЫЙ ПРОЕКТ" : "ГОТОВЫЙ ПРИМЕР"} · ОТКРОЙТЕ: {frame.app.toUpperCase()}</small><h1>{frame.title}</h1><p>{frame.action}</p><div><b>✓ Готово, если:</b> {frame.doneWhen}</div></section>
      <section className="guide-capture-visual"><SceneVisual frame={frame} /></section>
    </main>
  );
}

function PreparationVisual({ item, index }: { item: PreparationItem; index: number }) {
  const prepTargets = [
    "Кнопка «Новая папка»",
    "Кнопка «Сохранить»",
    "Пустое место между знаками |",
    "Кнопка «Сохранить»",
    "Кнопка «Сохранить»",
    "Кнопка «Сохранить»",
    "Строка с личными данными",
    "Безопасная папка home-helper",
  ];
  const frame: QuestGuideFrame = {
    id: index,
    title: item.text,
    app: index === 1 || index === 8 ? "Finder или Проводник" : "Текстовый редактор",
    action: item.steps?.at(-1) || item.detail,
    after: item.detail,
    doneWhen: item.doneWhen || item.detail,
    fallback: "Вернитесь к инструкции под картинкой и повторите действия по одному.",
    screenshot: item.screenshot || "",
    scene: index === 1 || index === 8 ? "finder" : "codex",
    target: prepTargets[index - 1],
    exactText: item.example,
  };
  if (index === 1 || index === 8) return <FinderMock frame={frame} />;
  return (
    <Window title={index === 2 || index === 3 ? "мои-дела.txt" : item.text.replace(/[«»]/g, "")} scene="codex">
      <div className="guide-text-editor"><aside><b>home-helper</b><span className="active">▤ {index <= 3 ? "мои-дела.txt" : `шаг-${index}.txt`}</span><span>▤ оформление.txt</span><span>▤ можно-показывать.txt</span></aside><main><header>{index <= 3 ? "мои-дела.txt" : item.text}</header><pre>{item.example || item.steps?.join("\n")}</pre><button>Сохранить</button><Target frame={frame} /></main></div>
    </Window>
  );
}

export function HomeHelperPreparationScene({ item, index }: { item: PreparationItem; index: number }) {
  return (
    <main id="capture-guide-scene" className="guide-capture-canvas">
      <header><div className="capture-brand"><span>S</span> SUBMARINE</div><div>HOME-HELPER · ПОДГОТОВКА · ШАГ {String(index).padStart(2, "0")}</div></header>
      <section className="guide-capture-copy"><small>СНАЧАЛА ПОДГОТОВЬТЕ МАТЕРИАЛЫ</small><h1>{item.text}</h1><p>{item.steps?.join(" → ")}</p><div><b>✓ Готово, если:</b> {item.doneWhen}</div></section>
      <section className="guide-capture-visual"><PreparationVisual item={item} index={index} /></section>
    </main>
  );
}
