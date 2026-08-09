"use client";

import { getBotPrototypeSpec } from "../content/bot-prototypes";
import type { ProjectDefinition } from "../content/types";

function PlannerPrototype({ detail }: { detail: boolean }) {
  const tasks = [
    ["Закончить презентацию", "Главное"],
    ["Позвонить врачу", "11:30"],
    ["Купить продукты", "После работы"],
    ["30 минут на себя", "Вечером"],
  ];
  return <div className="proto-planner"><div className="proto-focus"><small>ГЛАВНОЕ ДЕЛО</small><b>Закончить презентацию</b><span>✓ готово</span></div><div className="proto-task-list">{tasks.slice(0, detail ? 4 : 2).map(([task, meta], index) => <div key={task} className={index < 3 ? "done" : ""}><i>{index < 3 ? "✓" : ""}</i><p><b>{task}</b><small>{meta}</small></p></div>)}</div><footer><span>Утро</span><b>Сегодня</b><span>Итог</span></footer></div>;
}

function IdeasPrototype({ detail }: { detail: boolean }) {
  return <div className="proto-ideas"><nav><button>Все идеи</button><button>Контент</button><button>Семья</button></nav><div className="idea-search">⌕ Найти идею…</div><section><article className="lavender"><small>КОНТЕНТ</small><b>Рилс про утреннюю рутину</b><span>Сохранено сегодня</span></article><article className="peach"><small>ПОДАРКИ</small><b>Собрать семейную фотокнигу</b><span>На потом</span></article>{detail && <article className="mint"><small>ПОЕЗДКИ</small><b>Маршрут на выходные</b><span>Новая</span></article>}<button className="random-idea">✦ Случайная идея</button></section></div>;
}

function ExpensesPrototype({ detail }: { detail: boolean }) {
  return <div className="proto-expenses"><div className="expense-total"><small>ЗА АВГУСТ</small><b>5 360 ₽</b><span>Сегодня: 3 450 ₽</span></div><div className="expense-chart"><div className="expense-ring"><b>64%</b><small>продукты</small></div><section><p><i className="coral" /><span>Продукты</span><b>3 450 ₽</b></p><p><i className="gold" /><span>Дом</span><b>1 290 ₽</b></p>{detail && <p><i className="sage" /><span>Другое</span><b>620 ₽</b></p>}</section></div><button>＋ Записать расход</button></div>;
}

function RecipePrototype({ detail }: { detail: boolean }) {
  return <div className="proto-recipe"><div className="recipe-hero"><span>🍝</span><div><small>УЖИН ДО 30 МИНУТ</small><h4>Паста с овощами</h4><p><b>25 минут</b> · 2 порции</p></div></div><div className="recipe-body"><section><small>ЧТО НУЖНО</small>{["Паста — 200 г", "Томаты — 3 шт.", "Кабачок — 1 шт.", "Сыр — 60 г"].slice(0, detail ? 4 : 2).map((item) => <p key={item}>✓ {item}</p>)}</section><aside><small>ШАГИ</small><b>1</b><p>Нарежьте овощи и поставьте пасту.</p><button>В покупки →</button></aside></div></div>;
}

function HabitsPrototype({ detail }: { detail: boolean }) {
  const days = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];
  return <div className="proto-habits"><div className="habit-card"><span>☀</span><small>СЕГОДНЯШНЯЯ ПРИВЫЧКА</small><h4>Прогулка 20 минут</h4><button>✓ Сделано</button></div><div className="habit-week"><header><b>Эта неделя</b><span>Серия: 4 дня</span></header><div>{days.map((day, index) => <span key={day} className={index < (detail ? 4 : 2) ? "checked" : ""}><i>{index < (detail ? 4 : 2) ? "✓" : ""}</i><small>{day}</small></span>)}</div><p>Любая отметка — уже забота о себе. Без штрафов и чувства вины.</p></div></div>;
}

