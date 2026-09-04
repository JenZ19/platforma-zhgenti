"use client";

import { useEffect, useState } from "react";
import type { MobileAction } from "../content/mobile";
import { normalizePersonalBot, personalBotKey } from "../lib/learning-backup";
import { LearningSetup } from "./LearningSetup";

export function MobileActionButton({ action }: { action: MobileAction; projectSlug: string; step: number }) {
  const [notice, setNotice] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("");
  useEffect(() => {
    const sync = () => setTelegramUrl(normalizePersonalBot(window.localStorage.getItem(personalBotKey) ?? "") ?? "");
    sync(); window.addEventListener("learning-settings", sync);
    return () => window.removeEventListener("learning-settings", sync);
  }, []);
  const isTelegram = action.tool === "telegram" || action.tool === "screenshot";
  const href = isTelegram && telegramUrl ? telegramUrl : action.href;

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
        <p><b>Сначала добавьте ссылку на личного помощника.</b> Она не появляется автоматически. После подключения скопируйте команду из урока и отправьте её в чат.</p>
        <LearningSetup mobile />
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
