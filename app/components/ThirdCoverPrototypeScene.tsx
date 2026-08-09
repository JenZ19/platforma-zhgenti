"use client";

import { getThirdCoverPrototypeSpec } from "../content/third-cover-prototypes";
import type { ProjectDefinition } from "../content/types";

function OnlineSchool({ detail }: { detail: boolean }) {
  return <div className="third-school"><aside><div>↗</div><small>КУРС «САЙТ С НУЛЯ»</small><b>Модуль 1 · Начало</b><span className="active">2 · Собираем материалы</span><span>3 · Первый экран</span><span>4 · Публикация</span><footer>Пройдено 35%</footer></aside><main><header><div><small>ПОМОЩНИК КУРСА</small><h4>Где найти шаблон?</h4></div><span>по материалам урока</span></header><section><p>Шаблон лежит под видео второго урока. Нажмите «Материалы» и скачайте файл «Паспорт проекта».</p><div><b>Ваш маршрут до пятницы</b>{["Скачать шаблон", "Заполнить 4 пункта", "Отправить куратору"].slice(0, detail ? 3 : 2).map((item, index) => <span key={item}><i>{index + 1}</i>{item}<em>{index === 0 ? "✓" : "→"}</em></span>)}</div></section><footer>Личный вопрос или ошибка → передать куратору</footer></main></div>;
}

function EventOrganizer({ detail }: { detail: boolean }) {
  const tasks = [["Письмо участникам", "ГОТОВО"], ["Проверить презентацию", "СЕГОДНЯ"], ["Тест ссылки на эфир", "18:00"]];
  return <div className="third-event"><header><div><small>ВЕБИНАР · 28 АВГУСТА</small><h4>Запуск без суеты</h4></div><div><b>19:00</b><span>Москва</span></div></header><div className="event-line"><span className="done">7 дней<i>✓</i></span><b /><span className="done">3 дня<i>✓</i></span><b /><span className="active">24 часа<i>!</i></span><b /><span>Эфир<i>●</i></span></div><main><section><small>КОНТРОЛЬНЫЕ ЗАДАЧИ</small>{tasks.slice(0, detail ? 3 : 2).map(([task, status], index) => <article key={task}><i>{index === 0 ? "✓" : "○"}</i><p><b>{task}</b><span>{status}</span></p></article>)}</section><aside><small>РИСКИ</small><h5>1 пункт требует внимания</h5><p>Ссылка на эфир ещё не проверена с телефона.</p><button>Открыть чек-лист →</button></aside></main><footer>Ничего не отправляется без подтверждения владельца.</footer></div>;
}

function ClientCare({ detail }: { detail: boolean }) {
  return <div className="third-client"><aside><header><span>♡</span><p><b>Клиенты</b><small>4 активных</small></p></header>{["Анна · макет", "Мария · встреча", "Ольга · документы"].map((name, index) => <div key={name} className={index === 0 ? "active" : ""}><i>{name[0]}</i><p><b>{name}</b><small>{index === 0 ? "ответить сегодня" : "всё спокойно"}</small></p></div>)}<footer>Лишние личные данные удалены ✓</footer></aside><main><header><div><small>РЕЗЮМЕ ДИАЛОГА</small><h4>Анна ждёт макет</h4></div><span>пятница</span></header><section><div><small>ДОГОВОРЁННОСТИ</small>{["Показать первый экран", "Прислать две цветовые версии", "Уточнить текст кнопки"].slice(0, detail ? 3 : 2).map((item) => <p key={item}>✓ {item}</p>)}</div><div className="client-draft"><small>ЧЕРНОВИК ОТВЕТА</small><p>Анна, добрый день! Макет первого экрана пришлю в пятницу. Добавлю две цветовые версии, как договорились…</p><button>Проверить перед отправкой</button></div></section></main></div>;
}

