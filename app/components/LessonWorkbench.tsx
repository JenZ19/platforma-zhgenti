"use client";
import { useState } from "react";
import type { ProjectDefinition, QuestStep } from "../content/types";
import { PersonalFairy } from "./PersonalFairy";
import { SupportRequest } from "./SupportRequest";

export function LessonWorkbench({project,step,mobile=false}: {project:ProjectDefinition; step:QuestStep; mobile?:boolean}) {
  const [status,setStatus]=useState("");
  const [expanded,setExpanded]=useState(false);
  const command=Boolean(step.prompt);
  const setup=project.journey==='setup';
  const destination=command ? mobile && !setup ? "Феечка в Telegram" : "Codex · ваш рабочий проект" : project.kind==='agent' ? "Ваш созданный агент · проверка результата" : setup ? "Приложение или кабинет из инструкции ниже" : "Ваш готовый проект · проверка результата";
  const kit=step.links?.find(link=>link.label.includes('Скачать учебный комплект'));
  return <section className="lesson-workbench" aria-label="Действие этого шага">
    {!mobile && <><p className="workbench-place">Сейчас работаем здесь</p><h2>{destination}</h2></>}
    <p>{mobile ? command ? setup ? "Выполните команду на устройстве, указанном в инструкции. Не отправляйте её Феечке для настройки сервера школы." : "Отправьте команду Феечке в чат этого проекта. Затем проверьте результат ниже." : "Проверьте свой проект. Отправлять команду Феечке на этом шаге не нужно." : command ? "Скопируйте команду целиком и отправьте её помощнику. Читать технический текст необязательно. После ответа проверьте результат по уроку." : "Здесь не нужно отправлять техническую команду. Выполните действие в своём проекте и сравните результат с проверкой ниже."}</p>
    {kit && !mobile && <p><strong>Сначала:</strong> <a href={kit.href}>скачайте учебный комплект</a>. Распакуйте ZIP и откройте его папку в Codex.</p>}
    {step.customization && <p>{mobile ? "Команда уже учитывает выбранные выше настройки." : "На этом шаге сначала выберите и сохраните настройки ниже. Кнопка скопирует команду с последними сохранёнными настройками."}</p>}
    <div className="workbench-actions">
      {step.prompt && <button type="button" onClick={async()=>{
        try {await navigator.clipboard.writeText(step.prompt!);setStatus("Скопировано. Вставьте команду в свой рабочий разговор и отправьте.");}
        catch {setExpanded(true);setStatus("Копирование недоступно. Выделите полный текст ниже и скопируйте вручную.");}
      }}>Скопировать команду</button>}
      {command && mobile && !setup && <PersonalFairy label="Открыть Феечку ↗" />}
      {!mobile && <><a href="#lesson-action">К инструкции ↓</a><a href="#lesson-check">Как проверить ↓</a></>}
    </div>
    {command && mobile && !setup && step.id === 1 && <p>Вставьте команду в Telegram и нажмите «Отправить». Результат откройте через «Моё портфолио» в Феечке. Продолжайте эту работу в том же чате.</p>}
    <p aria-live="polite" role={status ? "status" : undefined} hidden={!status}>{status}</p>
    {step.prompt && <details className="workbench-prompt" open={expanded} onToggle={e=>setExpanded(e.currentTarget.open)}><summary>Посмотреть полный текст команды</summary><pre>{step.prompt}</pre></details>}
    {!mobile && <SupportRequest project={project.title} step={step.id} title={step.title}/ >}
  </section>;
}
