"use client";
import { useCallback, useEffect, useState } from "react";
import { normalizePersonalBot } from "./learning-backup";

const endpoint = "/kurs1/access/api/personal-bot";
const changed = "personal-fairy-changed";
export function usePersonalFairy() {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 12000);
    (async () => {
      try {
        const response = await fetch(endpoint, {credentials: "same-origin", cache: "no-store", signal: controller.signal});
        if (!response.ok) throw new Error(response.status === 401 ? "Войдите в платформу, чтобы загрузить свою Феечку." : "Не удалось загрузить Феечку. Повторите попытку.");
        const data = await response.json();
        if (active) { setUrl(typeof data.url === "string" ? normalizePersonalBot(data.url) ?? null : null); setError(""); }
      } catch (error) { if (active) { setUrl(null); setError(error instanceof Error && error.name !== "AbortError" ? error.message : "Не удалось загрузить Феечку. Повторите попытку."); } }
      finally { clearTimeout(timer); if (active) setLoading(false); }
    })();
    window.addEventListener(changed, reload);
    return () => { active = false; clearTimeout(timer); controller.abort(); window.removeEventListener(changed, reload); };
  }, [revision, reload]);
  const save = async (value: string) => {
    const url = normalizePersonalBot(value);
    if (!url) throw new Error(/feyakrestnayasbm_bot/i.test(value) ? "Это Фея-крёстная. Нужен адрес вашей личной Феечки." : "Введите @имя_bot или https://t.me/имя_bot. Токен не нужен.");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(endpoint, {method: "POST", credentials: "same-origin", signal: controller.signal,
        headers: {"Content-Type": "application/json", "X-Neiroprofi-Request": "1"}, body: JSON.stringify({url})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось сохранить Феечку.");
      const saved = typeof data.url === "string" && normalizePersonalBot(data.url);
      if (!saved) throw new Error("Сервер не подтвердил сохранение. Повторите попытку.");
      setUrl(saved); setError("");
      window.dispatchEvent(new Event(changed));
    } finally { clearTimeout(timer); }
  };
  return {url, loading, error, reload, save};
}
