export const resetBackupKey = "neiroprofi-reset-recovery-v1";

const prefixes = [
  "feya-academy-progress-v1:", "feya-academy-preparation-v1:",
  "feya-quest:customization:", "feya-academy-output-v1:",
  "submarine:setup-platform:", "feya-dashboard-v1:last:",
];
const exactKeys = ["neiroprofi-course-route-v1", "neiroprofi-results-v1", "feya-dashboard-v1:saved"];
function isResetKey(key: string) {
  return exactKeys.includes(key) || prefixes.some(prefix => key.startsWith(prefix));
}
function currentEntries(storage: Storage): Record<string, string> {
  const entries: Record<string, string> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && isResetKey(key)) entries[key] = storage.getItem(key)!;
  }
  return entries;
}

/** Device-local only. Credentials, helper links, notes and other apps are untouched. */
export function resetLearning(storage: Storage): number {
  const entries = currentEntries(storage);
  const keys = Object.keys(entries);
  if (!keys.length) return 0; // Never replace a useful recovery copy with an empty one.
  storage.setItem(resetBackupKey, JSON.stringify({ version: 1, createdAt: new Date().toISOString(), entries }));
  for (const key of keys) storage.removeItem(key);
  return keys.length;
}

export function restoreLearning(storage: Storage): number {
  const copy = JSON.parse(storage.getItem(resetBackupKey) ?? "null");
  if (copy?.version !== 1 || !copy.entries || typeof copy.entries !== "object" || Array.isArray(copy.entries)) throw new Error("Копия для восстановления недоступна.");
  const entries = Object.entries(copy.entries);
  if (entries.some(([key, value]) => !isResetKey(key) || typeof value !== "string")) throw new Error("Копия содержит неподдерживаемые данные.");
  const previous = currentEntries(storage);
  try {
    // Keep the recovery record until every write succeeds.
    for (const key of Object.keys(previous)) storage.removeItem(key);
    for (const [key, value] of entries) storage.setItem(key, value as string);
  } catch (error) {
    for (const [key] of entries) storage.removeItem(key);
    for (const [key, value] of Object.entries(previous)) storage.setItem(key, value);
    throw error;
  }
  return entries.length;
}
