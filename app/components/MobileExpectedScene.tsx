"use client";

import { buildMobileQuest, getMobileCapability } from "../content/mobile";
import type { ProjectDefinition } from "../content/types";
import { OriginalServiceScene } from "./OriginalServiceScene";
import { getAgentContract } from "../content/agent-contracts";
import { isSourcePrototypeSlug, SourceProjectPrototypeScene } from "./SourceProjectPrototypeScene";
import { isSetupQuestSlug } from "../content/setup-quests";
import { SetupQuestPrototypeScene } from "./SetupQuestPrototypeScene";
import { DesignReferenceScene } from "./DesignReferenceScene";
import { JourneyCheckPrototypeScene } from "./JourneyCheckPrototypeScene";

function Phone({ project, step }: { project: ProjectDefinition; step: number }) {
  const constructor = project.kind === "agent" ? "Чатиум" : "Lovable";
  const agent = project.kind === "agent" ? getAgentContract(project.slug) : undefined;
  return (
    <div className="mobile-scene-phone">
      <div className="mobile-scene-status"><span>9:41</span><b>● ● ◒</b></div>
      <header><span>{step <= 8 || [11,12,14,15,17].includes(step) ? "←" : "×"}</span><div><b>{step <= 8 || [11,12,14,15,17].includes(step) ? "Фея проекта" : constructor}</b><small>{project.title}</small></div><i>{project.symbol}</i></header>
      <main>
        {step === 1 && <><div className="scene-fairy">✦</div><h3>Добро пожаловать!</h3><p>Я проведу проект с телефона — по одному действию.</p><button>Начать проект</button></>}
        {step === 2 && <><div className="scene-fairy dark">C</div><h3>Подключите свой Codex</h3><p>Войдите по безопасной ссылке. Пароль останется только у вас.</p><div className="device-code"><small>КОД ВХОДА</small><b>FEYA–27</b></div><button>Открыть вход</button></>}
        {step === 3 && <><h3>Какие данные используем?</h3><div className="scene-choice"><b>✦ Учебные</b><small>Примеры уже готовы</small></div><div className="scene-choice real"><b>◇ Реальные</b><small>Сначала откроется чек-лист</small></div></>}
        {step === 4 && agent && <><small className="scene-progress-label">СВОБОДНЫЙ ТЕКСТ ИЛИ ГОЛОС</small><h3>{agent.inputExample}</h3><div className="voice-note"><b>▶</b><i /><span>0:18</span></div><div className="scene-choice real"><b>✓ Ответ принят</b><small>Codex сам создаст поля: {agent.requiredFields.join(" · ")}</small></div><button>Отправить</button></>}
        {step === 4 && !agent && <><small className="scene-progress-label">ОДИН ВОПРОС ЗА РАЗ</small><h3>Расскажите своими словами</h3><p>Фея спросит только то, что нужно этому проекту.</p><div className="voice-note"><b>▶</b><i /><span>0:18</span></div><div className="scene-choice real"><b>✓ Ответ принят</b><small>Codex сам создаст комнату, поля и файлы</small></div><button>Следующий вопрос</button></>}
        {step === 5 && agent && <><small className="scene-progress-label">ОДИН ВОПРОС ЗА РАЗ</small><h3>{agent.firstQuestion}</h3><p>Можно ответить голосом или текстом.</p><div className="voice-note"><b>▶</b><i /><span>0:12</span></div><button>Отправить ответ</button></>}
        {step === 5 && !agent && <><small className="scene-progress-label">ВОПРОС 2 ИЗ 3</small><h3>Что должно получиться?</h3><p>{project.outcome}</p><div className="voice-note"><b>▶</b><i /><span>0:18</span></div><button>Отправить ответ</button></>}
        {step === 6 && <><h3>{agent ? "Паспорт ИИ-агента" : "Паспорт проекта"}</h3><div className="scene-pass"><small>ДЛЯ КОГО</small><p>{project.audience}</p></div><div className="scene-pass"><small>{agent ? "ПОЛЯ И РЕЗУЛЬТАТ" : "ФУНКЦИИ"}</small><p>{agent ? `${agent.requiredFields.join(" · ")} → ${agent.resultTitle}` : project.features.slice(0,3).join(" · ")}</p></div><button>Всё верно</button></>}
        {step === 7 && <><div className="scene-loader">✦</div><h3>{agent ? "Мастер-инструкция устанавливается" : "Ваш Codex работает"}</h3><p>Можно закрыть Telegram. Фея пришлёт сообщение, когда всё будет готово.</p><div className="queue-pill">{agent ? "Свободный текст · голос · самопроверка" : "Задача №12 · выполняется"}</div><button className="ghost">Остановить</button></>}
        {step === 8 && <><div className="scene-ready">✓</div><h3>{agent?.resultTitle ?? "Первый результат готов"}</h3><p>{agent ? agent.resultItems.join(" · ") : project.outcome}</p><div className="result-link">{project.slug}.preview <b>↗</b></div><button>Открыть результат</button></>}
        {step === 9 && <><div className={`constructor-mark ${constructor === "Lovable" ? "love" : "chatium"}`}>{constructor === "Lovable" ? "L" : "Ч"}</div><h3>Создать в {constructor}</h3><p>Задание уже внутри. Войдите в свой аккаунт и подтвердите запуск.</p><button>Создать проект</button></>}
        {step === 10 && <><small className="scene-progress-label">{agent ? "ГОЛОСОВОЙ ТЕСТ" : "ПРЕДПРОСМОТР"}</small><h3>{project.title}</h3><div className="mini-hero"><span>{project.symbol}</span><b>{agent?.voiceExample ?? project.demo[0]}</b><small>{agent ? "Расшифровка понята ✓" : project.features[0]}</small></div><button>{agent ? "Проверить смысл" : project.features[0]}</button></>}
        {step === 11 && <><h3>Отправьте скриншот</h3><div className="screenshot-drop"><span>▧</span><b>Скриншот добавлен</b><small>390 × 844</small></div><button>Проверить у Феи</button></>}
        {step === 12 && <><h3>Фея нашла 3 правки</h3>{["Сделать заголовок короче","Увеличить главную кнопку","Убрать мелкий текст"].map((item,index)=><div className="scene-fix" key={item}><span>{index+1}</span><b>{item}</b></div>)}<button>Скопировать исправление</button></>}
        {step === 13 && agent && <><h3>Полный разговор работает</h3>{[agent.inputExample, agent.firstQuestion, agent.resultTitle].map((item,index)=><div className="scene-path" key={item}><span>✓</span><b>{item}</b><small>шаг {index+1}</small></div>)}<button>Отправить итог Фее</button></>}
        {step === 13 && !agent && <><h3>Главный путь работает</h3>{project.features.slice(0,3).map((item,index)=><div className="scene-path" key={item}><span>✓</span><b>{item}</b><small>шаг {index+1}</small></div>)}<button>Отправить итог Фее</button></>}
        {step === 14 && agent && <><h3>Нужно точное согласие</h3><div className="safety-card"><span>✓</span><b>Да, подтверждаю</b><small>Только эта фраза запускает действие</small></div><div className="safety-card"><span>→</span><b>Передать человеку</b><small>{agent.handoff}</small></div><button>Проверка пройдена</button></>}
        {step === 14 && !agent && <><h3>Безопасность</h3><div className="safety-card"><span>✓</span><b>Секретов нет</b><small>Пароли и токены не опубликованы</small></div><div className="safety-card"><span>✓</span><b>Данные защищены</b><small>{project.safety}</small></div><button>Проверка пройдена</button></>}
        {step === 15 && project.kind === "advanced-site" && <><div className="curator-mark">♡</div><h3>Личная версия проверена</h3><p>Платежи, домен и закрытые настройки проверит специалист.</p><div className="curator-ticket"><small>ЗАЯВКА</small><b>Проект передан куратору</b></div><button>Посмотреть статус</button></>}
        {step === 15 && project.kind !== "advanced-site" && <><div className="scene-ready">✓</div><h3>{agent ? "Личный ИИ-агент работает" : "Личная версия готова"}</h3><p>{agent ? `${agent.resultTitle} · текст и голос проверены` : "Все проверки зелёные, ссылка открывается с телефона."}</p><div className="result-link">{project.slug}.live <b>↗</b></div><button>Открыть проект</button></>}
        {step === 16 && <><small className="scene-progress-label">8 ВОПРОСОВ · ГОТОВО</small><h3>Клиентская копия создана</h3><div className="scene-choice"><b>Личная версия</b><small>{project.slug}</small></div><div className="scene-choice real"><b>Клиентская версия</b><small>{project.slug}-client{agent ? ` · ${agent.resultTitle}` : ""}</small></div><button>Посмотреть «было / станет»</button></>}
        {step === 17 && <><small className="scene-progress-label">ДВЕ ВЕРСИИ В ПОРТФОЛИО</small><div className="portfolio-phone-card"><span>{project.symbol}</span><h3>{project.title}</h3><p>Личная версия + адаптация по брифу</p><div><b>✓ 2 безопасные ссылки</b><b>✓ 6 кадров</b><b>✓ Что изменено для клиента</b></div></div><button>Добавить кейс</button></>}
      </main>
      <footer><span>Сообщение…</span><b>↑</b></footer>
    </div>
  );
}

