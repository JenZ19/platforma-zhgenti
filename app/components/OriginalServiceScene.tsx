"use client";

type Stage =
  | "final"
  | "concept"
  | "data"
  | "workspace"
  | "passport"
  | "foundation"
  | "expense"
  | "categories"
  | "task"
  | "focus"
  | "capture"
  | "organize"
  | "search"
  | "activity"
  | "week"
  | "morning"
  | "style"
  | "feature"
  | "flow"
  | "backup"
  | "phone"
  | "publish"
  | "client-copy"
  | "client-brief"
  | "portfolio";

const familyStages: Stage[] = [
  "final",
  "concept",
  "data",
  "workspace",
  "passport",
  "foundation",
  "expense",
  "categories",
  "style",
  "feature",
  "flow",
  "backup",
  "phone",
  "publish",
  "client-copy",
  "client-brief",
  "portfolio",
];
const plannerStages: Stage[] = [
  "final",
  "concept",
  "data",
  "workspace",
  "passport",
  "foundation",
  "task",
  "focus",
  "style",
  "feature",
  "flow",
  "backup",
  "phone",
  "publish",
  "client-copy",
  "client-brief",
  "portfolio",
];
const ideaStages: Stage[] = [
  "final",
  "concept",
  "data",
  "workspace",
  "passport",
  "foundation",
  "capture",
  "organize",
  "style",
  "feature",
  "search",
  "backup",
  "phone",
  "publish",
  "client-copy",
  "client-brief",
  "portfolio",
];
const childStages: Stage[] = [
  "final",
  "concept",
  "data",
  "workspace",
  "passport",
  "foundation",
  "activity",
  "week",
  "style",
  "feature",
  "morning",
  "backup",
  "phone",
  "publish",
  "client-copy",
  "client-brief",
  "portfolio",
];

function ConceptPalette({
  name,
  colors,
}: {
  name: string;
  colors: [string, string, string, string];
}) {
  return (
    <div className="concept-palette" data-palette-choice={name}>
      <small>07 · ЦВЕТОВАЯ ГАММА</small>
      <span aria-hidden="true">
        {colors.map((color) => <i key={color} style={{ backgroundColor: color }} />)}
      </span>
      <b>{name}</b>
    </div>
  );
}

function BudgetHeader({ stage }: { stage: Stage }) {
  return (
    <header className="os-budget-head">
      <div>
        <small>НАШ СЕМЕЙНЫЙ БЮДЖЕТ</small>
        <h3>
          {stage === "publish"
            ? "Спокойный бюджет опубликован"
            : "Август без сюрпризов"}
        </h3>
      </div>
      <button>
        {stage === "publish" ? "Открыть ссылку ↗" : "＋ Добавить расход"}
      </button>
    </header>
  );
}

function Concept() {
  return (
    <div className="os-concept">
      <header>
        <small>КОНСТРУКТОР МОЕЙ ВЕРСИИ</small>
        <h3>Какой будет ваш бюджет?</h3>
        <p>Шесть смысловых решений и своя цветовая гамма делают проект вашим.</p>
      </header>
      <div className="os-concept-grid">
        {[
          ["01", "Для кого", "Семья с детьми"],
          ["02", "Главная задача", "Остаток месяца"],
          ["03", "Название", "Наш семейный бюджет"],
          ["04", "Экран", "Воздушные карточки"],
          ["05", "Тон", "Мягко"],
          ["06", "Особенность", "Дни без покупок"],
        ].map(([num, label, value]) => (
          <article key={num}>
            <i>{num}</i>
            <small>{label}</small>
            <b>{value}</b>
            <span>выбрано ✓</span>
          </article>
        ))}
      </div>
      <footer>
        <p>
          «Наш семейный бюджет» помогает семье с детьми видеть остаток месяца.
        </p>
        <ConceptPalette name="Мятная свежесть" colors={["#F3F8F5", "#FFFFFF", "#2F6B5D", "#20352F"]} />
        <button>Сохранить мою версию</button>
      </footer>
    </div>
  );
}

function DataCheck() {
  return (
    <div className="os-data">
      <aside>
        <small>КОРОТКИЙ РАЗГОВОР</small>
        <h3>4 простых ответа</h3>
        {[
          ["Бюджет и валюта", "100 000 ₽"],
          ["Начало месяца", "1-е число"],
          ["Категории", "5 названий"],
          ["Недавние расходы", "3 примера"],
        ].map(([label, value], index) => (
          <div key={label} className={index === 2 ? "active" : ""}>
            <i>{index + 1}</i>
            <span>
              <b>{label}</b>
              <small>{value}</small>
            </span>
            <strong>✓</strong>
          </div>
        ))}
      </aside>
      <main>
        <header>
          <b>Codex задаёт по одному вопросу</b>
          <span>Можно ответить голосом</span>
        </header>
        <div className="os-codex-chat">
          <div className="codex">
            <small>CODEX</small>
            <p>Какой примерный бюджет семьи на месяц?</p>
          </div>
          <div className="learner">
            <small>ВЫ</small>
            <p>Около 100 000 рублей.</p>
          </div>
          <div className="codex">
            <small>CODEX</small>
            <p>Какие категории вы используете чаще всего?</p>
          </div>
          <div className="voice-answer"><i>◉</i><span><b>Голосовой ответ</b><small>Продукты, ребёнок, дом, транспорт…</small></span><strong>0:08</strong></div>
        </div>
        <footer>
          Папки и таблицы создаст Codex <b>Вы только отвечаете ✓</b>
        </footer>
      </main>
    </div>
  );
}

