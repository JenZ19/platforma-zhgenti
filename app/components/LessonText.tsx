import { Fragment, type ReactNode } from "react";

type LessonTextProps = {
  text: string;
  variant?: "action" | "support";
  kind?: "action" | "why" | "help";
};

type LessonBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; lead: string; items: string[] }
  | { type: "result"; label: string; text: string };

const transitionPattern = /^(Сначала|Затем|После этого|Дальше|Теперь|В конце|Важно|Обратите внимание)([,:])?\s+/u;
const resultPattern = /^(Итог|Результат|Важно):\s*(.+)$/iu;

function splitIntoSentences(text: string): string[] {
  return text
    .split(/\n+/u)
    .flatMap((part) => part.trim().split(/(?<=[.!?])\s+(?=[А-ЯЁA-Z0-9«])/u))
    .map((part) => part.trim())
    .filter(Boolean);
}

export function buildLessonBlocks(text: string): LessonBlock[] {
  return splitIntoSentences(text).flatMap<LessonBlock>((sentence) => {
    const result = sentence.match(resultPattern);
    if (result) {
      return [{
        type: "result",
        label: `${result[1]}:`,
        text: result[2].replace(/[.]$/u, ""),
      }];
    }

    const colon = sentence.indexOf(":");
    if (colon > 0) {
      const lead = sentence.slice(0, colon + 1).trim();
      const items = sentence
        .slice(colon + 1)
        .replace(/[.]$/u, "")
        .split(/;\s*/u)
        .map((item) => item.trim())
        .filter(Boolean);

      if (items.length >= 3) return [{ type: "list", lead, items }];
    }

    return [{ type: "paragraph", text: sentence }];
  });
}

function renderInline(text: string): ReactNode {
  const transition = text.match(transitionPattern);
  if (!transition) return text;

  const label = `${transition[1]}${transition[2] ?? ""}`;
  return <><strong>{label}</strong>{" "}{text.slice(transition[0].length)}</>;
}

export function LessonText({ text, variant = "support", kind }: LessonTextProps) {
  const blocks = buildLessonBlocks(text);

  return (
    <div
      className={`lesson-text lesson-text-${variant}`}
      data-lesson-copy={kind}
    >
      {blocks.map((block, index) => {
        if (block.type === "list") {
          return (
            <Fragment key={`${block.lead}-${index}`}>
              <p className="lesson-text-list-lead"><strong>{block.lead}</strong></p>
              <ul className="lesson-text-list">
                {block.items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}
              </ul>
            </Fragment>
          );
        }

        if (block.type === "result") {
          return (
            <p className="lesson-text-result" key={`${block.label}-${index}`}>
              <strong>{block.label}</strong>
              <em>{block.text}</em>
            </p>
          );
        }

        return <p key={`${block.text}-${index}`}>{renderInline(block.text)}</p>;
      })}
    </div>
  );
}