function FairyTeam({ detail }: { detail: boolean }) {
  const fairies = [["01", "Исследователь", "Собрала факты", "✦"], ["02", "Автор", "Создала черновик", "✎"], ["03", "Редактор", "Проверила всё", "✓"]];
  return <div className="third-fairies"><header><div><small>ЕДИНЫЙ БРИФ · НОВЫЙ ПРОЕКТ</small><h4>Команда ИИ-фей</h4></div><span>ФИНАЛ ГОТОВ</span></header><section>{fairies.map(([num, title, action, icon], index) => <div className={`fairy-card fairy-${index}`} key={title}><i>{icon}</i><small>ФЕЯ {num}</small><h5>{title}</h5><p>{action}</p>{detail && <footer>{index < 2 ? "Передала дальше →" : "Факты ✓ Тон ✓"}</footer>}</div>)}</section><div className="fairy-flow"><span>единый бриф</span><b>→</b><span>факты и источники</span><b>→</b><span>готовый материал</span></div><footer>Каждая роль видит только нужные ей данные.</footer></div>;
}

function ExpertSite({ detail }: { detail: boolean }) {
  return <div className="third-expert-site"><nav><b>АННА МИРОНОВА</b><span>О подходе · Консультация · Отзывы</span><button>Обсудить задачу</button></nav><main><section><small>КАРЬЕРНЫЙ КОНСУЛЬТАНТ</small><h4>Работа, в которой есть место для вас</h4><p>Помогаю увидеть сильные стороны и собрать реалистичный план следующего шага.</p><button>Записаться на встречу →</button></section><aside><div className="expert-portrait"><span>АМ</span></div><p><b>Консультация · 60 минут</b><small>Онлайн · итогом станет план действий</small></p></aside></main>{detail && <footer><span>01 Разберём ситуацию</span><span>02 Найдём опоры</span><span>03 Соберём план</span></footer>}</div>;
}

function PsychologistSite({ detail }: { detail: boolean }) {
  return <div className="third-psychology"><nav><b>Тихая опора</b><span>Подход · Темы · Обо мне</span><button>Первая встреча</button></nav><main><section><span>БЕРЕЖНАЯ ПОДДЕРЖКА ОНЛАЙН</span><h4>Когда перемен слишком много, не обязательно справляться одной</h4><p>Пространство без оценки, где можно остановиться, услышать себя и найти опору.</p><div><b>Тревога</b><b>Перемены</b><b>Отношения</b></div></section><aside><div><small>ПЕРВАЯ ВСТРЕЧА</small><b>50 минут</b><span>знакомимся и уточняем запрос</span><button>Узнать о формате →</button></div>{detail && <p>При угрозе жизни обратитесь в экстренную службу вашего региона.</p>}</aside></main></div>;
}

function BeautySite({ detail }: { detail: boolean }) {
  return <div className="third-beauty"><nav><b>NASTYA BEAUTY</b><span>Работы · Услуги · Обо мне</span><button>Записаться</button></nav><header><div><small>МАКИЯЖ ДЛЯ ВАЖНОГО ДНЯ</small><h4>Вы — только ярче</h4><p>Образ, в котором легко узнать себя.</p></div><aside className="beauty-hero"><span>BEAUTY</span></aside></header><section><article className="beauty-shot one"><span>Вечерний образ</span></article><article className="beauty-shot two"><span>Нежный нюд</span></article>{detail && <article className="beauty-shot three"><span>Образ для съёмки</span></article>}<aside><small>УСЛУГИ</small><b>Макияж от 5 000 ₽</b><p>Цена зависит от выбранного формата.</p><button>Обсудить дату →</button></aside></section></div>;
}

function PhotographerSite({ detail }: { detail: boolean }) {
  return <div className="third-photo"><nav><b>СВЕТЛАНА / ФОТОГРАФ</b><span>Серии · Пакеты · Процесс</span><button>Обсудить дату</button></nav><main><article className="photo-main"><div><small>СЕМЕЙНЫЕ ИСТОРИИ</small><h4>Живые кадры о ваших близких</h4><span>Смотреть серию ↓</span></div></article><section><article><small>СЕРИЯ 01</small><b>Прогулка у моря</b></article><article><small>СЕРИЯ 02</small><b>Утро дома</b></article>{detail && <footer><b>Пакет «Прогулка»</b><span>60 минут · от 40 фотографий</span></footer>}</section></main></div>;
}

