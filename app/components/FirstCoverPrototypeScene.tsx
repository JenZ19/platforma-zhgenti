"use client";

import { getFirstCoverPrototypeSpec } from "../content/first-cover-prototypes";
import type { ProjectDefinition } from "../content/types";

function BudgetCover({ detail }: { detail: boolean }) {
  return <div className="cover-budget"><header><div><small>АВГУСТ 2026</small><h4>Семейный бюджет</h4></div><button>＋ Расход</button></header><section className="budget-summary"><div><small>ОСТАЛОСЬ</small><b>95 260 ₽</b><span>из 100 000 ₽</span></div><div className="budget-ring"><b>5%</b><small>потрачено</small></div></section><div className="budget-categories"><article><i className="food">●</i><p><b>Продукты</b><small>Сегодня</small></p><strong>3 450 ₽</strong></article><article><i className="child">●</i><p><b>Ребёнок</b><small>12 августа</small></p><strong>1 290 ₽</strong></article>{detail && <article><i className="home">●</i><p><b>Дом</b><small>Пока нет расходов</small></p><strong>0 ₽</strong></article>}</div><footer><span>Месяц</span><b>Категории</b><span>Резервная копия</span></footer></div>;
}

function PlannerCover({ detail }: { detail: boolean }) {
  const days = [["ПН", "10"], ["ВТ", "11"], ["СР", "12"], ["ЧТ", "13"], ["ПТ", "14"]];
  const tasks = [["Записать ребёнка к врачу", "10:30", true], ["Купить продукты", "После обеда", false], ["30 минут на себя", "Вечером", false]] as const;
  return <div className="cover-planner"><header><div><small>МОЙ ПЛАНЕР</small><h4>Спокойный вторник</h4></div><span>12 августа</span></header><div className="planner-week">{days.map(([day, date], index) => <span key={day} className={index === 2 ? "active" : ""}><small>{day}</small><b>{date}</b></span>)}</div><section><aside><small>ГЛАВНОЕ СЕГОДНЯ</small><h5>Записать ребёнка к врачу</h5><p>Одно главное дело — уже хороший день.</p></aside><main>{tasks.slice(0, detail ? 3 : 2).map(([task, time, done]) => <article key={task}><i className={done ? "done" : ""}>{done ? "✓" : ""}</i><p><b>{task}</b><small>{time}</small></p></article>)}</main></section></div>;
}

function IdeaVaultCover({ detail }: { detail: boolean }) {
  return <div className="cover-ideas"><header><div><small>МОЯ КОПИЛКА</small><h4>Идеи</h4></div><button>＋ Новая идея</button></header><div className="idea-toolbar"><span>⌕ Найти идею…</span><nav><b>Все</b><span>Контент</span><span>Семья</span><span>Поездки</span></nav></div><section><article className="idea-card card-lilac"><small>КОНТЕНТ · НОВАЯ</small><h5>Рилс про утреннюю рутину</h5><footer>#рилс <span>♡</span></footer></article><article className="idea-card card-peach"><small>ПОДАРКИ · НА ПОТОМ</small><h5>Подарок маме</h5><footer>#семья <span>♡</span></footer></article>{detail && <article className="idea-card card-blue"><small>ПОЕЗДКИ · В РАБОТЕ</small><h5>Маршрут на выходные</h5><footer>#выходные <span>♥</span></footer></article>}</section></div>;
}

function ChildScheduleCover({ detail }: { detail: boolean }) {
  return <div className="cover-child"><header><div><small>НЕДЕЛЯ 10–16 АВГУСТА</small><h4>Расписание ребёнка</h4></div><button>＋ Занятие</button></header><div className="child-board"><aside>{["ПН", "ВТ", "СР", "ЧТ", "ПТ"].map((day, index) => <span key={day} className={index === 1 || index === 3 ? "busy" : ""}><small>{day}</small><b>{10 + index}</b></span>)}</aside><main><article className="swim"><time>ВТОРНИК · 17:30</time><h5>🏊 Плавание</h5><p>Спортивный центр</p><div><b>Взять с собой</b><span>Форма</span><span>Вода</span></div></article><article className="music"><time>ЧЕТВЕРГ · 16:00</time><h5>♫ Музыка</h5><p>Класс 4</p>{detail && <div><b>Напоминание</b><span>За 1 час</span></div>}</article></main></div><footer>Без ФИО, адреса дома и личных контактов ребёнка <b>✓</b></footer></div>;
}

