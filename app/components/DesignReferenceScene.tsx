"use client";

type Stage = "result" | "passport" | "interview" | "workspace" | "structure" | "mood" | "detail" | "matrix" | "audit" | "concepts" | "hero" | "page" | "system" | "mobile" | "originality" | "client" | "portfolio";

const stages: Stage[] = ["result", "passport", "interview", "workspace", "structure", "mood", "detail", "matrix", "audit", "concepts", "hero", "page", "system", "mobile", "originality", "client", "portfolio"];
const labels: Record<Stage, string> = { result: "ГОТОВЫЙ РЕЗУЛЬТАТ", passport: "МОЙ ДИЗАЙН-ПАСПОРТ", interview: "СОДЕРЖАНИЕ ПОДТВЕРЖДЕНО", workspace: "UNIQUE-DESIGN СОЗДАН", structure: "ВЫБИРАЕМ ЛОГИКУ", mood: "ВЫБИРАЕМ ХАРАКТЕР", detail: "ПЕРЕОСМЫСЛЯЕМ ДЕТАЛЬ", matrix: "БЕРЁМ · НЕ КОПИРУЕМ · МЕНЯЕМ", audit: "UI/UX-ПРОВЕРКА", concepts: "ДВА СВОИХ КОНЦЕПТА", hero: "ПЕРВЫЙ ЭКРАН РАБОТАЕТ", page: "ПОЛНЫЙ ПУТЬ ГОТОВ", system: "ДИЗАЙН-СИСТЕМА", mobile: "ПРОВЕРЕНО НА 390 PX", originality: "АУДИТ ОРИГИНАЛЬНОСТИ", client: "ЛИЧНАЯ + КЛИЕНТСКАЯ", portfolio: "КЕЙС В ПОРТФОЛИО" };

function ReferenceCard({ number, title, detail, tone, active }: { number: string; title: string; detail: string; tone: string; active: boolean }) {
  return <article className={`design-reference-card ${tone} ${active ? "active" : ""}`}><span>{number}</span><small>{title}</small><b>{detail}</b><i>{active ? "выбираем сейчас" : "своя роль"}</i></article>;
}

function ResultPage({ compact = false }: { compact?: boolean }) {
  return <div className={`design-result-page ${compact ? "compact" : ""}`}><nav><b>ТИХИЙ ЗАПУСК</b><span>О формате</span><span>Как работаем</span><button>Обсудить задачу</button></nav><main><div className="design-hero-copy"><small>СТУДИЯ СПОКОЙНЫХ ЗАПУСКОВ</small><h3>Соберите проект,<br />в котором <em>видно вас.</em></h3><p>Понятная структура, свой визуальный характер и одна деталь, которую запомнят.</p><button>Обсудить задачу <span>↗</span></button></div><div className="design-hero-object"><span className="object-note">НЕ ШАБЛОН.<br />ВАША СИСТЕМА.</span><i className="object-sheet one" /><i className="object-sheet two" /><div className="object-seal">✣<small>свой<br />характер</small></div></div></main><footer><span>01 · Ясно</span><span>02 · Узнаваемо</span><span>03 · Удобно</span></footer></div>;
}

function StagePanel({ stage }: { stage: Stage }) {
  if (stage === "matrix") return <div className="design-stage-panel matrix"><b>БЕРЁМ</b><b>НЕ КОПИРУЕМ</b><b>МЕНЯЕМ ПОД НАС</b><span>Логику пути</span><span>Тексты и код</span><span>Новый ритм и содержание</span></div>;
  if (stage === "concepts") return <div className="design-stage-panel concepts"><div><small>A · РЕДАКЦИОННЫЙ</small><ResultPage compact /></div><div><small>B · ТАКТИЛЬНЫЙ</small><ResultPage compact /></div><b>ВЫБРАН B</b></div>;
  if (stage === "system") return <div className="design-stage-panel system"><div><i style={{ background: "#f3efe8" }} /><i style={{ background: "#24372e" }} /><i style={{ background: "#d45f45" }} /><i style={{ background: "#f1c65b" }} /></div><b>FRAUNCES + MANROPE</b><span>8 · 16 · 24 · 40</span><button>FOCUS VISIBLE</button></div>;
  if (stage === "mobile") return <div className="design-stage-panel mobile-check"><div><ResultPage compact /></div><section><b>390 PX</b><span>✓ без прокрутки вбок</span><span>✓ кнопка 48 px</span><span>✓ действие одной рукой</span></section></div>;
  if (stage === "client") return <div className="design-stage-panel client"><div><small>ЛИЧНАЯ</small><b>Тихий запуск</b><span>Тактильный альбом</span></div><i>≠</i><div><small>ДЛЯ ЗАКАЗЧИКА</small><b>Сад внутри</b><span>Смелая ботаника</span></div></div>;
  if (stage === "portfolio") return <div className="design-stage-panel portfolio"><small>КЕЙС 05</small><h4>Три референса.<br />Одна своя система.</h4><p>Личная версия + адаптация по новому брифу</p><div><span>СТРУКТУРА</span><span>НАСТРОЕНИЕ</span><span>ДЕТАЛЬ</span></div></div>;
  if (["passport", "interview", "workspace", "audit", "originality"].includes(stage)) {
    const rows = stage === "passport" ? ["Аудитория · эксперты", "Цель · заявка", "Стиль · тактильный альбом"] : stage === "interview" ? ["6 ответов подтверждены", "Факты не придуманы", "Главное действие выбрано"] : stage === "workspace" ? ["content · подтверждено", "references · 3 роли", "design · готово к сборке"] : stage === "audit" ? ["Контраст · пройден", "Focus · видимый", "390 px · без переполнения"] : ["5 своих решений", "0 чужих текстов", "0 скопированных экранов"];
    return <div className="design-stage-panel checklist"><b>{labels[stage]}</b>{rows.map((row) => <span key={row}>✓ {row}</span>)}</div>;
  }
  return <ResultPage />;
}

export function DesignReferenceScene({ step, mobile = false }: { step: number; mobile?: boolean }) {
  const stage = stages[Math.max(0, Math.min(16, step - 1))];
  return <div className={`design-reference-scene ${mobile ? "mobile" : ""}`} data-design-marker="three-reference-original-design" data-stage={stage}><header className="design-reference-heading"><span>МЕТОД ТРЁХ РЕФЕРЕНСОВ</span><b>{labels[stage]}</b></header><div className="design-reference-board"><aside><ReferenceCard number="01" title="СТРУКТУРА" detail="Логика блоков" tone="structure" active={stage === "structure"} /><ReferenceCard number="02" title="НАСТРОЕНИЕ" detail="Настроение и типографика" tone="mood" active={stage === "mood"} /><ReferenceCard number="03" title="ОДНА ДЕТАЛЬ" detail="Навигация-ярлык" tone="detail" active={stage === "detail"} /></aside><div className="design-combine-mark"><span>＋</span><span>＋</span><b>→</b></div><section className="design-own-result"><div className="own-result-label"><span>МОЯ ВЕРСИЯ</span><b>НЕ КОПИЯ</b></div><StagePanel stage={stage} /></section></div><footer><span>Берём принципы</span><i>·</i><span>меняем под своё содержание</span><i>·</i><b>получаем оригинальный проект</b></footer></div>;
}
