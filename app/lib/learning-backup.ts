const progressPrefix = "feya-academy-progress-v1:";
const allowed = [progressPrefix, "feya-academy-output-v1:", "submarine:setup-platform:", "neiroprofi-course-route-v1", "neiroprofi-results-v1"];
export function isLearningKey(key: string) { return allowed.some((prefix) => key.startsWith(prefix)); }

export function exportLearningBackup(storage: Storage) {
  const entries: Record<string, string> = {};
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key && isLearningKey(key)) entries[key] = storage.getItem(key)!;
  }
  return JSON.stringify({ type: "neiroprofi-learning-backup", version: 1, createdAt: new Date().toISOString(), entries }, null, 2);
}

export function importLearningBackup(text: string, storage: Storage) {
  if (text.length > 2_000_000) throw new Error("Файл слишком большой. Выберите резервную копию учебного прогресса.");
  const data = JSON.parse(text);
  if (data?.type !== "neiroprofi-learning-backup" || data.version !== 1 || !data.entries || typeof data.entries !== "object" || Array.isArray(data.entries)) throw new Error("Это не резервная копия НЕЙРОПРОФИ.");
  const entries = Object.entries(data.entries);
  if (entries.length > 500 || entries.some(([key, value]) => !isLearningKey(key) || typeof value !== "string" || value.length > 100_000)) throw new Error("В копии есть неподдерживаемые записи.");
  // Validate everything before mutating; roll back if browser storage is full.
  for (const [key, value] of entries) if (!key.startsWith("submarine:setup-platform:")) JSON.parse(value as string);
  const previous = new Map<string, string | null>();
  try {
    for (const [key, value] of entries) {
      const old = storage.getItem(key);
      if (key.startsWith(progressPrefix) && old) {
        try {
          if ((JSON.parse(old).completed?.length ?? 0) > (JSON.parse(value as string).completed?.length ?? 0)) continue;
        } catch { /* replace malformed saved value */ }
      }
      previous.set(key, old);
      storage.setItem(key, value as string);
    }
  } catch {
    for (const [key, value] of previous) {
      if (value === null) storage.removeItem(key); else storage.setItem(key, value);
    }
    throw new Error("Не хватило места для сохранения. Предыдущий прогресс оставлен без изменений.");
  }
  return previous.size;
}

export const personalBotKey = "neiroprofi-personal-bot-v1";
export function normalizePersonalBot(value: string): string | undefined {
  const match = /^(?:https:\/\/t\.me\/|@)?([a-zA-Z][a-zA-Z0-9_]{4,31})\/?$/.exec(value.trim());
  if (!match || !/bot$/i.test(match[1])) return undefined;
  return `https://t.me/${match[1]}`;
}
