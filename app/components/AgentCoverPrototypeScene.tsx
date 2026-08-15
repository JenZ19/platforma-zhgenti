"use client";

import { getAgentCoverPrototypeSpec } from "../content/agent-cover-prototypes";
import type { ProjectDefinition } from "../content/types";

function HomeOrganizer({ detail }: { detail: boolean }) {
  const tasks = [["ПН", "Кухня", "Разобрать стол", "15 мин"], ["СР", "Детская", "Игрушки по местам", "20 мин"], ["СБ", "Весь дом", "Плановая уборка", "40 мин"]];
  return <div className="agent-home"><header><div><small>ПЛАН НА НЕДЕЛЮ</small><h4>Дома — спокойно</h4></div><button>＋ Добавить дело</button></header><div className="agent-home-zones"><b>Все зоны</b><span>Кухня</span><span>Детская</span><span>Ванная</span><span>Покупки</span></div><main><section>{tasks.slice(0, detail ? 3 : 2).map(([day, zone, task, time]) => <article key={task}><time>{day}</time><i /><p><small>{zone.toUpperCase()}</small><b>{task}</b></p><span>{time}</span></article>)}</section><aside><small>СПИСОК НА СУББОТУ</small><h5>Покупки</h5><p>✓ Средство для пола</p><p>✓ Пакеты</p><p>○ Вода</p><footer>↻ Повторять каждую неделю</footer></aside></main></div>;
}

function MealPlanner({ detail }: { detail: boolean }) {
  const days = [["ПОНЕДЕЛЬНИК", "Паста с овощами", "25 мин", "🍝"], ["ВТОРНИК", "Курица и рис", "30 мин", "🍚"], ["СРЕДА", "Овощной суп", "25 мин", "🥣"]];
  return <div className="agent-meal"><header><div><small>СЕМЕЙНОЕ МЕНЮ</small><h4>Ужины на три дня</h4></div><span>Без сложных рецептов</span></header><section>{days.map(([day, meal, time, icon], index) => <article key={day} className={`meal-${index}`}><span>{icon}</span><small>{day}</small><h5>{meal}</h5><p>{time} · обычные продукты</p>{detail && <button>Заменить блюдо</button>}</article>)}</section><footer><div><small>СПИСОК ПОКУПОК</small><b>Овощи · рис · курица · паста</b></div><button>Открыть список →</button></footer><p className="meal-safe">Бытовые идеи меню — не диета и не медицинская рекомендация.</p></div>;
}

function StudyAgent({ detail }: { detail: boolean }) {
  return <div className="agent-study"><aside><span>↗</span><small>ТЕМА УРОКА</small><h4>Как работает процент?</h4><p>Уровень: начинаю с нуля</p><nav><b>1 Объяснение</b><span>2 Пример</span><span>3 Мини-тест</span></nav></aside><main><section><small>ПРОСТЫМИ СЛОВАМИ</small><h5>Процент — это часть из ста</h5><p>Если из 100 яблок 20 красные, значит красных яблок — 20%.</p><div><b>Пример из жизни</b><span>Скидка 10% от 1 000 ₽ — это 100 ₽.</span></div></section><section className="study-test"><small>ПРОВЕРИМ ПОНИМАНИЕ</small>{["Что означает 25%?", "Сколько будет 10% от 500?", "Где встретишь проценты?"].slice(0, detail ? 3 : 2).map((q, index) => <p key={q}><i>{index + 1}</i>{q}<span>›</span></p>)}</section></main></div>;
}