function Workspace({ stage }: { stage: Stage }) {
  return (
    <div className="os-workspace">
      <aside>
        <b>Codex</b>
        <button>＋ Новая задача</button>
        <small>ПРОЕКТЫ</small>
        <span className="active">◇ family-expenses</span>
        <span>◇ planner</span>
      </aside>
      <main>
        <header>
          <b>{stage === "workspace" ? "family-expenses" : "Паспорт проекта"}</b>
          <span>{stage === "workspace" ? "создано Codex автоматически ✓" : "сохранено Codex ✓"}</span>
        </header>
        {stage === "workspace" ? (
          <div className="os-folder">
            <i>◇</i>
            <h3>family-expenses</h3>
            <p>Codex сам создал рабочее место</p>
            <div>✓ Папка&nbsp;&nbsp; ✓ Данные&nbsp;&nbsp; ✓ Настройки&nbsp;&nbsp; · ничего вручную</div>
          </div>
        ) : (
          <div className="os-passport">
            <small>МОЯ ВЕРСИЯ</small>
            <h3>Наш семейный бюджет</h3>
            {[
              ["Для кого", "Семья с детьми"],
              ["Главное", "Остаток месяца"],
              ["Экран", "Воздушные карточки"],
              ["Гамма", "Мятная свежесть"],
              ["Фишка", "Дни без покупок"],
            ].map(([label, value]) => (
              <p key={label}>
                <span>{label}</span>
                <b>{value}</b>
              </p>
            ))}
            <footer>Основа: расходы · итоги · история · CSV · JSON</footer>
          </div>
        )}
      </main>
    </div>
  );
}