function FamilyPrototype({ detail }: { detail: boolean }) {
  const events = [
    ["08:30", "Взять форму", "Мама"],
    ["17:00", "Купить корм", "Алексей"],
    ["19:30", "Позвонить бабушке", "Вся семья"],
  ];
  return <div className="proto-family"><header><button>Сегодня</button><span>12 августа · вторник</span><div>М А ♡</div></header><section>{events.slice(0, detail ? 3 : 2).map(([time, title, who], index) => <article key={title}><time>{time}</time><i className={`family-dot dot-${index}`} /><div><b>{title}</b><small>{who}</small></div><button>{index === 0 ? "✓" : "Готово"}</button></article>)}</section><footer><b>＋ Новое напоминание</b><span>Ближайшие · Неделя</span></footer></div>;
}

function LeadPrototype({ detail }: { detail: boolean }) {
  return <div className="proto-lead"><div className="lead-person"><span>А</span><div><small>НОВАЯ ЗАЯВКА</small><h4>Анна</h4><p>Консультация по стратегии</p></div><b>НОВАЯ</b></div><div className="lead-answers">{[["1", "Какая услуга?", "Стратегическая консультация"], ["2", "Когда удобно?", "На этой неделе"], ["3", "Как связаться?", "Telegram подтверждён"]].slice(0, detail ? 3 : 2).map(([n, q, a]) => <section key={n}><span>{n}</span><p><small>{q}</small><b>{a}</b></p><i>✓</i></section>)}</div><footer><span>Заявка собрана</span><b>Передать владельцу →</b></footer></div>;
}

function BookingPrototype({ detail }: { detail: boolean }) {
  const days = ["12", "13", "14", "15", "16"];
  return <div className="proto-booking"><header><small>АВГУСТ 2026</small><div>{days.map((day) => <span key={day} className={day === "15" ? "active" : ""}><small>{day === "15" ? "ПТ" : "·"}</small><b>{day}</b></span>)}</div></header><section><small>КОНСУЛЬТАЦИЯ · 60 МИНУТ</small><h4>Выберите свободное время</h4><div className="booking-slots">{["10:00", "12:30", "14:00", "16:30"].slice(0, detail ? 4 : 3).map((time) => <button key={time} className={time === "14:00" ? "selected" : ""}>{time}</button>)}</div><article><span>✓</span><p><b>15 августа, 14:00</b><small>Время выбрано, осталось подтвердить</small></p></article></section></div>;
}

function QuestionnairePrototype({ detail }: { detail: boolean }) {
  return <div className="proto-questionnaire"><header><span>Короткий бриф</span><b>4 из 6</b></header><div className="brief-progress"><i /></div><main><small>ВОПРОС 4</small><h4>Какой результат вы хотите получить?</h4><div className="brief-answer">Хочу понятный сайт услуги и рабочую форму заявки.</div>{detail && <div className="brief-options"><button>Сайт</button><button>Бот</button><button>Пока не знаю</button></div>}<button className="brief-next">Следующий вопрос →</button></main><footer>Ответ сохранён автоматически ✓</footer></div>;
}

function QuizPrototype({ detail }: { detail: boolean }) {
  return <div className="proto-quiz"><header><span>3 / 4</span><div><i /></div><b>75%</b></header><main><small>ВОПРОС 3</small><h4>Какой формат вам ближе?</h4><div>{["Собираю всё сама", "Хочу понятный шаблон", "Нужна помощь под ключ"].slice(0, detail ? 3 : 2).map((answer, index) => <button key={answer} className={index === 1 ? "chosen" : ""}><span>{String.fromCharCode(65 + index)}</span>{answer}<i>{index === 1 ? "✓" : ""}</i></button>)}</div></main><footer><span>Ваш будущий результат</span><b>Исследователь ✦</b></footer></div>;
}

function MaterialsPrototype({ detail }: { detail: boolean }) {
  const files = [["PDF", "Памятка.pdf", "2,4 МБ"], ["DOC", "Рабочая тетрадь", "8 страниц"], ["VID", "Мини-урок", "12 минут"]];
  return <div className="proto-materials"><header><div><small>ВАША БИБЛИОТЕКА</small><h4>Полезные материалы</h4></div><span>3 файла</span></header><section>{files.slice(0, detail ? 3 : 2).map(([type, title, meta], index) => <article key={title}><i className={`file-${index}`}>{type}</i><p><b>{title}</b><small>{meta} · доступ открыт</small></p><button>↓</button></article>)}</section><footer><span>✓ Условие выполнено</span><b>Скачать всё</b></footer></div>;
}

