"use client";
import { useState } from "react";
import { apiProviderSteps } from "../content/setup-quests";
import { LessonText } from "./LessonText";
import { QuestLinks } from "./QuestLinks";
export function ApiProviderChoice() {
  const [index, setIndex] = useState(0);
  const provider = apiProviderSteps[index];
  return <section className="course-milestone" aria-label="Инструкция выбранного API-провайдера">
    <label>Ключ какого провайдера нужен вашему проекту?<select value={index} onChange={(event) => setIndex(Number(event.target.value))}>{apiProviderSteps.map((step, i) => <option value={i} key={step.id}>{step.title.replace("Нашла ключ ", "")}</option>)}</select></label>
    <p>Если в шаблоне уже указан провайдер, выбирайте его. Не знаете, какой нужен? Спросите Codex: «Какой провайдер настроен в моём проекте? Покажи только его название и имя переменной, без секретного значения».</p>
    <LessonText text={provider.action} kind="action" />
    <QuestLinks links={provider.links} />
  </section>;
}
