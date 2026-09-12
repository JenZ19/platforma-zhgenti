"use client";
import { useCallback, useEffect, useState } from "react";

const endpoint = "/kurs1/access/api/support";
const changed = "curator-requests-changed";

export type CuratorRequest = {
  id: number;
  project: string | null;
  step: number | null;
  question: string;
  created: number;
  answer: string | null;
  answered: number | null;
};

export type AskInput = { question: string; project?: string; step?: number; device?: string };

async function call(body?: unknown) {
  const response = await fetch(endpoint, {
    method: body ? "POST" : "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json", "X-Neiroprofi-Request": "1" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.error === "string" && data.error
      ? data.error
      : response.status === 401
        ? "Войдите в платформу, чтобы написать куратору."
        : "Не удалось отправить вопрос. Попробуйте ещё раз.");
  }
  return data as { requests?: CuratorRequest[] };
}

/** Вопросы куратору: уходят в аккаунт, ответ возвращается сюда же. */
export function useCuratorRequests() {
  const [requests, setRequests] = useState<CuratorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await call();
        if (!active) return;
        setRequests(data.requests ?? []);
        setAvailable(true);
      } catch {
        if (active) setAvailable(false);
      } finally {
        if (active) setLoading(false);
      }
    })();
    const onChanged = () => reload();
    window.addEventListener(changed, onChanged);
    return () => { active = false; window.removeEventListener(changed, onChanged); };
  }, [revision, reload]);

  const ask = useCallback(async (input: AskInput) => {
    const data = await call({ action: "ask", ...input });
    setRequests(data.requests ?? []);
    setAvailable(true);
    window.dispatchEvent(new Event(changed));
  }, []);

  return { requests, loading, available, ask, reload };
}

export function waitingCount(requests: CuratorRequest[]): number {
  return requests.filter((request) => !request.answer).length;
}
