"use client";

import { useState } from "react";
import type { MobileAction } from "../content/mobile";

function telegramHref(base: string, slug: string, step: number): string {
  const clean = base.replace(/\/$/, "");
  return `${clean}?start=q_${slug}_${String(step).padStart(2, "0")}`;
}

export function MobileActionButton({ action, projectSlug, step }: { action: MobileAction; projectSlug: string; step: number }) {
  const [notice, setNotice] = useState("");
  const botUrl = process.env.NEXT_PUBLIC_COURSE_BOT_URL?.trim() ?? "";
  const isTelegram = action.tool === "telegram" || action.tool === "screenshot";
  const href = isTelegram && botUrl ? telegramHref(botUrl, projectSlug, step) : action.href;

  if (href) {
    return (
      <div className={`mobile-action mobile-action-${action.tool}`}>
        <a href={href} target="_blank" rel="noreferrer">{action.label}<span>↗</span></a>
        {action.note && <p>{action.note}</p>}
      </div>
    );
  }

  if (isTelegram) {
    return (
      <div className="mobile-action mobile-action-telegram unavailable">
        <button type="button" disabled>{action.label}</button>
        <p><b>Бот подключается куратором.</b> Пока сохраните этот уровень — ссылка появится здесь автоматически.</p>
      </div>
    );
  }

  return (
    <div className={`mobile-action mobile-action-${action.tool}`}>
      <button type="button" onClick={() => setNotice("Готово — отправьте куратору ссылку на предпросмотр и название проекта.")}>{action.label}</button>
      <p>{notice || action.note}</p>
    </div>
  );
}
