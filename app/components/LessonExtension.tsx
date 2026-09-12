import type { QuestStep } from "../content/types";

export function LessonExtension({ extension, onCopy, copied }: {
  extension: NonNullable<QuestStep["extension"]>;
  onCopy: () => void;
  copied: boolean;
}) {
  return <details className="prompt-panel lesson-extension">
    <summary><strong>{extension.title}</strong></summary>
    <p>{extension.description}</p>
    <pre>{extension.prompt}</pre>
    <button type="button" onClick={onCopy}>{copied ? "Скопировано ✓" : "Скопировать команду адаптации"}</button>
  </details>;
}
