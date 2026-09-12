"use client";

import { useId, useState } from "react";
import { useCourseAccount } from "../lib/course-account";

/** Понедельничное напоминание о неделе маршрута. Пишет общий бот школы, а не личная Феечка. */
export function TelegramReminders() {
  const { account, loading, available, requestTelegramCode, confirmTelegram, disconnectTelegram } = useCourseAccount();
  const id = useId();
  const [telegramId, setTelegramId] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"id" | "code">("id");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  if (loading || !available) return null;
  const bot = account.telegram.bot ? `@${account.telegram.bot}` : "бот школы";

  async function run(action: () => Promise<unknown>, done: string, next?: "id" | "code") {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(done);
      if (next) setStage(next);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Не получилось. Попробуйте ещё раз.");
    } finally { setBusy(false); }
  }

  return <details className="telegram-reminders">
    <summary>Напоминания о неделе в Telegram</summary>
    {account.telegram.linked ? <>
      <p>Подключено. По понедельникам {bot} напишет, какая неделя маршрута идёт и что осталось закрыть. Напоминания приходят от общего бота школы; ваша личная Феечка и её чат остаются как были.</p>
      <div className="learning-actions">
        <button type="button" disabled={busy} onClick={() => {
          if (!window.confirm("Отключить напоминания? Подключить снова можно здесь же.")) return;
          run(() => disconnectTelegram(), "Напоминания отключены.", "id");
        }}>Отключить напоминания</button>
      </div>
    </> : <>
      <p>Раз в неделю, по понедельникам, {bot} напомнит, какая неделя маршрута идёт. Это общий бот школы: он не заменяет вашу личную Феечку и в её чат не пишет.</p>
      {!account.course.started && <p>Сначала отметьте день старта на главной — без календаря напоминать не о чем.</p>}
      <ol className="telegram-reminders-steps">
        <li>Откройте {bot} в Telegram и отправьте команду <strong>/myid</strong>.</li>
        <li>Скопируйте число из ответа и вставьте сюда — пришлём код подтверждения в тот же чат.</li>
      </ol>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (stage === "id") run(() => requestTelegramCode(telegramId.trim()), "Код отправлен в Telegram. Введите шесть цифр из сообщения.", "code");
        else run(() => confirmTelegram(code.trim()), "Готово: напоминания подключены.");
      }}>
        <label htmlFor={`${id}-tg`}>Ваш Telegram ID</label>
        <input id={`${id}-tg`} inputMode="numeric" maxLength={20} required value={telegramId}
          onChange={(event) => setTelegramId(event.target.value.replace(/[^\d]/g, ""))} placeholder="862939737" autoComplete="off" />
        {stage === "code" && <>
          <label htmlFor={`${id}-code`}>Код из сообщения</label>
          <input id={`${id}-code`} inputMode="numeric" maxLength={6} required value={code}
            onChange={(event) => setCode(event.target.value.replace(/[^\d]/g, ""))} placeholder="123456" autoComplete="one-time-code" />
        </>}
        <div className="learning-actions">
          <button type="submit" disabled={busy}>
            {busy ? "Отправляем…" : stage === "id" ? "Прислать код" : "Подключить напоминания"}
          </button>
          {stage === "code" && <button type="button" disabled={busy} onClick={() => { setStage("id"); setCode(""); setNotice(""); setError(""); }}>Другой Telegram ID</button>}
        </div>
      </form>
    </>}
    {error && <p role="alert">{error}</p>}
    <p role="status">{notice}</p>
  </details>;
}
