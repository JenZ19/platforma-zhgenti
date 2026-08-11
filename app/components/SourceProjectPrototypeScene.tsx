"use client";

import type { ProjectDefinition } from "../content/types";

export const sourcePrototypeSlugs = ["carousel-agent", "threads-agent", "webinar-moderator-agent", "family-health-hub"] as const;

export function isSourcePrototypeSlug(slug: string): slug is (typeof sourcePrototypeSlugs)[number] {
  return sourcePrototypeSlugs.includes(slug as (typeof sourcePrototypeSlugs)[number]);
}

const sourceTitles: Record<(typeof sourcePrototypeSlugs)[number], string[]> = {
  "carousel-agent": ["Готовый PNG-альбом","Моя версия Карусельщика","Материалы подтверждены","Проект создан автоматически","Доступ ограничен","Текст сохранён дословно","Фото или путь без фото","CTA и ник готовы","Выбран способ отрисовки","Выбраны стиль и палитра","Фотографии распределены","PNG-альбом получен","Один слайд переделан","Путь пройден с телефона","Личный агент работает","Копия для заказчика готова","Два Карусельщика в портфолио"],
  "threads-agent": ["10 тредов на сегодня","Моя версия редактора","Профиль и источники собраны","Проект создан автоматически","Telegram-панель подключена","Свои источники добавлены","Внешние источники подписаны","Факт сохранён с источником","Паспорт голоса готов","Расписание настроено","Подборка /now получена","Все треды проверены","Решения автора сохранены","Ещё 5 тредов получены","Ежедневный агент работает","Клиентский голос настроен","Два редактора в портфолио"],
  "webinar-moderator-agent": ["Карточка вопроса готова","Правила школы сохранены","Материалы вебинара собраны","Модератор создан","Права сотрудника ограничены","Telegram-панель подключена","Шаблоны и база разделены","Комната и время настроены","Сессия GetCourse активна","Чтение чата откалибровано","Режим observe проверен","FAQ и дайджест работают","Режим assist проверен","Лимиты auto работают","Модератор готов к эфиру","Копия для другой школы","Два модератора в портфолио"],
  "family-health-hub": ["Семейная сводка готова","Мой закрытый хаб","Профили и правила собраны","Чистый healthtablo создан","Хаб закрыт от посторонних","Профили семьи разделены","PDF во входящих","Весь документ разобран","Неразобранное проверено","Значения сверены с PDF","Графики проверены","Семейные разделы собраны","Напоминание работает","Копия и пароль проверены","Личный хаб готов","Чистая копия для заказчика","Два хаба в портфолио"],
};

export function getSourcePrototypeTitle(slug: string, step: number): string | undefined {
  return isSourcePrototypeSlug(slug) ? sourceTitles[slug][step - 1] : undefined;
}

function CarouselPrototype() {
  return <div className="source-ui carousel-ui" data-source-prototype="carousel">
    <header><div><span>К</span><b>Карусельщик</b></div><i>● готово</i></header>
    <section className="carousel-slides">
      <article className="cover"><small>01</small><strong>ИДЕЯ,<br/>КОТОРУЮ<br/>СОХРАНЯТ</strong><em>ваш текст без сокращений</em></article>
      <article><small>02</small><b>Главная мысль</b><p>Основной текст сохранён дословно и разложен по смыслу.</p></article>
      <article className="cta"><small>07</small><b>Сохраните,<br/>чтобы не потерять</b><p>@yourname</p></article>
    </section>
    <footer><div><b>PNG-альбом</b><small>7 слайдов · Telegram</small></div><span>11 стилей</span><button>Переделать слайд</button></footer>
  </div>;
}

