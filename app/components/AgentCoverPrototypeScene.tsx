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

function PersonalContent({ detail }: { detail: boolean }) {
  return <div className="agent-personal-content"><aside><small>НАСТОЯЩАЯ ИСТОРИЯ</small><h4>Первый проект</h4><div className="story-question">Что ты почувствовала, когда всё заработало?</div><div className="story-answer">Сначала не поверила. Потом показала подруге — и поняла, что могу.</div><p>✓ Факты взяты только из ответов автора</p></aside><main><header><div><small>ЧЕРНОВИК СОХРАНИЛ ГОЛОС</small><h5>«Я думала, что это не для меня»</h5></div><span>ГОТОВ К ПРОВЕРКЕ</span></header><p>Ещё неделю назад я боялась открыть Codex. А сегодня у меня есть первый работающий сервис…</p><section>{["ПН", "СР", "ПТ", "СБ", "ВС"].slice(0, detail ? 5 : 3).map((day, index) => <article key={day}><b>{day}</b><span>{["История", "Совет", "Результат", "Закулисье", "Вопрос"][index]}</span></article>)}</section><footer>5 публикаций из одной честной истории</footer></main></div>;
}

function ContentAssistant({ detail }: { detail: boolean }) {
  return <div className="agent-content"><aside><small>МАТЕРИАЛЫ ЭКСПЕРТА</small>{[["PDF", "Программа.pdf"], ["TXT", "Голос бренда"], ["DOC", "Услуги и FAQ"]].map(([type, file]) => <article key={file}><i>{type}</i><p><b>{file}</b><small>прочитано ✓</small></p></article>)}<footer>3 источника · факты защищены</footer></aside><main><header><div><small>КОНТЕНТ-МАСТЕРСКАЯ</small><h4>Черновики на неделю</h4></div><span>7 готово</span></header><nav><b>Все</b><span>Польза</span><span>История</span><span>Продажа</span></nav><section><article><small>ПОЛЬЗА · ПОСТ</small><h5>С чего начать новичку</h5><p>Черновик по уроку 1</p><i>Факты ✓ Тон ✓</i></article><article><small>ИСТОРИЯ · РИЛС</small><h5>Почему шаблоны помогают</h5><p>По материалу «Голос бренда»</p><i>Факты ✓ Тон ✓</i></article>{detail && <article><small>ПРОДУКТ · СТОРИС</small><h5>Что внутри курса</h5><p>По файлу «Программа»</p><i>Факты ✓ Тон ✓</i></article>}</section></main></div>;
}

function ExpertAssistant({ detail }: { detail: boolean }) {
  return <div className="agent-expert"><aside><div>◇</div><small>БАЗА ЭКСПЕРТА</small><span className="active">Услуги и правила</span><span>Материалы</span><span>Вопросы клиентов</span><span>Планы встреч</span><footer>12 файлов · обновлено сегодня</footer></aside><main><header><span>Как проходит первая консультация?</span><b>•••</b></header><section><small>◇ ОТВЕТ ПО БАЗЕ</small><h4>Сначала — короткое знакомство</h4><p>На первой встрече эксперт уточняет задачу, объясняет формат и предлагает подходящий следующий шаг.</p><div><b>Источник</b><span>«Правила работы», раздел 2 ↗</span></div></section>{detail && <aside><small>ПЛАН БЛИЖАЙШЕЙ ВСТРЕЧИ</small><span>01 Уточнить цель</span><span>02 Разобрать ситуацию</span><span>03 Зафиксировать шаги</span></aside>}<footer>Спорный вопрос → передать эксперту</footer></main></div>;
}

function SalesManager({ detail }: { detail: boolean }) {
  return <div className="agent-sales"><header><div><small>ВХОДЯЩИЙ ЗАПРОС</small><h4>Новая заявка · Анна</h4></div><span>БЕЗ ДАВЛЕНИЯ</span></header><div className="sales-route"><span className="done">1<i>✓</i><small>Задача</small></span><b /><span className="done">2<i>✓</i><small>Потребность</small></span><b /><span className="active">3<i>✦</i><small>Предложение</small></span><b /><span>4<i>→</i><small>Человек</small></span></div><main><section><small>ЧТО УЗНАЛИ</small><p><b>Нужен:</b> сайт консультации</p><p><b>Важно:</b> простой запуск</p><p><b>Срок:</b> до конца месяца</p></section><aside><small>ПОДХОДЯЩИЙ ШАГ</small><h5>Пакет «Старт»</h5><p>Одностраничный сайт + форма заявки.</p>{detail && <ul><li>Честные условия</li><li>Без обещания результата</li></ul>}<button>Передать менеджеру →</button></aside></main></div>;
}

function Administrator({ detail }: { detail: boolean }) {
  return <div className="agent-admin"><aside><header><span>А</span><p><b>Администратор студии</b><small>онлайн</small></p></header><nav><b>Диалог</b><span>Правила</span><span>Услуги</span><span>Передача</span></nav><footer>Только подтверждённая информация</footer></aside><main><div className="admin-user">Есть ли свободное время в пятницу?</div><section><small>◷ ОТВЕТ ПО ПРАВИЛАМ</small><p>Я не вижу живое расписание и не буду придумывать свободный слот.</p><div><b>Могу помочь сейчас:</b><span>✓ выбрать услугу</span><span>✓ объяснить подготовку</span>{detail && <span>✓ передать запрос администратору</span>}</div><button>Передать человеку →</button></section><footer>Ответ подготовлен за 1 минуту · запись ещё не подтверждена</footer></main></div>;
}

function Consultant({ detail }: { detail: boolean }) {
  return <div className="agent-consultant"><header><div><small>ЦЕНТР ЗНАНИЙ</small><h4>ИИ-консультант</h4></div><span>2 источника найдено</span></header><main><aside><small>ЗАПРОС</small><p>Что входит в первый месяц сопровождения?</p><div><b>Уточнение</b><span>Вам нужен формат для самостоятельной работы или с поддержкой?</span></div></aside><section><small>i ОТВЕТ ПО ПАМЯТКЕ</small><h5>В первый месяц вы получаете:</h5><p>01 Установочную встречу</p><p>02 План следующих шагов</p><p>03 Еженедельную проверку</p>{detail && <div className="consultant-sources"><b>Источники</b><span>Памятка клиента, стр. 3</span><span>Условия сопровождения, п. 2</span></div>}<footer>Чувствительный вопрос → передать эксперту</footer></section></main><p className="consultant-safe">Не заменяет медицинского, юридического или финансового специалиста.</p></div>;
}

function AgentCoverBody({ slug, detail }: { slug: string; detail: boolean }) {
  switch (slug) {
    case "home-organizer-agent": return <HomeOrganizer detail={detail} />;
    case "meal-planning-agent": return <MealPlanner detail={detail} />;
    case "study-agent": return <StudyAgent detail={detail} />;
    case "idea-analysis-agent": return <IdeaAnalysis detail={detail} />;
    case "personal-content-agent": return <PersonalContent detail={detail} />;
    case "content-agent": return <ContentAssistant detail={detail} />;
    case "expert-assistant-agent": return <ExpertAssistant detail={detail} />;
    case "sales-manager-agent": return <SalesManager detail={detail} />;
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
