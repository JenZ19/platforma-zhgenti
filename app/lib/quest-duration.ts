import type { QuestSurface } from "./output-format";

export function questLevelMinutes(stepId: number, format: QuestSurface): number {
  if (format === "mobile") return stepId < 7 ? 3 : 5;
  return stepId < 5 ? 5 : stepId < 13 ? 7 : 10;
}

export function questDurationLabel(totalLevels: number, format: QuestSurface): string {
  const minutes = Array.from({ length: totalLevels }, (_, index) => questLevelMinutes(index + 1, format));
  const minimum = Math.min(...minutes);
  const maximum = Math.max(...minutes);
  return minimum === maximum ? `${minimum} минут на уровень` : `${minimum}–${maximum} минут на уровень`;
}