function PressureDiaryCover({ detail }: { detail: boolean }) {
  const rows = [["12 авг · 09:00", "120 / 80", "72", "Обычное"], ["11 авг · 20:30", "118 / 79", "70", "Обычное"], ["11 авг · 08:45", "121 / 81", "73", "Обычное"]];
  return <div className="cover-pressure"><header><div><small>ЛИЧНЫЕ НАБЛЮДЕНИЯ</small><h4>Дневник давления</h4></div><button>＋ Новая запись</button></header><section className="pressure-latest"><div><small>ПОСЛЕДНЯЯ ЗАПИСЬ · 09:00</small><b>120 <i>/</i> 80</b><span>пульс 72 · самочувствие обычное</span></div><aside><div className="pressure-line"><i /><i /><i /><i /><i /></div><small>История за 7 дней</small></aside></section><div className="pressure-table"><header><span>Дата и время</span><span>Давление</span><span>Пульс</span><span>Самочувствие</span></header>{rows.slice(0, detail ? 3 : 2).map((row) => <article key={row[0]}>{row.map((cell) => <span key={cell}>{cell}</span>)}</article>)}</div><footer><b>Важно:</b> дневник только хранит записи — не ставит диагноз и не заменяет врача.</footer></div>;
}

function FitnessCover({ detail }: { detail: boolean }) {
  return <div className="cover-fitness"><header><div><small>МОЯ НЕДЕЛЯ</small><h4>Фитнес-трекер</h4></div><span>Без гонки за идеалом</span></header><section className="fitness-today"><div className="fitness-orbit"><b>35</b><small>минут</small></div><div><small>СЕГОДНЯ</small><h5>Прогулка</h5><p>Маленькие шаги тоже считаются.</p></div></section><div className="fitness-cards"><article><span>💧</span><p><b>6 стаканов</b><small>вода</small></p><i>＋</i></article><article><span>☾</span><p><b>7 часов</b><small>сон</small></p><i>✓</i></article>{detail && <article><span>✎</span><p><b>Легко</b><small>заметка дня</small></p><i>›</i></article>}</div><div className="fitness-week">{[40, 55, 82, 45, 65, 30, 15].map((height, index) => <span key={index}><i style={{ height: `${height}%` }} /><small>{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][index]}</small></span>)}</div><footer>Личные отметки, а не медицинская оценка <b>✓</b></footer></div>;
}

function RecipeBookCover({ detail }: { detail: boolean }) {
  return <div className="cover-recipes"><header><div><small>ДОМАШНЯЯ КНИГА</small><h4>Любимые рецепты</h4></div><div>⌕ Найти блюдо…</div></header><nav><b>Все</b><span>Завтрак</span><span>Ужин</span><span>До 30 минут</span></nav><section><article className="recipe-main"><div className="recipe-photo">🥞<span>♥</span></div><small>ЗАВТРАК · 25 МИНУТ</small><h5>Сырники</h5><p>Творог · яйцо · мука</p></article><article className="recipe-small"><div className="pasta-photo">🍝</div><p><small>УЖИН</small><b>Паста с овощами</b></p></article>{detail && <aside><small>СПИСОК ПОКУПОК</small><h5>Для сырников</h5><p>✓ Творог</p><p>✓ Яйца</p><p>○ Сметана</p><button>Открыть список →</button></aside>}</section></div>;
}

function OrganizerCover({ detail }: { detail: boolean }) {
  return <div className="cover-organizer"><aside><div>◇</div><small>МОЙ ОРГАНАЙЗЕР</small>{[["✓", "Задачи"], ["◷", "События"], ["↗", "Ссылки"], ["✎", "Заметки"], ["★", "Избранное"]].map(([icon, label], index) => <span key={label} className={index === 0 ? "active" : ""}><i>{icon}</i>{label}</span>)}</aside><main><header><div><small>ВТОРНИК, 12 АВГУСТА</small><h4>Важное сегодня</h4></div><button>＋ Добавить</button></header><section><article><span>✓</span><p><b>Оплатить интернет</b><small>до 18:00 · задача</small></p><i>ГЛАВНОЕ</i></article><article><span>18</span><p><b>День рождения</b><small>18 августа · событие</small></p><i>СЕМЬЯ</i></article>{detail && <article><span>↗</span><p><b>Семейный альбом</b><small>ссылка сохранена</small></p><i>★</i></article>}</section><footer><span>⌕ Поиск по всему органайзеру</span><b>5 разделов</b></footer></main></div>;
}

