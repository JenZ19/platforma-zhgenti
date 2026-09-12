"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

const endpoint = "/kurs1/access/api/course";
const portfolioEndpoint = "/kurs1/access/api/portfolio";
const telegramEndpoint = "/kurs1/access/api/telegram";
const changed = "neiroprofi-course-account-changed";

export type WeekState = { started: number | null; week: number | null; finished: boolean; dayOfWeek: number | null; daysLeft: number | null };
export type WorkStatus = "study" | "personal" | "client";
export type PortfolioWork = { title: string; description: string; url: string; status: WorkStatus; kind: string };
export type PortfolioContact = { kind: "telegram" | "email" | "link"; value: string; href: string };
export type PortfolioState = {
  exists: boolean;
  published: boolean;
  /** Показывать страницу в открытой витрине /raboty. Решает сама ученица. */
  listed: boolean;
  /** Разрешить поисковикам индексировать её страницу. Только вместе с витриной. */
  indexable: boolean;
  headline?: string;
  about?: string;
  contact?: PortfolioContact;
  works?: PortfolioWork[];
  slug?: string | null;
  updated?: number;
  certificate?: { number: string; issued: number } | null;
};
export type TelegramState = { linked: boolean; muted: boolean; since?: number; bot?: string };
export type CourseAccount = { course: WeekState; portfolio: PortfolioState; telegram: TelegramState; weeks: number };

const emptyAccount: CourseAccount = {
  course: { started: null, week: null, finished: false, dayOfWeek: null, daysLeft: null },
  portfolio: { exists: false, published: false, listed: false, indexable: false, certificate: null },
  telegram: { linked: false, muted: false },
  weeks: 6,
};

async function call(url: string, body?: unknown): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      method: body === undefined ? "GET" : "POST",
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
      headers: body === undefined ? undefined : { "Content-Type": "application/json", "X-Neiroprofi-Request": "1" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(typeof data.error === "string" && data.error
        ? data.error
        : response.status === 401
          ? "Войдите в платформу, чтобы продолжить."
          : "Сервер не ответил. Попробуйте ещё раз.");
    }
    return data as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
}

/** Аккаунт курса: дата старта, портфолио и напоминания. Живёт на сервере, а не в браузере. */
export function useCourseAccount() {
  const [account, setAccount] = useState<CourseAccount>(emptyAccount);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await call(endpoint);
        if (!active) return;
        setAccount({ ...emptyAccount, ...(data as unknown as CourseAccount) });
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

  const apply = useCallback((data: Record<string, unknown>) => {
    setAccount((previous) => ({ ...previous, ...(data as Partial<CourseAccount>) }));
    setAvailable(true);
    window.dispatchEvent(new Event(changed));
  }, []);

  const actions = useMemo(() => ({
    startCourse: async (restart = false) => apply(await call(endpoint, { action: restart ? "restart" : "start" })),
    forgetCourse: async () => apply(await call(endpoint, { action: "forget" })),
    savePortfolio: async (portfolio: unknown) => apply(await call(portfolioEndpoint, { action: "save", portfolio })),
    publishPortfolio: async (slug: string, listed = false, indexable = false) => apply(await call(portfolioEndpoint, { action: "publish", slug, listed, indexable })),
    unpublishPortfolio: async () => apply(await call(portfolioEndpoint, { action: "unpublish" })),
    requestCertificate: async (weeks: number[]) => apply(await call(portfolioEndpoint, { action: "certificate", weeks })),
    requestTelegramCode: async (telegramId: string) => { await call(telegramEndpoint, { action: "request", telegramId }); },
    confirmTelegram: async (code: string) => apply(await call(telegramEndpoint, { action: "confirm", code })),
    disconnectTelegram: async () => apply(await call(telegramEndpoint, { action: "unlink" })),
  }), [apply]);

  return { account, loading, available, reload, ...actions };
}

export function portfolioPageUrl(slug: string): string {
  return `${typeof window === "undefined" ? "https://ezhgenti.ru" : window.location.origin}/p/${slug}`;
}

export function galleryPageUrl(): string {
  return `${typeof window === "undefined" ? "https://ezhgenti.ru" : window.location.origin}/raboty`;
}

export function certificatePageUrl(number: string): string {
  return `${typeof window === "undefined" ? "https://ezhgenti.ru" : window.location.origin}/s/${number}`;
}

/** Черновик адреса страницы из имени: латиница, цифры и дефис. */
export function suggestSlug(value: string): string {
  const map: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" };
  return value.toLowerCase().split("").map((letter) => map[letter] ?? letter).join("")
    .replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}