function DesignerSite({ detail }: { detail: boolean }) {
  return <div className="third-designer"><nav><b>VERA—DESIGN</b><span>КЕЙСЫ / УСЛУГИ / КОНТАКТ</span><button>КОРОТКИЙ БРИФ ↗</button></nav><header><small>ВИЗУАЛЬНЫЕ СИСТЕМЫ ДЛЯ МАЛОГО БИЗНЕСА</small><h4>Дизайн, который держит идею</h4></header><main><section className="designer-case"><div><small>КЕЙС 01 · 2026</small><h5>Айдентика кофейни «Точка»</h5><p>Моя роль: дизайн и арт-дирекшн</p></div><aside><b>ТОЧКА</b><span>COFFEE / PEOPLE / CITY</span></aside></section>{detail && <footer>{["Задача", "Исследование", "Система", "Результат"].map((item, index) => <span key={item}>0{index + 1} {item}</span>)}</footer>}</main></div>;
}

function ConsultationSite({ detail }: { detail: boolean }) {
  return <div className="third-consultation"><nav><b>РАЗБОР СТРАТЕГИИ</b><span>Кому подходит · Что внутри · FAQ</span><button>Выбрать время</button></nav><main><section><small>ОНЛАЙН-КОНСУЛЬТАЦИЯ · 60 МИНУТ</small><h4>Из сложной задачи — в понятный план</h4><p>На встрече разберём вашу ситуацию, выберем приоритет и зафиксируем следующие шаги.</p><button>Записаться на разбор →</button></section><aside><small>ПОСЛЕ ВСТРЕЧИ У ВАС БУДЕТ</small>{["ясный приоритет", "план на 2 недели", "список следующих шагов"].slice(0, detail ? 3 : 2).map((item) => <p key={item}><i>✓</i>{item}</p>)}<footer><b>60 минут</b><span>онлайн · без гарантии неконтролируемого результата</span></footer></aside></main></div>;
}

function ThirdCoverBody({ slug, detail }: { slug: string; detail: boolean }) {
  switch (slug) {
    case "online-school-agent": return <OnlineSchool detail={detail} />;
    case "event-organizer-agent": return <EventOrganizer detail={detail} />;
    case "client-care-agent": return <ClientCare detail={detail} />;
    case "fairy-team-agent": return <FairyTeam detail={detail} />;
    case "expert-site": return <ExpertSite detail={detail} />;
    case "psychologist-site": return <PsychologistSite detail={detail} />;
    case "beauty-site": return <BeautySite detail={detail} />;
    case "photographer-site": return <PhotographerSite detail={detail} />;
    case "designer-site": return <DesignerSite detail={detail} />;
    case "consultation-site": return <ConsultationSite detail={detail} />;
    default: getThirdCoverPrototypeSpec(slug); return null;
  }
}

export function ThirdCoverPrototypeScene({ project, step }: { project: ProjectDefinition; step: number }) {
  const spec = getThirdCoverPrototypeSpec(project.slug);
  const isSite = project.kind === "simple-site";
  return <div className={`first-cover-stage third-cover-stage third-cover--${spec.theme}`} data-third-cover-marker={spec.marker}>
    <div className="first-cover-product third-cover-product">
      <div className="first-cover-browser"><span>● ● ●</span><b>{project.title}</b><i>{isSite ? "готовый сайт" : "готовый ИИ-агент"}</i></div>
      <main><ThirdCoverBody slug={project.slug} detail={step >= 8} /></main>
    </div>
    <aside className="first-cover-result"><small>{spec.eyebrow}</small><h3>{spec.headline}</h3><div><b>{spec.metric}</b><span>{spec.status}</span></div><p>На обложке — главный рабочий экран именно этого проекта, а не общая декоративная картинка.</p><span className="first-cover-ready">✓ {isSite ? "Сайт готов" : "Агент готов"}</span></aside>
  </div>;
}
