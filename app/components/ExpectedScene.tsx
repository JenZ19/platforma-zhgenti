"use client";

import type { ProjectDefinition } from "../content/types";
import { hasFirstCoverPrototype } from "../content/first-cover-prototypes";
import { hasAgentCoverPrototype } from "../content/agent-cover-prototypes";
import { hasThirdCoverPrototype } from "../content/third-cover-prototypes";
import { hasFinalCoverPrototype } from "../content/final-cover-prototypes";
import { BotPrototypeScene } from "./BotPrototypeScene";
import { FirstCoverPrototypeScene } from "./FirstCoverPrototypeScene";
import { AgentCoverPrototypeScene } from "./AgentCoverPrototypeScene";
import { ThirdCoverPrototypeScene } from "./ThirdCoverPrototypeScene";
import { FinalCoverPrototypeScene } from "./FinalCoverPrototypeScene";
import { OriginalServiceScene } from "./OriginalServiceScene";

function Chrome({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mock-window"><div className="mock-bar"><span>● ● ●</span><b>{title}</b><i /></div>{children}</div>;
}

function SetupScene({ project, step }: { project: ProjectDefinition; step: number }) {
  if (step === 1) return <Chrome title="Документы"><div className="folder-scene"><div>◇</div><h3>{project.slug}</h3><p>Пустая безопасная папка готова</p></div></Chrome>;
  if (step === 2) return <Chrome title="Codex"><div className="codex-scene"><aside><small>Новая задача</small><b>{project.slug}</b><span>Рабочая папка ✓</span></aside><main><div>✦</div><h3>Чем займёмся?</h3><p>Проект открыт в правильной папке</p><section>Напишите задачу… <b>↑</b></section></main></div></Chrome>;
  if (step === 3) return <Chrome title={`Паспорт · ${project.title}`}><div className="passport-scene"><h3>Паспорт проекта</h3><div><span>Для кого</span><p>{project.audience}</p></div><div><span>Результат</span><p>{project.outcome}</p></div><div><span>Что умеет</span><p>{project.features.slice(0, 3).join(" · ")}</p></div><i>Правила безопасности сохранены ✓</i></div></Chrome>;
  return <Chrome title={`Codex · ${project.slug}`}><div className="prompt-scene"><div className="prompt-bubble">Создай проект «{project.title}». Я новичок и не пишу код вручную…</div><div className="codex-answer"><b>✦ Codex</b><h3>Начинаю создавать проект</h3>{project.features.slice(0, 4).map((feature) => <p key={feature}><span>✓</span>{feature}</p>)}<i>Работаю только внутри папки проекта</i></div></div></Chrome>;
}

function ServiceScene({ project, step }: { project: ProjectDefinition; step: number }) {
  const visible = Math.max(1, Math.min(project.demo.length, step - 5));
  return <Chrome title={project.title}><div className="service-scene"><header><div><small>МОЙ СЕРВИС</small><h3>{project.title}</h3></div><button>Август 2026⌄</button></header><div className="service-stats"><div><span>{project.entities[0]}</span><b>{project.demo[0]}</b></div><div><span>{project.entities[1]}</span><b>{visible} записи</b></div><div className="rose"><span>Сегодня</span><b>Всё сохранено</b></div></div><div className="service-grid"><section><h4>{project.features[0]}</h4><label>{project.entities[0]}<input value={project.demo[Math.min(visible - 1, project.demo.length - 1)]} readOnly /></label><label>{project.entities[1]}<input value={project.entities[1]} readOnly /></label><button>Сохранить</button></section><section><div className="scene-title"><h4>История</h4><span>{step >= 11 ? "Все ▾" : ""}</span></div>{project.demo.slice(0, visible).map((item, index) => <article key={item}><i className={`dot d${index}`} /><div><b>{item}</b><small>{project.entities[index % project.entities.length]}</small></div><span>✓</span></article>)}</section></div></div></Chrome>;
}

function AgentScene({ project, step }: { project: ProjectDefinition; step: number }) {
  return <Chrome title={`ИИ-агент · ${project.title}`}><div className="agent-scene"><aside><div className="agent-avatar">{project.symbol}</div><h3>{project.title}</h3><p>{project.outcome}</p><span>Паспорт</span>{project.features.slice(0, 4).map((feature, index) => <b key={feature} className={index <= step - 7 ? "ready" : ""}>✓ {feature}</b>)}</aside><main><div className="agent-user">{project.demo[0]}</div><div className="agent-answer"><b>✦ {project.title}</b><p>Я поняла задачу. Сначала уточню ограничения, затем подготовлю полезный результат.</p><section><small>ГОТОВЫЙ РЕЗУЛЬТАТ</small><h4>{project.demo[Math.min(project.demo.length - 1, step >= 9 ? 2 : 1)]}</h4><p>{project.features.slice(0, 3).join(" · ")}</p></section>{step >= 10 && <i>Если данных не хватит, я честно передам вопрос человеку.</i>}</div></main></div></Chrome>;
}

function SiteScene({ project, step, advanced }: { project: ProjectDefinition; step: number; advanced: boolean }) {
  return <Chrome title={`${project.title} · предпросмотр`}><div className={`site-scene ${advanced ? "advanced" : ""}`}><nav><b>{project.title}</b><span>О проекте · Услуги · Контакты</span><button>{project.features[0]}</button></nav><main><div className="site-copy"><small>{project.track.toUpperCase()}</small><h3>{project.outcome}</h3><p>{project.audience}. Понятный маршрут, спокойное оформление и честные условия.</p><button>{project.features[0]} →</button></div><div className="site-art"><span>{project.symbol}</span><b>{project.demo[0]}</b><small>{project.demo[1]}</small></div></main><footer>{project.features.slice(0, step >= 9 ? 5 : 3).map((feature, index) => <div key={feature}><span>0{index + 1}</span><b>{feature}</b><small>{index <= step - 7 ? "готово ✓" : "следующий шаг"}</small></div>)}</footer>{advanced && step >= 8 && <section className="advanced-panel"><div><small>Тестовая функция</small><b>{project.features[Math.min(2, project.features.length - 1)]}</b></div><button>Проверить →</button></section>}</div></Chrome>;
}

function FinalScene({ project, step }: { project: ProjectDefinition; step: number }) {
  if (step === 15) return <Chrome title="Финальный аудит"><div className="audit-scene"><h3>Все проверки пройдены</h3>{["Главный сценарий", "Сохранение и ошибки", "Мобильная версия", "Безопасность", "Карточка результата"].map((item) => <div key={item}><span>✓</span><b>{item}</b><small>готово</small></div>)}</div></Chrome>;
  if (step === 16) return <Chrome title="Публикация"><div className="publish-scene"><span>● ПРОЕКТ ОПУБЛИКОВАН</span><h3>{project.title}</h3><p>Ссылка готова к безопасной проверке</p><div>https://{project.slug}.example.site <button>Открыть ↗</button></div><small>Главный сценарий повторно пройден с телефона ✓</small></div></Chrome>;
  return <div className="portfolio-scene"><span>ПРОЕКТ В ПОРТФОЛИО</span><h3>{project.title}</h3><p>{project.portfolioAngle}</p><div>{project.features.slice(0, 4).map((feature) => <b key={feature}>✓ {feature}</b>)}</div><footer><span>Создано без кода</span><b>Открыть проект ↗</b></footer></div>;
}

function Visual({ project, step }: { project: ProjectDefinition; step: number }) {
  if (["family-expenses", "planner"].includes(project.slug)) return <OriginalServiceScene slug={project.slug} step={step} />;
  if (step <= 4) return <SetupScene project={project} step={step} />;
  if (step >= 15) return <FinalScene project={project} step={step} />;
  if (hasFirstCoverPrototype(project.slug)) return <FirstCoverPrototypeScene project={project} step={step} />;
  if (hasAgentCoverPrototype(project.slug)) return <AgentCoverPrototypeScene project={project} step={step} />;
  if (hasThirdCoverPrototype(project.slug)) return <ThirdCoverPrototypeScene project={project} step={step} />;
  if (hasFinalCoverPrototype(project.slug)) return <FinalCoverPrototypeScene project={project} step={step} />;
  if (project.kind === "service") return <ServiceScene project={project} step={step} />;
  if (project.kind === "bot") return <BotPrototypeScene project={project} step={step} />;
  if (project.kind === "agent") return <AgentScene project={project} step={step} />;
  if (project.kind === "simple-site") return <SiteScene project={project} step={step} advanced={false} />;
  if (project.kind === "advanced-site") return <SiteScene project={project} step={step} advanced />;
  return <SiteScene project={project} step={step} advanced={false} />;
}

export function ExpectedScene({ project, step }: { project: ProjectDefinition; step: number }) {
  const titles = project.slug === "family-expenses" ? ["Увидела готовый результат","Выбрала свою версию","Проверила данные расходов","Открыла безопасную папку","Передала паспорт проекта","Получила рабочую основу","Добавила первый расход","Настроила свои категории","Применила свой стиль","Добавила одну особенную функцию","Прошла семейный сценарий","Проверила сохранение и копию","Проверила одной рукой","Опубликовала личную версию","Создала клиентскую копию","Адаптировала по брифу","Упаковала две версии"] : project.slug === "planner" ? ["Увидела спокойный день","Выбрала характер планера","Проверила дела недели","Открыла папку planner","Передала паспорт ритма","Получила рабочую основу","Добавила первое дело","Выбрала главное сегодня","Применила свой стиль","Добавила одну особенную функцию","Прошла день целиком","Проверила сохранение","Проверила одной рукой","Опубликовала личную версию","Создала planner-client","Адаптировала по брифу","Упаковала два планера"] : ["Создано безопасное место", "Проект открыт правильно", "Заполнен паспорт проекта", "Мастер-команда отправлена", "Рабочая основа готова", "Открыт первый экран", `Работает: ${project.features[0]}`, `Добавлено: ${project.features[1]}`, "Ничего не потерялось", "Исправление прошло проверку", "Пройден путь пользователя", "Сохранена безопасная версия", "Проект стал вашим", "Проверено с телефона", "Финальный аудит пройден", "Проект опубликован", "Карточка портфолио готова"];
  return <main id="capture-scene" className="capture-canvas"><header><div className="capture-brand"><span>S</span> SUBMARINE</div><div>УРОВЕНЬ {String(step).padStart(2, "0")} · НЕДЕЛЯ {project.week}</div></header><section className="capture-title"><p>Вот что должно получиться</p><h1>{titles[step - 1]}</h1><span>{project.title}</span></section><div className="capture-visual"><Visual project={project} step={step} /></div><aside className="capture-tip"><b>✦</b><p><strong>Сверь свой экран с примером.</strong><br />Мелкие отличия в тексте и цвете — это нормально.</p></aside></main>;
}