function ThreadsPrototype() {
  return <div className="source-ui threads-ui" data-source-prototype="threads">
    <header><div><span>＠</span><div><b>Threads-редактор</b><small>Сегодня · 10 тредов</small></div></div><button>＋ Ещё 5</button></header>
    <main>
      <article><small>01 · ЛИЧНЫЙ ОПЫТ</small><p>Самая полезная система — та, которую можно открыть между двумя обычными делами.</p><footer><span>386 / 500</span><i>Свой источник</i></footer><div><button>❌ Не беру</button><button>✅ Уже выложила</button></div></article>
      <article><small>02 · НАБЛЮДЕНИЕ</small><p>Людям нужен не ещё один список задач. Им нужен следующий понятный шаг.</p><footer><span>241 / 500</span><i>Источник ↗</i></footer><div><button>❌ Не беру</button><button>✅ Уже выложила</button></div></article>
    </main>
    <aside><span>Голос сохранён</span><span>Хуки не повторяются</span><button>↻ Перегенерировать</button></aside>
  </div>;
}

function WebinarPrototype() {
  return <div className="source-ui webinar-ui" data-source-prototype="webinar">
    <header><div><span>W</span><div><b>Модератор эфира</b><small>GetCourse · тестовая комната</small></div></div><nav><b>observe</b><span>assist</span><span>auto</span></nav></header>
    <main>
      <section><small>ВОПРОС ИЗ ЧАТА · 19:42</small><h3>Анна</h3><p>Запись вебинара будет доступна после эфира?</p><div className="webinar-answer"><b>Подтверждённый шаблон</b><p>Да, запись появится в личном кабинете в течение суток.</p><small>Источник: FAQ вебинара · пункт 4</small></div><footer><button>Ответить</button><button>Шаблон</button><button>Пропустить</button></footer></section>
      <aside><small>СЕГОДНЯ</small><b>24</b><span>сообщения</span><b>7</b><span>вопросов</span><hr/><p>Ничего не отправлено автоматически</p></aside>
    </main>
    <footer><span>FAQ-кандидаты · 2</span><span>Дайджест готов</span><b>Удаление и блокировка запрещены</b></footer>
  </div>;
}

function HealthPrototype() {
  return <div className="source-ui health-ui" data-source-prototype="health">
    <header><div><span>＋</span><div><b>Здоровье семьи</b><small>Закрытый семейный архив</small></div></div><button>＋ Добавить PDF</button></header>
    <nav><b>Сводка</b><span>Документы</span><span>Показатели</span><span>Напоминания</span></nav>
    <main><section><small>ПРОФИЛИ СЕМЬИ</small><div className="health-profiles"><i>МА</i><i>ПА</i><i>Р</i><i className="pet">🐾</i></div><article><div><small>Последний документ</small><b>Лабораторный PDF</b><span>12 августа · 24 строки</span></div><em>Проверено 8 из 10</em></article><div className="health-chart"><small>История показателя · единица не менялась</small><svg viewBox="0 0 300 65" aria-hidden="true"><path d="M5 48 C50 40 68 52 105 29 S170 45 205 20 S260 28 295 8"/><circle cx="105" cy="29" r="4"/><circle cx="205" cy="20" r="4"/></svg></div></section><aside><small>ТРЕБУЕТ ПРОВЕРКИ</small><b>3</b><span>Неразобранные строки</span><p>Оригинальный фрагмент сохранён</p><button>Открыть и сверить</button></aside></main>
    <footer><b>Не ставит диагноз и не назначает лечение</b><span>Пароль включён · резервная копия готова</span></footer>
  </div>;
}

export function SourceProjectPrototypeScene({ project, step, mobile = false }: { project: ProjectDefinition; step: number; mobile?: boolean }) {
  if (!isSourcePrototypeSlug(project.slug)) return null;
  return <div className={`source-prototype-frame ${mobile ? "is-mobile" : ""}`} data-source-step={step}>
    {project.slug === "carousel-agent" ? <CarouselPrototype /> : project.slug === "threads-agent" ? <ThreadsPrototype /> : project.slug === "webinar-moderator-agent" ? <WebinarPrototype /> : <HealthPrototype />}
  </div>;
}