function IdeaAnalysis({ detail }: { detail: boolean }) {
  return <div className="agent-idea-analysis"><header><div><small>12 СЫРЫХ ИДЕЙ</small><h4>Разбор идей</h4></div><button>✦ Выбрать лучшее</button></header><main><section><small>СГРУППИРОВАНО</small><div className="idea-cluster purple"><b>Контент</b><span>5 идей</span><p>Рилс · пост · эфир</p></div><div className="idea-cluster peach"><b>Мини-продукты</b><span>4 идеи</span><p>Гайд · шаблон · чек-лист</p></div>{detail && <div className="idea-cluster blue"><b>Сообщество</b><span>3 идеи</span><p>Клуб · встреча · чат</p></div>}</section><aside><small>ТОП НА ЭТУ НЕДЕЛЮ</small>{[["Шаблон планера", "9.2"], ["Рилс про первый проект", "8.8"], ["Чек-лист новичка", "8.4"]].map(([idea, score], index) => <article key={idea}><i>0{index + 1}</i><p><b>{idea}</b><small>польза · простота</small></p><strong>{score}</strong></article>)}<footer>Следующий шаг: сделать первый черновик</footer></aside></main></div>;
}

function DayPlanner({ detail }: { detail: boolean }) {
  const blocks = [["09:00", "Работа", "до 16:00"], ["17:30", "Врач", "фиксированное время"], ["19:00", "Купить продукты", "по пути домой"]];
  return <div className="agent-day"><header><div><small>ВТОРНИК · ПЛАН ГОТОВ</small><h4>День с запасом</h4></div><span>не перегружен</span></header><main><section>{blocks.slice(0, detail ? 3 : 2).map(([time, title, note], index) => <article key={title} className={index === 1 ? "fixed" : ""}><time>{time}</time><i /><p><b>{title}</b><small>{note}</small></p></article>)}</section><aside><small>ГЛАВНОЕ СЕГОДНЯ</small><h5>Отправить документы</h5><p>До 15:00 · затем 30 минут свободного времени.</p><div><b>✓</b><span>Запас между делами сохранён</span></div></aside></main><footer>Вечером агент спокойно пересоберёт только оставшиеся дела.</footer></div>;
}

function ContentAssistant({ detail }: { detail: boolean }) {
  return <div className="agent-content"><aside><small>МАТЕРИАЛЫ ЭКСПЕРТА</small>{[["PDF", "Программа.pdf"], ["TXT", "Голос бренда"], ["DOC", "Услуги и FAQ"]].map(([type, file]) => <article key={file}><i>{type}</i><p><b>{file}</b><small>прочитано ✓</small></p></article>)}<footer>3 источника · факты защищены</footer></aside><main><header><div><small>КОНТЕНТ-МАСТЕРСКАЯ</small><h4>Черновики на неделю</h4></div><span>7 готово</span></header><nav><b>Все</b><span>Польза</span><span>История</span><span>Продажа</span></nav><section><article><small>ПОЛЬЗА · ПОСТ</small><h5>С чего начать новичку</h5><p>Черновик по уроку 1</p><i>Факты ✓ Тон ✓</i></article><article><small>ИСТОРИЯ · РИЛС</small><h5>Почему шаблоны помогают</h5><p>По материалу «Голос бренда»</p><i>Факты ✓ Тон ✓</i></article>{detail && <article><small>ПРОДУКТ · СТОРИС</small><h5>Что внутри курса</h5><p>По файлу «Программа»</p><i>Факты ✓ Тон ✓</i></article>}</section></main></div>;
}

function ExpertAssistant({ detail }: { detail: boolean }) {
  return <div className="agent-expert"><aside><div>◇</div><small>БАЗА ЭКСПЕРТА</small><span className="active">Услуги и правила</span><span>Материалы</span><span>Вопросы клиентов</span><span>Планы встреч</span><footer>12 файлов · обновлено сегодня</footer></aside><main><header><span>Как проходит первая консультация?</span><b>•••</b></header><section><small>◇ ОТВЕТ ПО БАЗЕ</small><h4>Сначала — короткое знакомство</h4><p>На первой встрече эксперт уточняет задачу, объясняет формат и предлагает подходящий следующий шаг.</p><div><b>Источник</b><span>«Правила работы», раздел 2 ↗</span></div></section>{detail && <aside><small>ПЛАН БЛИЖАЙШЕЙ ВСТРЕЧИ</small><span>01 Уточнить цель</span><span>02 Разобрать ситуацию</span><span>03 Зафиксировать шаги</span></aside>}<footer>Спорный вопрос → передать эксперту</footer></main></div>;
}

