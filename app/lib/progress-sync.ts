"use client";
import { useEffect, useState } from "react";
import { exportLearningBackup, importLearningBackup } from "./learning-backup";

const endpoint = "/kurs1/access/api/progress";
/** Один шаг урока отмечен — есть что отправить в аккаунт. */
export const progressSavedEvent = "learning-progress-saved";
/** Прогресс из аккаунта влит в этот браузер — экрану пора перечитать данные. */
export const progressSyncedEvent = "learning-synced";
const PUSH_DELAY = 4000;
/** Прогресс доехал до аккаунта — значит обучение переживёт смену устройства. */
const syncStateEvent = "learning-sync-state";
let accountSync = false;

function setAccountSync(value: boolean) {
  if (accountSync === value) return;
  accountSync = value;
  window.dispatchEvent(new Event(syncStateEvent));
}

/** Хранится ли прогресс в аккаунте прямо сейчас. Без входа — false, и это нормально. */
export function useAccountSync(): boolean {
  const [value, setValue] = useState(accountSync);
  useEffect(() => {
    const read = () => setValue(accountSync);
    read();
    window.addEventListener(syncStateEvent, read);
    return () => window.removeEventListener(syncStateEvent, read);
  }, []);
  return value;
}

type Entries = Record<string, string>;

async function call(entries?: Entries): Promise<{ entries?: Entries }> {
  const response = await fetch(endpoint, {
    method: entries ? "POST" : "GET",
    credentials: "same-origin",
    cache: "no-store",
    keepalive: Boolean(entries),
    headers: entries ? { "Content-Type": "application/json", "X-Neiroprofi-Request": "1" } : undefined,
    body: entries ? JSON.stringify({ entries }) : undefined,
  });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

export function localEntries(storage: Storage): Entries {
  return JSON.parse(exportLearningBackup(storage)).entries as Entries;
}

/**
 * Сводит копию из аккаунта с этим браузером. Шаги не теряются: и здесь, и на сервере
 * побеждает более длинное прохождение. Выбор проектов и карточки берутся из аккаунта —
 * они перезаписываются только в момент входа, дальше уходит то, что делает ученица.
 */
export async function syncLearningProgress(storage: Storage): Promise<"merged" | "pushed"> {
  const server = await call();
  let merged = false;
  const fromAccount = server.entries ?? {};
  if (Object.keys(fromAccount).length) {
    const backup = JSON.stringify({ type: "neiroprofi-learning-backup", version: 1, entries: fromAccount });
    merged = importLearningBackup(backup, storage) > 0;
  }
  const local = localEntries(storage);
  if (Object.keys(local).length) await call(local);
  return merged ? "merged" : "pushed";
}

export function useProgressSync() {
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function push() {
      try {
        const entries = localEntries(window.localStorage);
        if (Object.keys(entries).length) await call(entries);
        setAccountSync(true);
      } catch { setAccountSync(false); /* вход, сеть или место в браузере — попробуем при следующей отметке */ }
    }

    (async () => {
      try {
        const result = await syncLearningProgress(window.localStorage);
        if (cancelled) return;
        setAccountSync(true);
        if (result === "merged") window.dispatchEvent(new Event(progressSyncedEvent));
      } catch { if (!cancelled) setAccountSync(false); /* без входа синхронизации нет: прогресс остаётся в браузере */ }
    })();

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(push, PUSH_DELAY);
    };
    const flush = () => {
      if (document.visibilityState !== "hidden") return;
      if (timer) clearTimeout(timer);
      void push();
    };
    window.addEventListener(progressSavedEvent, schedule);
    window.addEventListener("learning-settings", schedule);
    document.addEventListener("visibilitychange", flush);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener(progressSavedEvent, schedule);
      window.removeEventListener("learning-settings", schedule);
      document.removeEventListener("visibilitychange", flush);
    };
  }, []);
}