function FaqPrototype({ detail }: { detail: boolean }) {
  return <div className="proto-faq"><aside><small>ТЕМЫ</small>{["Оплата", "Доступ", "Формат", "Поддержка"].slice(0, detail ? 4 : 3).map((topic, index) => <button key={topic} className={index === 0 ? "active" : ""}>{topic}<span>›</span></button>)}</aside><main><small>БЫСТРЫЙ ОТВЕТ</small><h4>Как проходит оплата?</h4><p>Вы переходите на защищённую страницу оплаты. После подтверждения доступ приходит автоматически.</p><div><span>Это помогло?</span><button>Да</button><button>Нет</button></div><footer>Не нашли ответ? <b>Связаться с человеком →</b></footer></main></div>;
}

function ConsultantPrototype({ detail }: { detail: boolean }) {
  return <div className="proto-consultant"><header><small>ПОДБОР УСЛУГИ</small><span>Шаг 3 из 3</span></header><div className="consultant-route"><span className="done">1<i>✓</i><small>Задача</small></span><b /><span className="done">2<i>✓</i><small>Формат</small></span><b /><span className="active">3<i>✦</i><small>Решение</small></span></div><main><span>РЕКОМЕНДАЦИЯ</span><h4>Вводная консультация</h4><p>Подойдёт, чтобы разобрать задачу и получить понятный план следующих шагов.</p>{detail && <ul><li>60 минут онлайн</li><li>Итоговый план</li><li>Вопросы эксперту</li></ul>}<button>Оставить заявку →</button></main></div>;
}

function PrototypeBody({ slug, detail }: { slug: string; detail: boolean }) {
  switch (slug) {
    case "planner-bot": return <PlannerPrototype detail={detail} />;
    case "idea-bot": return <IdeasPrototype detail={detail} />;
    case "expense-bot": return <ExpensesPrototype detail={detail} />;
    case "recipe-bot": return <RecipePrototype detail={detail} />;
    case "habit-bot": return <HabitsPrototype detail={detail} />;
    case "family-reminder-bot": return <FamilyPrototype detail={detail} />;
    case "lead-bot": return <LeadPrototype detail={detail} />;
    case "booking-bot": return <BookingPrototype detail={detail} />;
    case "questionnaire-bot": return <QuestionnairePrototype detail={detail} />;
    case "quiz-bot": return <QuizPrototype detail={detail} />;
    case "material-delivery-bot": return <MaterialsPrototype detail={detail} />;
    case "faq-bot": return <FaqPrototype detail={detail} />;
    case "consultant-bot": return <ConsultantPrototype detail={detail} />;
    default: getBotPrototypeSpec(slug); return null;
  }
}

export function BotPrototypeScene({ project, step }: { project: ProjectDefinition; step: number }) {
  const spec = getBotPrototypeSpec(project.slug);
  return <div className={`bot-prototype-stage bot-product--${spec.theme}`} data-prototype-marker={spec.marker}>
    <div className="bot-product">
      <header className="bot-product-header"><div className="bot-product-avatar">{project.symbol}</div><div><b>{project.title}</b><small>готовый бот · онлайн</small></div><span>•••</span></header>
      <main><PrototypeBody slug={project.slug} detail={step >= 8} /></main>
      <footer className="bot-product-nav"><span className="active">Главная</span><span>{project.features[1]}</span><span>{project.features[3]}</span></footer>
    </div>
    <aside className="bot-product-result"><small>{spec.eyebrow}</small><h3>{spec.headline}</h3><div><b>{spec.metric}</b><span>{spec.status}</span></div><p>По экрану сразу видно, какую задачу решает этот бот. Внутри — только безопасные проверочные данные.</p><span className="bot-product-ready">✓ Прототип готов</span></aside>
  </div>;
}