export function MobileExpectedScene({ project, step }: { project: ProjectDefinition; step: number }) {
  const capability = getMobileCapability(project);
  const questStep = buildMobileQuest(project)[step - 1];
  if (!questStep) return null;
  const sourceStep = questStep.sourceStepId || step;
  const title = questStep.title;
  const frame = (visual: React.ReactNode, className = "") => <main id="capture-scene" className={`capture-canvas mobile-capture ${className}`}><header><div className="capture-brand"><span>Н</span> НЕЙРОПРОФИ</div><div>МОБИЛЬНЫЙ КВЕСТ · УРОВЕНЬ {String(step).padStart(2,"0")}</div></header><section className="capture-title"><p>Вот что должно получиться на телефоне</p><h1>{title}</h1><span>{project.title}</span></section><div className="mobile-capture-body"><div className="original-mobile-phone">{visual}</div><aside><div className={`mobile-capability ${capability.id}`}>{capability.label}</div><span>ШАГ {String(step).padStart(2,"0")}</span><h2>{title}</h2><p>Это честный прототип результата этого уровня. Название, палитра и содержание будут вашими.</p><div><b>✓</b> Одно действие с телефона</div><div><b>✓</b> Код вручную не нужен</div></aside></div></main>;
  if (questStep.journeyCheck) return frame(<JourneyCheckPrototypeScene project={project} step={questStep} mobile />, "journey-check-mobile-capture");
  if (project.slug === "unique-design") {
    return frame(<DesignReferenceScene step={sourceStep} mobile />, "original-mobile-capture");
  }
  if (isSetupQuestSlug(project.slug)) {
    return frame(<SetupQuestPrototypeScene project={project} step={sourceStep} mobile />, "setup-mobile-capture");
  }
  if (isSourcePrototypeSlug(project.slug)) {
    return frame(<SourceProjectPrototypeScene project={project} step={sourceStep} mobile/>, "source-mobile-capture");
  }
  if (["family-expenses", "planner", "idea-vault", "child-schedule"].includes(project.slug)) {
    return frame(<OriginalServiceScene slug={project.slug} step={sourceStep} mobile />, `original-mobile-capture ${project.slug === "child-schedule" ? "child-mobile-capture" : ""}`);
  }
  return frame(<Phone project={project} step={sourceStep}/>);
}