function BudgetDashboard({ stage }: { stage: Stage }) {
  const editing = stage === "backup";
  const showForm = ["expense", "categories", "flow", "backup"].includes(stage);
  return (
    <div className={`os-budget ${stage}`}>
      <BudgetHeader stage={stage} />
      <section className="os-metrics">
        <article>
          <small>БЮДЖЕТ</small>
          <b>100 000 ₽</b>
          <span>Август 2026</span>
        </article>
        <article>
          <small>ПОТРАЧЕНО</small>
          <b>{editing ? "8 120 ₽" : "4 740 ₽"}</b>
          <span>за 3 категории</span>
        </article>
        <article className="accent">
          <small>ОСТАЛОСЬ</small>
          <b>{editing ? "91 880 ₽" : "95 260 ₽"}</b>
          <span>до конца месяца</span>
        </article>
      </section>
      <main>
        <section className="os-budget-left">
          {showForm ? (
            <div className="os-expense-form">
              <header>
                <small>{editing ? "ИЗМЕНИТЬ РАСХОД" : "НОВЫЙ РАСХОД"}</small>
                <b>{editing ? "Продукты" : "Добавьте покупку"}</b>
              </header>
              <div className="os-field">
                <span>Сумма</span>
                <div>{editing ? "3 250" : "3 450"} ₽</div>
              </div>
              <div className="os-field">
                <span>Категория</span>
                <div>Продукты⌄</div>
              </div>
              <div className="os-field">
                <span>Комментарий</span>
                <div>Супермаркет</div>
              </div>
              <button>
                {editing ? "Сохранить изменение" : "Сохранить расход"}
              </button>
            </div>
          ) : (
            <div className="os-category-chart">
              <header>
                <b>Куда ушли деньги</b>
                <span>Все категории⌄</span>
              </header>
              {[
                ["Продукты", "3 450 ₽", "78%"],
                ["Ребёнок", "1 290 ₽", "42%"],
                ["Транспорт", "780 ₽", "25%"],
              ].map(([name, value, width], index) => (
                <div key={name}>
                  <p>
                    <b>{name}</b>
                    <span>{value}</span>
                  </p>
                  <i>
                    <b style={{ width }} className={`c${index}`} />
                  </i>
                </div>
              ))}
            </div>
          )}
          {stage === "feature" && (
            <div className="os-feature">
              <i>✦</i>
              <div>
                <small>ВАША ОСОБЕННОСТЬ</small>
                <b>3 дня без покупок</b>
                <p>Лучшая серия месяца</p>
              </div>
              <span>Пн · Ср · Пт</span>
            </div>
          )}
          {stage === "flow" && (
            <div className="os-flow">
              {["Добавить", "История", "Категория", "Новый итог"].map(
                (item, index) => (
                  <span key={item}>
                    <i>✓</i>
                    <b>{item}</b>
                    {index < 3 && <em>→</em>}
                  </span>
                ),
              )}
            </div>
          )}
          {stage === "backup" && (
            <div className="os-export">
              <button>↓ Скачать CSV</button>
              <button>↓ Сохранить JSON</button>
              <span>3 записи · готово</span>
            </div>
          )}
        </section>
        <aside>
          <header>
            <b>Последние расходы</b>
            <span>Продукты⌄</span>
          </header>
          {[
            ["Продукты", "3 450 ₽", "Сегодня"],
            ["Ребёнок", "1 290 ₽", "Вчера"],
            ["Транспорт", "780 ₽", "14 августа"],
          ].map(([name, value, date], index) => (
            <article
              key={name}
              className={index === 0 && editing ? "editing" : ""}
            >
              <i>{["●", "◆", "▲"][index]}</i>
              <p>
                <b>{name}</b>
                <small>{date}</small>
              </p>
              <strong>{index === 0 && editing ? "3 250 ₽" : value}</strong>
            </article>
          ))}
          {stage === "style" && (
            <div className="os-style-note">
              <b>Мятная свежесть</b>
              <span>Воздушные карточки · крупные цифры</span>
            </div>
          )}
          {stage === "phone" && (
            <div className="os-phone-check">
              <i>▯</i>
              <p>
                <b>390 px проверено</b>
                <span>Кнопки удобно нажимать одной рукой</span>
              </p>
              <strong>✓</strong>
            </div>
          )}
          {stage === "publish" && (
            <div className="os-live-link">
              https://family-budget.example.site <b>↗</b>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

function ClientStage({ stage }: { stage: Stage }) {
  if (stage === "client-copy")
    return (
      <div className="os-client-copy">
        <header>
          <small>ШАГ 15 · БЕЗОПАСНАЯ КОПИЯ</small>
          <h3>Личное остаётся личным</h3>
          <p>Для заказчика создаётся отдельный проект.</p>
        </header>
        <main>
          <article>
            <span>МОЯ ВЕРСИЯ</span>
            <i>◇</i>
            <h4>family-expenses</h4>
            <p>Наш семейный бюджет</p>
            <b>Не изменяется ✓</b>
          </article>
          <strong>→</strong>
          <article className="client">
            <span>КОПИЯ ДЛЯ ЗАКАЗЧИКА</span>
            <i>◇</i>
            <h4>family-expenses-client</h4>
            <p>Готова к адаптации</p>
            <b>Создана отдельно ✓</b>
          </article>
        </main>
      </div>
    );
  if (stage === "client-brief")
    return (
      <div className="os-client-brief">
        <aside>
          <small>БРИФ ЗАКАЗЧИКА</small>
          <h3>8 коротких ответов</h3>
          {[
            "Кто ведёт бюджет?",
            "Что видно сразу?",
            "Бюджет и валюта?",
            "Какие категории?",
            "Какой тон?",
            "Какой стиль?",
            "Какая функция?",
            "Что нельзя показывать?",
          ].map((item, index) => (
            <p key={item}>
              <i>{index + 1}</i>
              <span>{item}</span>
              <b>{index < 6 ? "✓" : "—"}</b>
            </p>
          ))}
        </aside>
        <main>
          <small>ЭКРАН СОГЛАСОВАНИЯ</small>
          <h3>Было → стало</h3>
          {[
            ["Название", "Наш семейный бюджет", "Бюджет Марины"],
            ["Стиль", "Мятный", "Тёплый бежевый"],
            ["Фишка", "Дни без покупок", "Цель накопления"],
          ].map((row) => (
            <div key={row[0]}>
              <small>{row[0]}</small>
              <span>{row[1]}</span>
              <b>→</b>
              <strong>{row[2]}</strong>
            </div>
          ))}
          <button>Отправить на согласование</button>
        </main>
      </div>
    );
  return (
    <div className="os-portfolio">
      <header>
        <span>ПОРТФОЛИО · ДВЕ ВЕРСИИ</span>
        <h3>Семейный бюджет, который умею адаптировать</h3>
        <p>От своей идеи — к клиентскому результату.</p>
      </header>
      <main>
        <article>
          <small>ЛИЧНАЯ ВЕРСИЯ</small>
          <h4>Наш семейный бюджет</h4>
          <p>Остаток месяца · Мятная свежесть</p>
          <div>Дни без покупок</div>
        </article>
        <article className="client">
          <small>КЛИЕНТСКАЯ ВЕРСИЯ</small>
          <h4>Бюджет Марины</h4>
          <p>Цель накопления · Тёплый бежевый</p>
          <div>Адаптация по тестовому брифу</div>
        </article>
      </main>
      <footer>
        <b>Моя услуга</b>
        <span>
          Адаптирую семейный бюджет под ваши категории, стиль и одну особенную
          функцию.
        </span>
        <button>Показать проект ↗</button>
      </footer>
    </div>
  );
}

function PlannerConcept() {
  return (
    <div className="op-concept">
      <header>
        <small>КОНСТРУКТОР МОЕГО РИТМА</small>
        <h3>Как будет помогать ваш планер?</h3>
        <p>Шесть решений и выбранная гамма — и шаблон становится личным.</p>
      </header>
      <main>
        {[
          ["01", "Для кого", "Мама с малышом"],
          ["02", "Задача", "Разгрузить голову"],
          ["03", "Название", "Дела без паники"],
          ["04", "Экран", "Стикеры"],
          ["05", "Тон", "Заботливо"],
          ["06", "Функция", "Режим одной руки"],
        ].map(([n, l, v]) => (
          <article key={n}>
            <i>{n}</i>
            <small>{l}</small>
            <b>{v}</b>
            <span>выбрано ✓</span>
          </article>
        ))}
      </main>
      <footer>
        <p>
          «Дела без паники» помогает увидеть одно главное и спокойно пройти
          день.
        </p>
        <ConceptPalette name="Пудровое тепло" colors={["#FFF5F4", "#FFFFFF", "#8E4F5B", "#3F2C33"]} />
        <button>Сохранить мою версию</button>
      </footer>
    </div>
  );
}

function PlannerData() {
  return (
    <div className="op-data">
      <aside>
        <small>МАТЕРИАЛЫ ПЛАНЕРА</small>
        <h3>Неделя собрана</h3>
        {[
          ["мои-дела.txt", "7 дел · проверено"],
          ["правила-планера.txt", "1 главное в день"],
          ["вид-планера.txt", "спокойный экран"],
        ].map(([file, note], index) => (
          <div className={index === 0 ? "active" : ""} key={file}>
            <i>{index === 0 ? "▤" : "≡"}</i>
            <span>
              <b>{file}</b>
              <small>{note}</small>
            </span>
            <strong>✓</strong>
          </div>
        ))}
      </aside>
      <main>
        <header>
          <b>мои-дела.txt</b>
          <span>Без личных подробностей ✓</span>
        </header>
        <section>
          <div>
            <b>Что сделать</b>
            <b>День</b>
            <b>Приоритет</b>
            <b>Готово</b>
          </div>
          {[
            ["Записать к врачу", "Вт", "Важно", "Нет"],
            ["Купить продукты", "Ср", "Обычно", "Нет"],
            ["30 минут на себя", "Пт", "Бережно", "Нет"],
          ].map((row) => (
            <div key={row[0]}>
              {row.map((cell) => (
                <span key={cell}>{cell}</span>
              ))}
            </div>
          ))}
        </section>
        <footer>
          Адресов и телефонов нет <b>Можно продолжать ✓</b>
        </footer>
      </main>
    </div>
  );
}

function PlannerWorkspace({ stage }: { stage: Stage }) {
  return (
    <div className="op-workspace">
      <aside>
        <b>⌘ Codex</b>
        <button>＋ Новая задача</button>
        <button className="active">▱ Открыть папку</button>
        <small>ПРОЕКТЫ</small>
        <span className="selected">◇ planner</span>
        <span>◇ family-expenses</span>
      </aside>
      <main>
        <header>
          <b>{stage === "workspace" ? "planner" : "Паспорт планера"}</b>
          <span>рабочая папка ✓</span>
        </header>
        {stage === "workspace" ? (
          <div className="op-folder">
            <i>◇</i>
            <h3>planner</h3>
            <p>Открыта отдельная рабочая папка</p>
            <div>Документы / planner</div>
          </div>
        ) : (
          <div className="op-passport">
            <small>МОЙ РИТМ</small>
            <h3>Дела без паники</h3>
            {[
              ["Для кого", "Мама с малышом"],
              ["Главное", "Разгрузить голову"],
              ["Экран", "Стикеры"],
              ["Гамма", "Пудровое тепло"],
              ["Функция", "Режим одной руки"],
            ].map(([l, v]) => (
              <p key={l}>
                <span>{l}</span>
                <b>{v}</b>
              </p>
            ))}
            <footer>
              Основа: сегодня · неделя · готово · перенести на завтра
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}

function PlannerDashboard({ stage }: { stage: Stage }) {
  const showNew = stage === "task";
  const completed = stage === "flow" || stage === "backup";
  return (
    <div className={`op-planner ${stage}`}>
      <header>
        <div>
          <small>ДЕЛА БЕЗ ПАНИКИ</small>
          <h3>
            {stage === "publish"
              ? "Мой планер опубликован"
              : "Спокойный вторник"}
          </h3>
        </div>
        <button>
          {stage === "publish" ? "Открыть ссылку ↗" : "＋ Добавить дело"}
        </button>
      </header>
      <nav>
        <span className="active">Сегодня</span>
        <span>Неделя</span>
        <span>Можно позже</span>
        <b>18 августа</b>
      </nav>
      <main>
        <section>
          <div className="op-focus">
            <small>ГЛАВНОЕ СЕГОДНЯ</small>
            <i>01</i>
            <h4>Записать ребёнка к врачу</h4>
            <p>Важно · до 14:00</p>
            <button>{completed ? "Готово ✓" : "Отметить готово"}</button>
          </div>
          {showNew ? (
            <div className="op-form">
              <small>НОВОЕ ДЕЛО</small>
              <div className="op-field">
                <span>Что сделать</span>
                <div>Записать ребёнка к врачу</div>
              </div>
              <div className="op-field">
                <span>День и приоритет</span>
                <div>Сегодня · Важно</div>
              </div>
              <button>Сохранить дело</button>
            </div>
          ) : (
            <div className="op-tasks">
              {[
                ["Купить продукты", "Сегодня · Обычно"],
                ["30 минут на себя", "Сегодня · Бережно"],
                ["Забрать заказ", "Завтра · Обычно"],
              ].map(([title, note], index) => (
                <article
                  key={title}
                  className={completed && index === 0 ? "done" : ""}
                >
                  <i>{completed && index === 0 ? "✓" : "○"}</i>
                  <p>
                    <b>{title}</b>
                    <small>{note}</small>
                  </p>
                  <button>{index === 2 ? "Перенести на завтра" : "•••"}</button>
                </article>
              ))}
            </div>
          )}
          {stage === "feature" && (
            <div className="op-one-hand">
              <span>☝</span>
              <p>
                <small>ВАША ФУНКЦИЯ</small>
                <b>Режим одной руки включён</b>
              </p>
              <strong>✓</strong>
            </div>
          )}
          {stage === "backup" && (
            <div className="op-backup">
              <button>↓ Сохранить JSON</button>
              <span>Все изменения сохранены ✓</span>
            </div>
          )}
        </section>
        <aside>
          <header>
            <small>ПЛАН НЕДЕЛИ</small>
            <b>7 дел</b>
          </header>
          {[
            ["ПН", "2 дела", "✓"],
            ["ВТ", "3 дела", "сегодня"],
            ["СР", "1 дело", ""],
            ["ЧТ", "без дел", ""],
            ["ПТ", "1 дело", ""],
          ].map(([day, count, note], index) => (
            <div className={index === 1 ? "today" : ""} key={day}>
              <b>{day}</b>
              <span>{count}</span>
              <small>{note}</small>
            </div>
          ))}
          {stage === "style" && (
            <footer>
              <b>Пудровое тепло</b>
              <span>Стикеры · крупные действия</span>
            </footer>
          )}
          {stage === "phone" && (
            <footer>
              <b>390 px · проверено</b>
              <span>Все кнопки доступны большим пальцем ✓</span>
            </footer>
          )}
          {stage === "publish" && (
            <footer>
              <b>planner.example.site</b>
              <span>Без личных встреч и адресов ✓</span>
            </footer>
          )}
        </aside>
      </main>
    </div>
  );
}

function PlannerClient({ stage }: { stage: Stage }) {
  if (stage === "client-copy")
    return (
      <div className="op-copy">
        <header>
          <small>ОТ ЛИЧНОГО — К КЛИЕНТСКОМУ</small>
          <h3>Две независимые версии</h3>
        </header>
        <main>
          <article>
            <span>МОЙ ПЛАНЕР</span>
            <i>◇</i>
            <h4>planner</h4>
            <p>Дела без паники</p>
            <b>Не изменяется ✓</b>
          </article>
          <strong>→</strong>
          <article className="client">
            <span>ДЛЯ ЗАКАЗЧИКА</span>
            <i>◇</i>
            <h4>planner-client</h4>
            <p>Готов к адаптации</p>
            <b>Создан отдельно ✓</b>
          </article>
        </main>
      </div>
    );
  if (stage === "client-brief")
    return (
      <div className="op-brief">
        <aside>
          <small>БРИФ ЗАКАЗЧИКА</small>
          <h3>8 ответов о ритме</h3>
          {[
            "Кто пользуется?",
            "Что разгрузить?",
            "Что видно сразу?",
            "Дни и приоритеты?",
            "Какой тон?",
            "Какой стиль?",
            "Какая функция?",
            "Что нельзя показывать?",
          ].map((q, i) => (
            <p key={q}>
              <i>{i + 1}</i>
              <span>{q}</span>
              <b>{i < 7 ? "✓" : "—"}</b>
            </p>
          ))}
        </aside>
        <main>
          <small>СОГЛАСОВАНИЕ ДО ИЗМЕНЕНИЙ</small>
          <h3>Было → станет</h3>
          {[
            ["Название", "Дела без паники", "Фокус Анны"],
            ["Стиль", "Стикеры", "Деловой порядок"],
            ["Функция", "Одна рука", "Дом / Работа"],
          ].map(([l, a, b]) => (
            <p key={l}>
              <small>{l}</small>
              <span>{a}</span>
              <i>→</i>
              <b>{b}</b>
            </p>
          ))}
          <button>Подтвердить изменения</button>
        </main>
      </div>
    );
  return (
    <div className="op-portfolio">
      <header>
        <small>ПОРТФОЛИО · ДВЕ ВЕРСИИ</small>
        <h3>Планер, который подстраивается под человека</h3>
        <p>Не шаблон, а понятная адаптация под реальный ритм.</p>
      </header>
      <main>
        <article>
          <small>ЛИЧНАЯ ВЕРСИЯ</small>
          <h4>Дела без паники</h4>
          <p>Мама с малышом · Пудровое тепло</p>
          <div>Режим одной руки</div>
        </article>
        <article className="client">
          <small>КЛИЕНТСКАЯ ВЕРСИЯ</small>
          <h4>Фокус Анны</h4>
          <p>Эксперт с клиентами · Деловой порядок</p>
          <div>Зоны «Дом» и «Работа»</div>
        </article>
      </main>
      <footer>
        <b>Моя услуга</b>
        <span>
          Адаптирую планер под ваш ритм, стиль и одну полезную функцию.
        </span>
        <button>Показать проект ↗</button>
      </footer>
    </div>
  );
}

function IdeaConcept() {
  return (
    <div className="oi-concept">
      <header>
        <small>КОНСТРУКТОР МОЕЙ КОПИЛКИ</small>
        <h3>Какие мысли вы хотите ловить?</h3>
        <p>Шесть решений и своя гамма задают характер всей коллекции.</p>
      </header>
      <main>
        {[
          ["01", "Для кого", "Автор контента"],
          ["02", "Задача", "Не терять мысли"],
          ["03", "Название", "Лови мысль"],
          ["04", "Карточки", "Доска вдохновения"],
          ["05", "Тон", "Вдохновляюще"],
          ["06", "Функция", "Следующий маленький шаг"],
        ].map(([n, l, v]) => (
          <article key={n}>
            <i>{n}</i>
            <small>{l}</small>
            <b>{v}</b>
            <span>выбрано ✓</span>
          </article>
        ))}
      </main>
      <footer>
        <p>
          «Лови мысль» помогает автору быстро сохранить идею и перейти к
          маленькому действию.
        </p>
        <ConceptPalette name="Лавандовый вечер" colors={["#F7F3FC", "#FFFFFF", "#66517F", "#342B42"]} />
        <button>Сохранить мою версию</button>
      </footer>
    </div>
  );
}

function IdeaData() {
  return (
    <div className="oi-data">
      <aside>
        <small>МАТЕРИАЛЫ КОПИЛКИ</small>
        <h3>10 идей готовы</h3>
        {[
          ["мои-идеи.txt", "10 строк"],
          ["темы-и-статусы.txt", "3 темы · 3 статуса"],
          ["вид-копилки.txt", "карточки"],
        ].map(([f, n], i) => (
          <div className={i === 0 ? "active" : ""} key={f}>
            <i>{i === 0 ? "✦" : "≡"}</i>
            <span>
              <b>{f}</b>
              <small>{n}</small>
            </span>
            <strong>✓</strong>
          </div>
        ))}
      </aside>
      <main>
        <header>
          <b>мои-идеи.txt</b>
          <span>Закрытых концепций нет ✓</span>
        </header>
        <section>
          <div>
            <b>Идея</b>
            <b>Тема</b>
            <b>Метка</b>
            <b>Статус</b>
          </div>
          {[
            ["Рилс про утро", "Контент", "семья", "Новая"],
            ["Подарок маме", "Подарки", "уют", "В работе"],
            ["Маршрут на выходные", "Поездки", "рядом", "Новая"],
          ].map((row) => (
            <div key={row[0]}>
              {row.map((cell) => (
                <span key={cell}>{cell}</span>
              ))}
            </div>
          ))}
        </section>
        <footer>
          Можно продолжать <b>Проверено ✓</b>
        </footer>
      </main>
    </div>
  );
}

function IdeaWorkspace({ stage }: { stage: Stage }) {
  return (
    <div className="oi-workspace">
      <aside>
        <b>⌘ Codex</b>
        <button>＋ Новая задача</button>
        <button className="active">▱ Открыть папку</button>
        <small>ПРОЕКТЫ</small>
        <span className="selected">✦ idea-vault</span>
        <span>◇ planner</span>
      </aside>
      <main>
        <header>
          <b>{stage === "workspace" ? "idea-vault" : "Паспорт копилки"}</b>
          <span>рабочая папка ✓</span>
        </header>
        {stage === "workspace" ? (
          <div className="oi-folder">
            <i>✦</i>
            <h3>idea-vault</h3>
            <p>Открыта отдельная рабочая папка</p>
            <div>Документы / idea-vault</div>
          </div>
        ) : (
          <div className="oi-passport">
            <small>МОЯ КОЛЛЕКЦИЯ</small>
            <h3>Лови мысль</h3>
            {[
              ["Для кого", "Автор контента"],
              ["Задача", "Не терять мысли"],
              ["Карточки", "Доска вдохновения"],
              ["Гамма", "Лавандовый вечер"],
              ["Функция", "Следующий маленький шаг"],
            ].map(([l, v]) => (
              <p key={l}>
                <span>{l}</span>
                <b>{v}</b>
              </p>
            ))}
            <footer>Основа: идея · тема · метки · статус · поиск</footer>
          </div>
        )}
      </main>
    </div>
  );
}

const ideaCards = [
  ["Рилс про утреннюю рутину", "Контент", "Новая", "коралл"],
  ["Подарок маме своими руками", "Подарки", "В работе", "синий"],
  ["Маршрут на тихие выходные", "Поездки", "Новая", "жёлтый"],
  ["Рубрика: до и после", "Контент", "Избранное", "мята"],
];
function IdeaBoard({ stage }: { stage: Stage }) {
  const capture = stage === "capture";
  return (
    <div className={`oi-board ${stage}`}>
      <header>
        <div>
          <small>ЛОВИ МЫСЛЬ</small>
          <h3>
            {stage === "publish"
              ? "Безопасная коллекция опубликована"
              : "Моя творческая доска"}
          </h3>
        </div>
        <button>＋ Записать идею</button>
      </header>
      <div className="oi-search">
        <span>⌕</span>
        <p>{stage === "search" ? "утро" : "Найти идею…"}</p>
        <b>Все темы⌄</b>
        <b>Все статусы⌄</b>
      </div>
      <main>
        <section>
          {capture && (
            <div className="oi-quick">
              <small>НОВАЯ МЫСЛЬ</small>
              <input value="Рилс про утреннюю рутину" readOnly />
              <div>
                <span>Контент</span>
                <span>семья</span>
                <button>Сохранить идею</button>
              </div>
            </div>
          )}
          <div className="oi-cards">
            {ideaCards
              .slice(0, stage === "search" ? 1 : 4)
              .map(([idea, topic, status, color], i) => (
                <article className={color} key={idea}>
                  <small>{topic}</small>
                  <h4>{idea}</h4>
                  <p>#{i % 2 ? "уют" : "семья"}</p>
                  <footer>
                    <span>{status}</span>
                    <button>•••</button>
                  </footer>
                  {stage === "feature" && i === 0 && (
                    <div>
                      <b>Следующий маленький шаг</b>
                      <span>Записать 3 кадра для начала</span>
                    </div>
                  )}
                </article>
              ))}
          </div>
        </section>
        <aside>
          <small>КОЛЛЕКЦИЯ</small>
          <h4>Сегодня поймано</h4>
          <b>{stage === "search" ? "1" : "4"} идеи</b>
          {[
            ["Контент", "2"],
            ["Подарки", "1"],
            ["Поездки", "1"],
          ].map(([n, c]) => (
            <p key={n}>
              <span>{n}</span>
              <b>{c}</b>
            </p>
          ))}
          {stage === "backup" && <button>↓ Сохранить JSON</button>}
          {stage === "phone" && <footer>390 px · одной рукой ✓</footer>}
          {stage === "publish" && <footer>ideas.example.site ↗</footer>}
        </aside>
      </main>
    </div>
  );
}

function IdeaClient({ stage }: { stage: Stage }) {
  if (stage === "client-copy")
    return (
      <div className="oi-copy">
        <header>
          <small>ЛИЧНОЕ ОСТАЁТСЯ ЛИЧНЫМ</small>
          <h3>Две отдельные коллекции</h3>
        </header>
        <main>
          <article>
            <span>МОЯ КОПИЛКА</span>
            <i>✦</i>
            <h4>idea-vault</h4>
            <p>Лови мысль</p>
            <b>Не изменяется ✓</b>
          </article>
          <strong>→</strong>
          <article className="client">
            <span>ДЛЯ ЗАКАЗЧИКА</span>
            <i>✦</i>
            <h4>idea-vault-client</h4>
            <p>Готова к адаптации</p>
            <b>Создана отдельно ✓</b>
          </article>
        </main>
      </div>
    );
  if (stage === "client-brief")
    return (
      <div className="oi-brief">
        <aside>
          <small>БРИФ ЗАКАЗЧИКА</small>
          <h3>8 ответов об идеях</h3>
          {[
            "Какие идеи?",
            "Откуда приходят?",
            "Что на карточке?",
            "Темы и статусы?",
            "Как поддерживать?",
            "Какой стиль?",
            "Какая функция?",
            "Что не показывать?",
          ].map((q, i) => (
            <p key={q}>
              <i>{i + 1}</i>
              <span>{q}</span>
              <b>{i < 7 ? "✓" : "—"}</b>
            </p>
          ))}
        </aside>
        <main>
          <small>СОГЛАСОВАНИЕ</small>
          <h3>Было → станет</h3>
          {[
            ["Название", "Лови мысль", "Идеи студии"],
            ["Темы", "Контент", "Проекты"],
            ["Функция", "Маленький шаг", "Оценка пользы"],
          ].map(([l, a, b]) => (
            <p key={l}>
              <small>{l}</small>
              <span>{a}</span>
              <i>→</i>
              <b>{b}</b>
            </p>
          ))}
          <button>Подтвердить изменения</button>
        </main>
      </div>
    );
  return (
    <div className="oi-portfolio">
      <header>
        <small>ПОРТФОЛИО · ДВЕ ВЕРСИИ</small>
        <h3>Копилка идей, которая понимает владельца</h3>
        <p>Разные темы, стиль и путь от мысли к действию.</p>
      </header>
      <main>
        <article>
          <small>ЛИЧНАЯ ВЕРСИЯ</small>
          <h4>Лови мысль</h4>
          <p>Автор контента · Лавандовый вечер</p>
          <div>Следующий маленький шаг</div>
        </article>
        <article className="client">
          <small>КЛИЕНТСКАЯ ВЕРСИЯ</small>
          <h4>Идеи студии</h4>
          <p>Команда проектов · Чистый каталог</p>
          <div>Оценка пользы</div>
        </article>
      </main>
      <footer>
        <b>Моя услуга</b>
        <span>
          Адаптирую копилку под ваши темы, стиль и одну полезную функцию.
        </span>
        <button>Показать проект ↗</button>
      </footer>
    </div>
  );
}

function ChildConcept() {
  return (
    <div className="oc-concept">
      <header>
        <small>КОНСТРУКТОР НАШЕЙ НЕДЕЛИ</small>
        <h3>Как расписание поможет утром?</h3>
        <p>Шесть решений и своя гамма превращают шаблон в семейный помощник.</p>
      </header>
      <main>
        {[
          ["01", "Для кого", "Двое детей"],
          ["02", "Главное утром", "Ничего не забыть"],
          ["03", "Название", "Неделя без спешки"],
          ["04", "Неделя", "Лента недели"],
          ["05", "Подсказки", "По-семейному"],
          ["06", "Функция", "Что взять с собой"],
        ].map(([number, label, value]) => (
          <article key={number}>
            <i>{number}</i>
            <small>{label}</small>
            <b>{value}</b>
            <span>выбрано ✓</span>
          </article>
        ))}
      </main>
      <footer>
        <p>«Неделя без спешки» утром показывает занятие, время и нужные вещи.</p>
        <ConceptPalette name="Голубой порядок" colors={["#F1F7FB", "#FFFFFF", "#356B86", "#253841"]} />
        <button>Сохранить мою версию</button>
      </footer>
    </div>
  );
}

function ChildData() {
  return (
    <div className="oc-data">
      <aside>
        <small>МАТЕРИАЛЫ РАСПИСАНИЯ</small>
        <h3>Неделя готова</h3>
        {[
          ["занятия-недели.txt", "8 занятий"],
          ["правила-расписания.txt", "повторы и дни"],
          ["вид-недели.txt", "утренний экран"],
        ].map(([file, note], index) => (
          <div key={file} className={index === 0 ? "active" : ""}>
            <i>{index === 0 ? "◷" : "≡"}</i>
            <span><b>{file}</b><small>{note}</small></span>
            <strong>✓</strong>
          </div>
        ))}
      </aside>
      <main>
        <header><b>занятия-недели.txt</b><span>Без личных данных ✓</span></header>
        <section>
          <div><b>Занятие</b><b>Кто</b><b>Когда</b><b>Что взять</b></div>
          {[
            ["Плавание", "Ребёнок А", "Вт · 17:30", "Форма, вода"],
            ["Музыка", "Ребёнок Б", "Чт · 16:00", "Папка"],
            ["Рисование", "Ребёнок А", "Сб · 11:00", "Фартук"],
          ].map((row) => <div key={row[0]}>{row.map((cell) => <span key={cell}>{cell}</span>)}</div>)}
        </section>
        <footer>Нет школы, адресов и контактов <b>Можно продолжать ✓</b></footer>
      </main>
    </div>
  );
}

function ChildWorkspace({ stage }: { stage: Stage }) {
  return (
    <div className="oc-workspace">
      <aside>
        <b>⌘ Codex</b>
        <button>＋ Новая задача</button>
        <button className="active">▱ Открыть папку</button>
        <small>ПРОЕКТЫ</small>
        <span className="selected">◷ child-schedule</span>
        <span>✦ idea-vault</span>
      </aside>
      <main>
        <header><b>{stage === "workspace" ? "child-schedule" : "Паспорт расписания"}</b><span>закрытая папка ✓</span></header>
        {stage === "workspace" ? (
          <div className="oc-folder"><i>◷</i><h3>child-schedule</h3><p>Открыта отдельная папка расписания</p><div>Документы / child-schedule</div></div>
        ) : (
          <div className="oc-passport">
            <small>НАША НЕДЕЛЯ</small>
            <h3>Неделя без спешки</h3>
            {[
              ["Для кого", "Двое детей"],
              ["Утром", "Ничего не забыть"],
              ["Неделя", "Лента недели"],
              ["Гамма", "Голубой порядок"],
              ["Функция", "Что взять с собой"],
            ].map(([label, value]) => <p key={label}><span>{label}</span><b>{value}</b></p>)}
            <footer>Основа: сегодня · неделя · занятие · время · вещи</footer>
          </div>
        )}
      </main>
    </div>
  );
}

const childActivities = [
  { who: "А", title: "Плавание", time: "17:30", color: "blue", things: ["Форма", "Вода"] },
  { who: "Б", title: "Музыка", time: "18:15", color: "yellow", things: ["Папка", "Ноты"] },
];

function ChildBoard({ stage }: { stage: Stage }) {
  const published = stage === "publish";
  return (
    <div className={`oc-board ${stage}`}>
      <header>
        <div><small>НЕДЕЛЯ БЕЗ СПЕШКИ</small><h3>{published ? "Закрытое расписание готово" : "Сегодня · вторник"}</h3></div>
        <button>{published ? "Открыть ссылку ↗" : "＋ Добавить занятие"}</button>
      </header>
      <nav>
        <span className="active">Сегодня</span><span>Вся неделя</span><span>Что взять</span>
        <div><b className="all">Все</b><b className="a">А</b><b className="b">Б</b></div>
      </nav>
      <main>
        <section>
          {stage === "activity" && (
            <div className="oc-form">
              <small>НОВОЕ ЗАНЯТИЕ</small><h4>Плавание</h4>
              <div><span>Кто</span><b>Ребёнок А</b></div>
              <div><span>Когда</span><b>Вторник · 17:30</b></div>
              <div><span>Что взять</span><b>Форма и вода</b></div>
              <button>Сохранить занятие</button>
            </div>
          )}
          <div className="oc-activities">
            {childActivities.map((activity, index) => (
              <article className={activity.color} key={activity.title}>
                <i>{activity.who}</i>
                <time>{activity.time}</time>
                <div><small>РЕБЁНОК {activity.who}</small><h4>{activity.title}</h4><p>Сегодня · каждую неделю</p></div>
                <aside><small>ЧТО ВЗЯТЬ</small>{activity.things.map((thing, thingIndex) => <span key={thing}>{stage === "feature" && index === 0 && thingIndex === 0 ? "✓" : "○"} {thing}</span>)}</aside>
              </article>
            ))}
          </div>
          {stage === "morning" && <div className="oc-overlap"><i>!</i><p><b>Внимание к времени</b><span>Между занятиями 45 минут — проверьте, успеваете ли вы.</span></p><button>Понятно</button></div>}
          {stage === "backup" && <div className="oc-backup"><button>↓ Сохранить JSON</button><span>8 занятий · копия готова ✓</span></div>}
        </section>
        <aside>
          <header><small>НЕДЕЛЯ 17–23 АВГУСТА</small><b>8 занятий</b></header>
          {["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"].map((day, index) => (
            <div className={index === 1 ? "today" : ""} key={day}>
              <b>{day}</b><span>{["—", "А  Б", "А", "Б", "—", "А"][index]}</span><small>{["свободно", "2 занятия", "1 занятие", "1 занятие", "свободно", "1 занятие"][index]}</small>
            </div>
          ))}
          {stage === "style" && <footer><b>Голубой порядок</b><span>Лента недели · постоянные обозначения</span></footer>}
          {stage === "week" && <footer><b>Фильтр недели</b><span>Все → Ребёнок А → Ребёнок Б ✓</span></footer>}
          {stage === "phone" && <footer><b>390 px · проверено</b><span>Время и вещи доступны одной рукой ✓</span></footer>}
          {published && <footer className="private"><b>Доступ ограничен</b><span>Только обезличенные занятия ✓</span></footer>}
        </aside>
      </main>
    </div>
  );
}

function ChildClient({ stage }: { stage: Stage }) {
  if (stage === "client-copy") return (
    <div className="oc-copy">
      <header><small>СЕМЕЙНОЕ ОСТАЁТСЯ ЛИЧНЫМ</small><h3>Две независимые недели</h3></header>
      <main>
        <article><span>МОЁ РАСПИСАНИЕ</span><i>◷</i><h4>child-schedule</h4><p>Неделя без спешки</p><b>Не изменяется ✓</b></article>
        <strong>→</strong>
        <article className="client"><span>ДЛЯ ЗАКАЗЧИКА</span><i>◷</i><h4>child-schedule-client</h4><p>Готово к адаптации</p><b>Создано отдельно ✓</b></article>
      </main>
    </div>
  );
  if (stage === "client-brief") return (
    <div className="oc-brief">
      <aside><small>БРИФ СЕМЬИ</small><h3>8 ответов о неделе</h3>{["Кто пользуется?","Сколько расписаний?","Что видно утром?","Дни и повторы?","Какие обозначения?","Какой стиль?","Какая функция?","Что не показывать?"].map((question, index) => <p key={question}><i>{index + 1}</i><span>{question}</span><b>{index < 7 ? "✓" : "—"}</b></p>)}</aside>
      <main><small>СОГЛАСОВАНИЕ</small><h3>Было → станет</h3>{[
        ["Название", "Неделя без спешки", "Наш семейный ритм"],
        ["Обозначения", "А / Б", "Солнце / Луна"],
        ["Функция", "Что взять", "Пересечения"],
      ].map(([label, before, after]) => <p key={label}><small>{label}</small><span>{before}</span><i>→</i><b>{after}</b></p>)}<button>Подтвердить изменения</button></main>
    </div>
  );
  return (
    <div className="oc-portfolio">
      <header><small>ПОРТФОЛИО · ДВЕ ВЕРСИИ</small><h3>Расписание, которое понимает ритм семьи</h3><p>Безопасная основа и заметная адаптация под другого заказчика.</p></header>
      <main>
        <article><small>СЕМЕЙНАЯ ВЕРСИЯ</small><h4>Неделя без спешки</h4><p>Двое детей · Голубой порядок</p><div>Список «Что взять»</div></article>
        <article className="client"><small>КЛИЕНТСКАЯ ВЕРСИЯ</small><h4>Наш семейный ритм</h4><p>Солнце / Луна · Спокойные карточки</p><div>Предупреждение о пересечении</div></article>
      </main>
      <footer><b>Моя услуга</b><span>Адаптирую семейное расписание под вашу неделю, обозначения и одну полезную функцию.</span><button>Показать проект ↗</button></footer>
    </div>
  );
}

export function OriginalServiceScene({
  slug,
  step,
  mobile = false,
}: {
  slug: string;
  step: number;
  mobile?: boolean;
}) {
  const stage =
    (slug === "planner" ? plannerStages : familyStages)[step - 1] ?? "final";
  if (slug === "family-expenses")
    return (
      <div
        className={`original-service-scene family-budget ${mobile ? "mobile" : ""}`}
        data-original-service={slug}
        data-original-stage={stage}
      >
        {stage === "concept" ? (
          <Concept />
        ) : stage === "data" ? (
          <DataCheck />
        ) : ["workspace", "passport"].includes(stage) ? (
          <Workspace stage={stage} />
        ) : ["client-copy", "client-brief", "portfolio"].includes(stage) ? (
          <ClientStage stage={stage} />
        ) : (
          <BudgetDashboard stage={stage} />
        )}
      </div>
    );
  if (slug === "planner")
    return (
      <div
        className={`original-service-scene personal-planner ${mobile ? "mobile" : ""}`}
        data-original-service={slug}
        data-original-stage={stage}
      >
        {stage === "concept" ? (
          <PlannerConcept />
        ) : stage === "data" ? (
          <PlannerData />
        ) : ["workspace", "passport"].includes(stage) ? (
          <PlannerWorkspace stage={stage} />
        ) : ["client-copy", "client-brief", "portfolio"].includes(stage) ? (
          <PlannerClient stage={stage} />
        ) : (
          <PlannerDashboard stage={stage} />
        )}
      </div>
    );
  if (slug === "idea-vault") {
    const ideaStage = ideaStages[step - 1] ?? "final";
    return (
      <div
        className={`original-service-scene idea-vault-scene ${mobile ? "mobile" : ""}`}
        data-original-service={slug}
        data-original-stage={ideaStage}
      >
        {ideaStage === "concept" ? (
          <IdeaConcept />
        ) : ideaStage === "data" ? (
          <IdeaData />
        ) : ["workspace", "passport"].includes(ideaStage) ? (
          <IdeaWorkspace stage={ideaStage} />
        ) : ["client-copy", "client-brief", "portfolio"].includes(ideaStage) ? (
          <IdeaClient stage={ideaStage} />
        ) : (
          <IdeaBoard stage={ideaStage} />
        )}
      </div>
    );
  }
  if (slug === "child-schedule") {
    const childStage = childStages[step - 1] ?? "final";
    return (
      <div className={`original-service-scene child-schedule-scene ${mobile ? "mobile" : ""}`} data-original-service={slug} data-original-stage={childStage}>
        {childStage === "concept" ? <ChildConcept /> : childStage === "data" ? <ChildData /> : ["workspace", "passport"].includes(childStage) ? <ChildWorkspace stage={childStage} /> : ["client-copy", "client-brief", "portfolio"].includes(childStage) ? <ChildClient stage={childStage} /> : <ChildBoard stage={childStage} />}
      </div>
    );
  }
  return null;
}