function HomeHelperCover({ detail }: { detail: boolean }) {
  const chores = [["Заказать воду", "Кухня", "Мама", "сегодня"], ["Разобрать детскую", "Детская", "Вместе", "до 19:00"], ["Сменить постельное бельё", "Спальня", "Алексей", "каждую неделю"]];
  return <div className="cover-home"><header><div><small>НАШ ДОМ</small><h4>Домашний помощник</h4></div><div className="home-people"><span>М</span><span>А</span><button>＋ Дело</button></div></header><div className="home-rooms"><b>Все дела · 3</b><span>Кухня</span><span>Детская</span><span>Спальня</span><span>Покупки</span></div><section>{chores.slice(0, detail ? 3 : 2).map(([task, room, person, when], index) => <article key={task}><i className={index === 0 ? "checked" : ""}>{index === 0 ? "✓" : ""}</i><p><small>{room.toUpperCase()}</small><b>{task}</b><span>{when}</span></p><strong>{person}</strong>{index === 2 && <em>↻</em>}</article>)}</section><footer><span>Сегодня</span><b>Семейный обзор</b><span>Покупки</span></footer></div>;
}

function DayAgentCover({ detail }: { detail: boolean }) {
  return <div className="cover-day-agent"><aside><div className="agent-fairy">✦</div><small>ИИ-ПОМОЩНИК</small><h4>Планировщик дня</h4><p>Учитывает свободное время и не перегружает расписание.</p><div><span>✓ Разобрала список</span><span>✓ Выбрала главное</span><span>✓ Оставила запас</span></div><footer>Онлайн · готова помочь</footer></aside><main><header><span>Сегодня свободно с 10:00 до 15:00</span><b>•••</b></header><div className="agent-message">Главное — отправить документы. Ещё нужно купить продукты и позвонить врачу.</div><section><small>✦ ГОТОВЫЙ ПЛАН</small>{[["10:00", "Собрать документы", "Главное"], ["11:30", "Отправить и проверить", "45 мин"], ["12:30", "Обед и отдых", "60 мин"], ["13:30", "Звонок врачу", "20 мин"]].slice(0, detail ? 4 : 3).map(([time, task, meta], index) => <article key={time}><time>{time}</time><i className={index === 0 ? "main" : ""} /><p><b>{task}</b><small>{meta}</small></p></article>)}<footer>14:00–14:30 · запас на непредвиденное</footer></section></main></div>;
}

function CoverBody({ slug, detail }: { slug: string; detail: boolean }) {
  switch (slug) {
    case "family-expenses": return <BudgetCover detail={detail} />;
    case "planner": return <PlannerCover detail={detail} />;
    case "idea-vault": return <IdeaVaultCover detail={detail} />;
    case "child-schedule": return <ChildScheduleCover detail={detail} />;
    case "pressure-diary": return <PressureDiaryCover detail={detail} />;
    case "fitness-tracker": return <FitnessCover detail={detail} />;
    case "recipe-book": return <RecipeBookCover detail={detail} />;
    case "personal-organizer": return <OrganizerCover detail={detail} />;
    case "home-helper": return <HomeHelperCover detail={detail} />;
    case "day-planner-agent": return <DayAgentCover detail={detail} />;
    default: getFirstCoverPrototypeSpec(slug); return null;
  }
}

export function FirstCoverPrototypeScene({ project, step }: { project: ProjectDefinition; step: number }) {
  const spec = getFirstCoverPrototypeSpec(project.slug);
  return <div className={`first-cover-stage first-cover--${spec.theme}`} data-cover-marker={spec.marker}>
    <div className="first-cover-product">
      <div className="first-cover-browser"><span>● ● ●</span><b>{project.title}</b><i>готовый прототип</i></div>
      <main><CoverBody slug={project.slug} detail={step >= 8} /></main>
    </div>
    <aside className="first-cover-result"><small>{spec.eyebrow}</small><h3>{spec.headline}</h3><div><b>{spec.metric}</b><span>{spec.status}</span></div><p>Это не декоративная картинка: на обложке показан настоящий главный экран проекта.</p><span className="first-cover-ready">✓ Можно пользоваться</span></aside>
  </div>;
}