function ExpenseAgent({ detail }: { detail: boolean }) {
  return <div className="agent-expense"><header><div><small>РАСХОД ПОНЯТ И ПРОВЕРЕН</small><h4>Семейные расходы</h4></div><button>Подтвердить запись</button></header><section><div><small>СЕГОДНЯ</small><b>4 740 ₽</b><span>2 покупки</span></div><div className="expense-wheel"><b>73%</b><small>продукты</small></div></section><main><article><i className="food">●</i><p><b>Продукты</b><small>Супермаркет · вчера</small></p><strong>3 450 ₽</strong></article><article><i className="child">●</i><p><b>Ребёнок</b><small>Учебные материалы</small></p><strong>1 290 ₽</strong></article>{detail && <footer><span>Сумма ✓</span><span>Дата ✓</span><span>Категория ✓</span><b>Запись ждёт «Да»</b></footer>}</main></div>;
}

function FamilySchedule({ detail }: { detail: boolean }) {
  const events = [["ВТ", "17:30", "Плавание", "А"], ["ЧТ", "16:00", "Музыка", "Б"], ["ПТ", "18:30", "Семейный ужин", "ВСЕ"]];
  return <div className="agent-family-week"><header><div><small>НЕДЕЛЯ 10–16 АВГУСТА</small><h4>Семейное расписание</h4></div><span>пересечений нет ✓</span></header><div className="family-days">{["ПН", "ВТ", "СР", "ЧТ", "ПТ"].map((day, index) => <b key={day} className={[1,3,4].includes(index) ? "busy" : ""}>{day}<small>{10 + index}</small></b>)}</div><main>{events.slice(0, detail ? 3 : 2).map(([day, time, title, owner], index) => <article key={title} className={`family-event e${index}`}><time>{day} · {time}</time><h5>{title}</h5><p>Профиль {owner}</p><footer>{index === 0 ? "Форма · вода" : index === 1 ? "За 1 час" : "Общий календарь"}</footer></article>)}</main><footer>Без ФИО ребёнка, домашнего адреса и геолокации.</footer></div>;
}

function HabitAgent({ detail }: { detail: boolean }) {
  return <div className="agent-habit"><header><div><small>МОЯ МАЛЕНЬКАЯ ПРИВЫЧКА</small><h4>Прогулка 20 минут</h4></div><span>без штрафов</span></header><main><div className="habit-ring"><b>4</b><small>дня подряд</small></div><section><small>САМЫЙ ЛЁГКИЙ ШАГ</small><h5>Выйти после обеда</h5><p>Если день тяжёлый — достаточно пяти минут.</p><div>{["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"].map((day, index) => <span key={day} className={index < (detail ? 4 : 3) ? "done" : ""}><i>{index < (detail ? 4 : 3) ? "✓" : ""}</i>{day}</span>)}</div></section></main><footer><b>Сегодня:</b> мягкое напоминание в 14:00 · самочувствие важнее серии.</footer></div>;
}

function BriefAgent({ detail }: { detail: boolean }) {
  const fields = [["01", "Для кого", "Экспертам с консультациями"], ["02", "Что нужно", "Сайт с понятной записью"], ["03", "Главное действие", "Оставить заявку"], ["04", "Стиль", "Спокойный и современный"]];
  return <div className="agent-brief"><aside><div>8/8</div><small>БРИФ ЗАПОЛНЕН</small><h4>Сайт консультации</h4><p>Ответы собраны по одному вопросу и подтверждены заказчиком.</p><footer>Можно передавать исполнителю ✓</footer></aside><main><header><small>СВОДКА ПРОЕКТА</small><span>противоречий нет</span></header>{fields.slice(0, detail ? 4 : 3).map(([num, label, value]) => <article key={num}><i>{num}</i><p><small>{label}</small><b>{value}</b></p><span>✓</span></article>)}<footer>Секреты и доступы в бриф не добавлены.</footer></main></div>;
}

