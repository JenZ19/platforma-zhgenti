"use client";

import { useState } from "react";
import type { MobileAction } from "../content/mobile";
import { PersonalFairy } from "./PersonalFairy";

export function MobileActionButton({ action }: { action: MobileAction; projectSlug: string; step: number }) {
  const [notice, setNotice] = useState("");
  const isTelegram = action.tool === "telegram" || action.tool === "screenshot";
  if (isTelegram) return <div className={`mobile-action mobile-action-${action.tool}`}><PersonalFairy label={action.label}/>{action.note && <p>{action.note}</p>}</div>;
  const href = action.href;

  if (href) {
    return (
      <div className={`mobile-action mobile-action-${action.tool}`}>
        <a href={href} target="_blank" rel="noreferrer">{action.label}<span>↗</span></a>
        {action.note && <p>{action.note}</p>}
      </div>
    );
  }

  return (
    <div className={`mobile-action mobile-action-${action.tool}`}>
      <button type="button" onClick={() => setNotice("Откройте ваш учебный чат вручную и отправьте куратору название проекта, ссылку и вопрос. Платформа не отправляет сообщения за вас.")}>Как обратиться к куратору</button>
      <p>{notice || action.note}</p>
    </div>
  );
}
