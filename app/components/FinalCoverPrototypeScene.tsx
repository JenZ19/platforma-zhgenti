"use client";

import { getFinalCoverPrototypeSpec } from "../content/final-cover-prototypes";
import type { ProjectDefinition } from "../content/types";

function CourseSite({ detail }: { detail: boolean }) {
  return <div className="final-course"><nav><b>МЯГКИЙ СТАРТ</b><span>Программа · Формат · Тарифы · FAQ</span><button>Выбрать тариф</button></nav><main><section><small>ОНЛАЙН-КУРС · 4 НЕДЕЛИ</small><h4>Первый сайт — спокойно и по шагам</h4><p>Шесть практических модулей, шаблоны и результат после каждого урока.</p><button>Посмотреть программу ↓</button></section><aside><div><b>4</b><span>недели практики</span></div><div><b>6</b><span>готовых модулей</span></div></aside></main><footer>{["Старт", "Структура", "Дизайн", "Сборка", "Публикация", "Портфолио"].slice(0, detail ? 6 : 4).map((item, index) => <span key={item}><i>0{index + 1}</i>{item}</span>)}</footer></div>;
}

function EventSite({ detail }: { detail: boolean }) {
  return <div className="final-event"><nav><b>BE BRAVE / ONLINE</b><span>Программа · Спикеры · Вопросы</span><button>Регистрация</button></nav><main><section><small>ОНЛАЙН-МАСТЕРСКАЯ</small><h4>Смелая идея.<br />Первый запуск.</h4><p>Вечер для тех, кто хочет перестать откладывать свой проект.</p><button>Зарегистрироваться →</button></section><aside><div><b>28</b><span>АВГУСТА</span></div><p><b>19:00</b><span>МОСКВА · ОНЛАЙН</span></p></aside></main>{detail && <footer><span>19:00 Вход и знакомство</span><span>19:15 Практика</span><span>20:10 Вопросы</span></footer>}</div>;
}

function SmallShopSite({ detail }: { detail: boolean }) {
  const items = [["☕", "Чашка «Облако»", "2 400 ₽"], ["◡", "Тарелка «Песок»", "1 900 ₽"], ["◇", "Ваза «Утро»", "3 600 ₽"]];
  return <div className="final-shop"><nav><b>ТЁПЛЫЙ ДОМ</b><span>Коллекция · О мастерской · Доставка</span><button>Заказать</button></nav><header><div><small>КЕРАМИКА РУЧНОЙ РАБОТЫ</small><h4>Вещи, которые хочется оставить надолго</h4></div><span>Новая коллекция · 2026</span></header><section>{items.slice(0, detail ? 3 : 2).map(([icon, title, price], index) => <article key={title} className={`shop-item s${index}`}><div>{icon}</div><p><b>{title}</b><span>{price}</span></p></article>)}</section><footer>Наличие и доставка подтверждаются мастером перед заказом.</footer></div>;
}

function PortfolioSite({ detail }: { detail: boolean }) {
  return <div className="final-personal-portfolio"><nav><b>ELINA / AI CREATOR</b><span>Проекты · Навыки · Обо мне</span><button>Обсудить задачу</button></nav><header><small>СОЗДАЮ БЕЗ КОДА</small><h4>ИИ-сервисы, боты и сайты, которыми удобно пользоваться</h4><div><b>5</b><span>работ в портфолио</span></div></header><section>{[["01", "Семейный планер", "СЕРВИС"], ["02", "ИИ-консультант", "АГЕНТ"], ["03", "Сайт эксперта", "САЙТ"]].slice(0, detail ? 3 : 2).map(([num, title, type]) => <article key={title}><small>{num} / {type}</small><b>{title}</b><span>Учебный проект · открыть ↗</span></article>)}</section></div>;
}

function ExpertProSite({ detail }: { detail: boolean }) {
  const flow = [["01", "Заявка", "Анна · новый запрос"], ["02", "Уведомление", "получено владельцем"], ["03", "Тестовая оплата", "1 ₽ · успешно"], ["04", "Подарок", "чек-лист выдан"]];
  return <div className="final-expert-pro"><header><div><small>ПРОГРАММА ЭКСПЕРТА</small><h4>Путь клиента проверен</h4></div><span>ТЕСТОВЫЙ РЕЖИМ</span></header><main><aside><small>НОВАЯ ЗАЯВКА</small><h5>Анна</h5><p>Нужна вводная консультация</p><button>Открыть карточку →</button></aside><section>{flow.slice(0, detail ? 4 : 3).map(([num, title, result], index) => <article key={title}><i className={index < 3 ? "done" : ""}>{index < 3 ? "✓" : num}</i><p><b>{title}</b><span>{result}</span></p></article>)}</section></main><footer><b>Следующий шаг:</b> выбрать удобное время встречи</footer></div>;
}

function SchoolProSite({ detail }: { detail: boolean }) {
  const plans = [["СТАРТ", "Самостоятельно", "19 900 ₽"], ["С ПОДДЕРЖКОЙ", "Проверка куратора", "39 900 ₽"], ["VIP", "Личные разборы", "69 900 ₽"]];
  return <div className="final-school-pro"><header><div><small>ОНЛАЙН-ШКОЛА · 6 МОДУЛЕЙ</small><h4>Выберите свой формат</h4></div><span>ТЕСТОВАЯ ОПЛАТА</span></header><section>{plans.map(([name, desc, price], index) => <article key={name} className={index === 1 ? "popular" : ""}><small>{index === 1 ? "ЧАЩЕ ВЫБИРАЮТ" : name}</small><h5>{desc}</h5><b>{price}</b><p>6 модулей<br />Шаблоны<br />Доступ к материалам</p>{detail && <button>{index === 1 ? "Выбрать тариф" : "Подробнее"}</button>}</article>)}</section><footer>После тестовой регистрации → памятка ученика.pdf</footer></div>;
}

