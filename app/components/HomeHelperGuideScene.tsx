import type { QuestGuideFrame, QuestGuideScene } from "../content/types";

function pointerLabel(frame: QuestGuideFrame) {
  if (/жд|не нажимайте/i.test(frame.action)) return "ЖДИТЕ ЗДЕСЬ";
  if (/напечат|встав|введ|запиш|допиш|ответ|назов/i.test(frame.action)) return "ПИШИТЕ СЮДА";
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
  const showConversation = /вопрос|ответ|сводк|обычными словами|всё верно|разговор/i.test(`${frame.title} ${frame.action} ${frame.target}`);
  const showProject = /проект|границ|создан|название home-helper/i.test(`${frame.title} ${frame.action} ${frame.target}`);
  return (
    <Window title="Codex · home-helper" scene="codex">
      <div className="guide-codex">
        <aside>
          <div className="codex-logo">⌘ <b>Codex</b></div>
          <button>＋ Новая задача</button>
          <button className="open-folder">▱ Открыть проект</button>
          <small>ПРОЕКТ</small>
          <strong>⌄ home-helper</strong>
          <span className="active">✦ Создан Codex автоматически</span><span>⌁ Рабочая версия</span><span>⌁ Безопасные данные</span>
        </aside>
        <main>
          <header><b>home-helper</b><span>Правильный проект ✓</span></header>
          <section className="codex-chat">
            {showPassport ? (
              <div className="passport-answer"><small>✦ CODEX</small><h3>Паспорт проекта</h3><p>1. Для кого — моя семья</p><p>2. Результат — понятные домашние дела</p><p>3. Данные — только подтверждённые ответы</p><p>4. Функции — дела, покупки, повторы</p><p>5. Ограничения — без личных данных</p></div>
            ) : showConversation ? (
              <div className="passport-answer"><small>✦ CODEX</small><h3>Один вопрос за раз</h3><p>Какое домашнее дело хотите добавить первым?</p><p><b>Вы:</b> Купить продукты. Можно голосом или текстом.</p><p>Где его удобнее выполнять?</p></div>
            ) : showProject ? (
              <div className="passport-answer"><small>✦ CODEX</small><h3>Проект home-helper создан</h3><p>✓ Рабочее место подготовлено автоматически</p><p>✓ Соседние проекты не затронуты</p><p>✓ Можно продолжать</p></div>
            ) : (
              <div className="passport-answer"><small>✦ CODEX</small><h3>Работаю над home-helper</h3><p>Выполняю только текущую команду.</p><p>После проверки покажу результат и ссылку предпросмотра.</p></div>
            )}
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
