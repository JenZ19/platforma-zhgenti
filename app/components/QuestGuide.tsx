"use client";

/* eslint-disable @next/next/no-img-element -- generated lesson screens are fixed-size local teaching assets */

import { useState } from "react";
import type { QuestGuideFrame } from "../content/types";

function copyLabel(frame: QuestGuideFrame) {
  if (/анкет/i.test(frame.title)) return "Скопировать анкету";
  if (/описан/i.test(frame.title)) return "Скопировать описание проекта";
  return "Скопировать этот текст";
}

export function QuestGuide({ frames }: { frames: QuestGuideFrame[] }) {
  const [copied, setCopied] = useState<number | null>(null);
  const [openFrame, setOpenFrame] = useState<QuestGuideFrame | null>(null);

  async function copyText(frame: QuestGuideFrame) {
    if (!frame.exactText) return;
    await navigator.clipboard.writeText(frame.exactText);
    setCopied(frame.id);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <section className="quest-guide" aria-label="Делайте по картинкам">
      <header className="quest-guide-heading">
        <div>
          <p className="section-kicker">Делайте по картинкам</p>
          <h3>Один кадр — одно маленькое действие</h3>
        </div>
        <span>{frames.length} {frames.length === 1 ? "кадр" : frames.length < 5 ? "кадра" : "кадров"}</span>
      </header>
      <p className="quest-guide-lead">Не спешите. Выполните первый кадр, проверьте результат под картинкой и только потом переходите к следующему.</p>

      <div className="quest-guide-list">
        {frames.map((frame) => (
          <article className="quest-guide-frame" key={frame.id}>
            <header>
              <span>{String(frame.id).padStart(2, "0")}</span>
              <div>
                <small>Откройте: {frame.app}</small>
                <h4>{frame.title}</h4>
              </div>
            </header>

            <button type="button" className="guide-shot" onClick={() => setOpenFrame(frame)} aria-label={`Увеличить кадр ${frame.id}: ${frame.title}`}>
              <img src={frame.screenshot} alt={`Кадр ${frame.id}: ${frame.title}`} />
              <span>Нажмите, чтобы увеличить</span>
            </button>

            <div className="guide-action-card">
              <b>Сделайте сейчас</b>
              <p>{frame.action}</p>
            </div>

            {frame.exactText && (
              <div className="guide-copy-card">
                <div><b>Текст уже готов</b><span>ничего придумывать не нужно</span></div>
                <pre>{frame.exactText}</pre>
                <button type="button" onClick={() => copyText(frame)}>{copied === frame.id ? "Скопировано ✓" : copyLabel(frame)}</button>
              </div>
            )}

            <div className="guide-result-grid">
              <div><b>Что вы увидите</b><p>{frame.after}</p></div>
              <div className="guide-done"><b>✓ Готово, если</b><p>{frame.doneWhen}</p></div>
            </div>

            <aside className="guide-fallback"><b>Если экран другой</b><p>{frame.fallback}</p></aside>
          </article>
        ))}
      </div>

      {openFrame && (
        <div className="image-modal" role="dialog" aria-modal="true" aria-label={`Увеличенный кадр ${openFrame.id}`}>
          <button type="button" onClick={() => setOpenFrame(null)}>×</button>
          <img src={openFrame.screenshot} alt={`Увеличенный кадр ${openFrame.id}: ${openFrame.title}`} />
        </div>
      )}
    </section>
  );
}