function ServiceProSite({ detail }: { detail: boolean }) {
  return <div className="final-calculator"><aside><small>РАСЧЁТ УСЛУГИ</small><h4>Уборка квартиры</h4><p>Получите ориентир стоимости за минуту.</p><div><label htmlFor="area-range">Площадь квартиры <b>45 м²</b></label><input id="area-range" type="range" min="20" max="100" value="45" readOnly /><div style={{ display: "flex", justifyContent: "space-between", color: "#d5daf2", fontSize: 6 }}>Количество комнат <b style={{ color: "white" }}>2</b></div><div className="calc-pills"><span>1</span><b>2</b><span>3+</span></div></div></aside><main><small>ОРИЕНТИР СТОИМОСТИ</small><h5>27 000 ₽</h5><p>Финальная цена подтверждается после уточнения деталей.</p>{detail && <ul><li>✓ Инвентарь включён</li><li>✓ Время — около 4 часов</li></ul>}<button>Запросить точный расчёт →</button><footer>Расчёт не является договорной ценой.</footer></main></div>;
}

function CatalogProSite({ detail }: { detail: boolean }) {
  const products = [["◯", "Свеча «Инжир»", "2 100 ₽"], ["◇", "Диффузор «Лес»", "2 800 ₽"], ["▢", "Набор «Вечер»", "3 900 ₽"]];
  return <div className="final-catalog"><header><div><small>КОЛЛЕКЦИЯ ДЛЯ ДОМА</small><h4>Каталог</h4></div><div><span>⌕ Поиск</span><b>Корзина · 2</b></div></header><nav><b>Все 12</b><span>До 3 000 ₽</span><span>Свечи</span><span>Наборы</span></nav><main><section>{products.map(([icon, title, price], index) => <article key={title}><div className={`catalog-photo c${index}`}>{icon}</div><small>В НАЛИЧИИ</small><b>{title}</b><p>{price}<button>＋</button></p></article>)}</section>{detail && <aside><small>КОРЗИНА-ЗАЯВКА</small><h5>2 товара</h5><p>Свеча «Инжир»</p><p>Набор «Вечер»</p><b>6 000 ₽</b><button>Оформить тестовый заказ</button></aside>}</main></div>;
}

function GraduatePortfolio({ detail }: { detail: boolean }) {
  return <div className="final-graduate"><aside><div>✦</div><small>ВЫПУСКНИЦА 2026</small><h4>Элина<br />ИИ-креатор</h4><p>Создаю полезные сервисы, агентов и сайты без кода.</p><button>Обсудить проект →</button><footer>Доступна для первого проекта</footer></aside><main><header><div><small>ИЗБРАННЫЕ РАБОТЫ</small><h5>Моё портфолио</h5></div><span>5 проектов</span></header><section>{[["01", "Семейный органайзер", "СЕРВИС"], ["02", "Помощник эксперта", "ИИ-АГЕНТ"], ["03", "Сайт консультации", "САЙТ"]].slice(0, detail ? 3 : 2).map(([num, title, type]) => <article key={title}><i>{num}</i><p><b>{title}</b><small>{type} · учебный проект</small></p><span>↗</span></article>)}</section><footer><small>ПЕРВАЯ УСЛУГА</small><b>Сайт за 7 дней</b><span>понятный пакет и чек-лист передачи</span></footer></main></div>;
}

function FinalCoverBody({ slug, detail }: { slug: string; detail: boolean }) {
  switch (slug) {
    case "course-site": return <CourseSite detail={detail} />;
    case "event-site": return <EventSite detail={detail} />;
    case "small-shop-site": return <SmallShopSite detail={detail} />;
    case "portfolio-site": return <PortfolioSite detail={detail} />;
    case "expert-pro-site": return <ExpertProSite detail={detail} />;
    case "school-pro-site": return <SchoolProSite detail={detail} />;
    case "service-pro-site": return <ServiceProSite detail={detail} />;
    case "catalog-pro-site": return <CatalogProSite detail={detail} />;
    case "graduate-portfolio": return <GraduatePortfolio detail={detail} />;
    default: getFinalCoverPrototypeSpec(slug); return null;
  }
}

export function FinalCoverPrototypeScene({ project, step }: { project: ProjectDefinition; step: number }) {
  const spec = getFinalCoverPrototypeSpec(project.slug);
  return <div className={`first-cover-stage final-cover-stage final-cover--${spec.theme}`} data-final-cover-marker={spec.marker}>
    <div className="first-cover-product final-cover-product">
      <div className="first-cover-browser"><span>● ● ●</span><b>{project.title}</b><i>{project.kind === "portfolio" ? "финальная работа" : "готовый сайт"}</i></div>
      <main><FinalCoverBody slug={project.slug} detail={step >= 8} /></main>
    </div>
    <aside className="first-cover-result"><small>{spec.eyebrow}</small><h3>{spec.headline}</h3><div><b>{spec.metric}</b><span>{spec.status}</span></div><p>На обложке показан финальный рабочий результат именно этого квеста.</p><span className="first-cover-ready">✓ Готово для портфолио</span></aside>
  </div>;
}
