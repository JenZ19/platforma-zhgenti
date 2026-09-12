"use client";
import { useId, useState } from "react";
import { useCuratorRequests } from "../lib/curator-requests";

/** Вопрос куратору уходит в аккаунт: ответ вернётся в раздел «Мои вопросы». */
export function SupportRequest({ project, step, title, mobile = false }: { project: string; step: number; title: string; mobile?: boolean }) {
  const id = useId();
  const { ask, available, loading } = useCuratorRequests();
  const [message, setMessage] = useState(`Я нажала: …\nОжидала: …\nПолучилось: …`);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const device = mobile ? "Телефон" : "Компьютер";

  async function send() {
    if (busy || !message.trim()) return;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await ask({ question: message.trim(), project, step, device });
      setSent(true);
      setStatus("Вопрос отправлен куратору. Ответ придёт в раздел «Мои вопросы».");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Не удалось отправить вопрос.");
    } finally { setBusy(false); }
  }

  return <details className="support-request">
    <summary>Спросить куратора об этом шаге</summary>
    <p>Опишите, что происходит. К вопросу приложим проект и номер шага — повторять их не нужно. Не добавляйте пароли, ключи, коды из СМС и личные документы.</p>
    <label htmlFor={id}>Что не получается</label>
    <textarea id={id} rows={7} maxLength={4000} value={message} onChange={(event) => setMessage(event.target.value)} />
    <p className="support-request-context">Проект: {project} · шаг {step}: {title} · {device}</p>
    <div className="learning-actions">
      <button type="button" disabled={busy || loading || !message.trim() || !available} onClick={send}>
        {busy ? "Отправляем…" : sent ? "Отправить ещё раз" : "Отправить куратору"}
      </button>
      <button type="button" onClick={async () => {
        const full = `Проект: ${project}\nШаг ${step}: ${title}\nУстройство: ${device}\n\n${message}`;
        try { await navigator.clipboard.writeText(full); setStatus("Скопировано. Можно вставить в учебный чат."); }
        catch { setStatus("Копирование недоступно. Выделите текст в поле и скопируйте вручную."); }
      }}>Скопировать текст</button>
    </div>
    {!available && !loading && <p>Отправка работает после входа в платформу. Пока можно скопировать текст и отнести его в учебный чат.</p>}
    {error && <p role="alert">{error}</p>}
    <p aria-live="polite" role={status ? "status" : undefined} hidden={!status}>{status}</p>
    {sent && <p><a href={mobile ? "?format=mobile&section=fairy" : "?section=fairy"}>Открыть мои вопросы →</a></p>}
  </details>;
}