function Administrator({ detail }: { detail: boolean }) {
  return <div className="agent-admin"><aside><header><span>А</span><p><b>Администратор студии</b><small>онлайн</small></p></header><nav><b>Диалог</b><span>Правила</span><span>Услуги</span><span>Передача</span></nav><footer>Только подтверждённая информация</footer></aside><main><div className="admin-user">Есть ли свободное время в пятницу?</div><section><small>◷ ОТВЕТ ПО ПРАВИЛАМ</small><p>Я не вижу живое расписание и не буду придумывать свободный слот.</p><div><b>Могу помочь сейчас:</b><span>✓ выбрать услугу</span><span>✓ объяснить подготовку</span>{detail && <span>✓ передать запрос администратору</span>}</div><button>Передать человеку →</button></section><footer>Ответ подготовлен за 1 минуту · запись ещё не подтверждена</footer></main></div>;
}

function Consultant({ detail }: { detail: boolean }) {
  return <div className="agent-consultant"><header><div><small>ЦЕНТР ЗНАНИЙ</small><h4>ИИ-консультант</h4></div><span>2 источника найдено</span></header><main><aside><small>ЗАПРОС</small><p>Что входит в первый месяц сопровождения?</p><div><b>Уточнение</b><span>Вам нужен формат для самостоятельной работы или с поддержкой?</span></div></aside><section><small>i ОТВЕТ ПО ПАМЯТКЕ</small><h5>В первый месяц вы получаете:</h5><p>01 Установочную встречу</p><p>02 План следующих шагов</p><p>03 Еженедельную проверку</p>{detail && <div className="consultant-sources"><b>Источники</b><span>Памятка клиента, стр. 3</span><span>Условия сопровождения, п. 2</span></div>}<footer>Чувствительный вопрос → передать эксперту</footer></section></main><p className="consultant-safe">Не заменяет медицинского, юридического или финансового специалиста.</p></div>;
}

function AgentCoverBody({ slug, detail }: { slug: string; detail: boolean }) {
  switch (slug) {
    case "day-planner-agent": return <DayPlanner detail={detail} />;
    case "home-organizer-agent": return <HomeOrganizer detail={detail} />;
    case "meal-planning-agent": return <MealPlanner detail={detail} />;
    case "study-agent": return <StudyAgent detail={detail} />;
    case "idea-analysis-agent": return <IdeaAnalysis detail={detail} />;
    case "expense-agent": return <ExpenseAgent detail={detail} />;
    case "family-schedule-agent": return <FamilySchedule detail={detail} />;
    case "habit-agent": return <HabitAgent detail={detail} />;
    case "brief-agent": return <BriefAgent detail={detail} />;
    case "content-agent": return <ContentAssistant detail={detail} />;
    case "expert-assistant-agent": return <ExpertAssistant detail={detail} />;
    case "administrator-agent": return <Administrator detail={detail} />;
    case "consultant-agent": return <Consultant detail={detail} />;
    default: getAgentCoverPrototypeSpec(slug); return null;
  }
}

export function AgentCoverPrototypeScene({ project, step }: { project: ProjectDefinition; step: number }) {
  const spec = getAgentCoverPrototypeSpec(project.slug);
  return <div className={`first-cover-stage agent-cover-stage agent-cover--${spec.theme}`} data-agent-cover-marker={spec.marker}>
    <div className="first-cover-product agent-cover-product">
      <div className="first-cover-browser"><span>● ● ●</span><b>{project.title}</b><i>готовый ИИ-агент</i></div>
      <main><AgentCoverBody slug={project.slug} detail={step >= 8} /></main>
    </div>
    <aside className="first-cover-result"><small>{spec.eyebrow}</small><h3>{spec.headline}</h3><div><b>{spec.metric}</b><span>{spec.status}</span></div><p>На обложке показан реальный рабочий экран и понятный результат именно этого агента.</p><span className="first-cover-ready">✓ Агент готов</span></aside>
  </div>;
}
