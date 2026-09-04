import type { StorageLike } from "./progress";
export const resultsKey = "neiroprofi-results-v1";
export type PortfolioResult = { title: string; url: string; description: string; status: "study" | "personal" | "client"; updatedAt: string };
export function safeProjectUrl(value: string): boolean {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}
export function loadPortfolioResults(storage: StorageLike): Record<string, PortfolioResult> {
  try {
    const raw = JSON.parse(storage.getItem(resultsKey) ?? "{}");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw).filter(([, entry]) => {
      const v = entry as PortfolioResult;
      return v && typeof v.title === "string" && typeof v.url === "string" && typeof v.description === "string" && ["study", "personal", "client"].includes(v.status) && (!v.url || safeProjectUrl(v.url));
    })) as Record<string, PortfolioResult>;
  } catch { return {}; }
}
export function savePortfolioResult(id: string, value: Omit<PortfolioResult, "updatedAt">, storage: StorageLike) {
  if (!value.title.trim()) throw new Error("Напишите название своей работы.");
  if (value.url && !safeProjectUrl(value.url)) throw new Error("Нужна полная ссылка, начинающаяся с https://. Не добавляйте пароль в ссылку.");
  const next = { ...loadPortfolioResults(storage), [id]: { title: value.title.trim().slice(0, 120), url: value.url.trim().slice(0, 2000), description: value.description.trim().slice(0, 1500), status: value.status, updatedAt: new Date().toISOString() } };
  storage.setItem(resultsKey, JSON.stringify(next));
  return next;
}
