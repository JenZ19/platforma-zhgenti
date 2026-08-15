"use client";

/* eslint-disable @next/next/no-img-element -- generated lesson screens are fixed-size local teaching assets */

import { useEffect, useRef, useState } from "react";
import type { QuestGuideFrame } from "../content/types";

function copyLabel(frame: QuestGuideFrame) {
  if (/анкет/i.test(frame.title)) return "Скопировать анкету";
  if (/описан/i.test(frame.title)) return "Скопировать описание проекта";
  return "Скопировать этот текст";
}

export function QuestGuide({ frames }: { frames: QuestGuideFrame[] }) {
  const [copied, setCopied] = useState<number | null>(null);
  const [openFrame, setOpenFrame] = useState<QuestGuideFrame | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!openFrame) {
      if (dialog.open) {
        try {
          if (typeof dialog.close === "function") dialog.close();
          else dialog.removeAttribute("open");
        } catch {
          dialog.removeAttribute("open");
        }
      }
      return;
    }
    try {
      if (typeof dialog.showModal === "function") {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
    } catch {
      dialog.setAttribute("open", "");
    }
    closeRef.current?.focus();
  }, [openFrame]);

  useEffect(() => {
    const dialog = dialogRef.current;
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      openerRef.current = null;
      if (!dialog?.open) return;
      try {
        if (typeof dialog.close === "function") dialog.close();
        else dialog.removeAttribute("open");
      } catch {
        dialog.removeAttribute("open");
      }
    };
  }, []);

  async function copyText(frame: QuestGuideFrame) {
    if (!frame.exactText) return;
    await navigator.clipboard.writeText(frame.exactText);
    setCopied(frame.id);
    window.setTimeout(() => setCopied(null), 1600);
  }

  function finishDialog() {
    if (!mountedRef.current) return;
    const opener = openerRef.current;
    openerRef.current = null;
    setOpenFrame(null);
    if (opener?.isConnected) opener.focus();
  }

  function closeDialog() {
    const dialog = dialogRef.current;
    if (!dialog) {
      finishDialog();
      return;
    }
    try {
      if (typeof dialog.close === "function" && dialog.open) dialog.close();
      else {
        dialog.removeAttribute("open");
        finishDialog();
      }
    } catch {
      dialog.removeAttribute("open");
      finishDialog();
    }
  }

  return (
    <section className="quest-guide" aria-label="Делайте по картинкам">
      <header className="quest-guide-heading">
        <div>
          <p className="section-kicker">Делайте по картинкам</p>
          <h2>Один кадр — одно маленькое действие</h2>
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
                <h3>{frame.title}</h3>
              </div>
            </header>

            <button type="button" className="guide-shot" onClick={(event) => { openerRef.current = event.currentTarget; setOpenFrame(frame); }} aria-label={`Увеличить кадр ${frame.id}: ${frame.title}`}>
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

      <dialog
        ref={dialogRef}
        className="image-modal"
        style={openFrame ? undefined : { display: "none" }}
        aria-label={openFrame ? `Увеличенный кадр ${openFrame.id}` : "Увеличенный кадр"}
        onClose={finishDialog}
        onCancel={(event) => { event.preventDefault(); closeDialog(); }}
        onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); closeDialog(); } }}
      >
        {openFrame && (
          <>
            <button ref={closeRef} type="button" aria-label={`Закрыть увеличенный кадр ${openFrame.id}`} onClick={closeDialog}><span aria-hidden="true">×</span><span>Закрыть</span></button>
            <img src={openFrame.screenshot} alt={`Увеличенный кадр ${openFrame.id}: ${openFrame.title}`} />
          </>
        )}
      </dialog>
    </section>
  );
}
