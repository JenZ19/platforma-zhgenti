"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { loadQuestionNotes, saveQuestionNote, type QuestionNote } from "../lib/academy-dashboard";
import { DashboardIcon } from "./DashboardIcon";

type SpeechResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript?: string }>>;
};

type SpeechErrorEvent = {
  error?: string;
};

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export type FairyAssistantProps = {
  scope: string;
  mode: "full" | "floating";
  format?: "desktop" | "mobile";
  onClose?: () => void;
};

const savedStatus = "Вопрос сохранён на этом устройстве. Покажите его куратору или вставьте в ChatGPT/Codex.";
const microphoneFallback = "Микрофон недоступен. Напишите вопрос в поле — текстовый ввод работает без микрофона.";

function speechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

function formatSavedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function FairyAssistant({ scope, mode, format, onClose }: FairyAssistantProps) {
  const headingId = useId();
  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState<QuestionNote[]>([]);
  const [status, setStatus] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Notes belong to this browser, so read them only after the client has mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotes(loadQuestionNotes(scope, window.localStorage));
    setDraft("");
    setStatus("");
  }, [scope]);

  useEffect(() => {
    // Capability detection must happen on the client to keep server markup stable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSpeechSupported(Boolean(speechRecognitionConstructor()));
  }, []);

  useEffect(() => {
    if (mode === "floating") textareaRef.current?.focus();
  }, [mode]);

  useEffect(() => () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    recognition.stop();
    recognitionRef.current = null;
  }, []);

  function saveQuestion() {
    const next = saveQuestionNote(scope, draft, window.localStorage);
    if (!draft.trim()) return;
    setNotes(next);
    setDraft("");
    setStatus(savedStatus);
  }

  function stopSpeech() {
    try {
      recognitionRef.current?.stop();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setStatus(microphoneFallback);
    }
  }

  function startSpeech() {
    if (recognitionRef.current) {
      stopSpeech();
      return;
    }

    const Recognition = speechRecognitionConstructor();
    if (!Recognition) {
      setSpeechSupported(false);
      setStatus(microphoneFallback);
      return;
    }

    let failed = false;
    let receivedTranscript = false;
    try {
      const recognition = new Recognition();
      recognitionRef.current = recognition;
      recognition.lang = "ru-RU";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => {
        setListening(true);
        setStatus("Говорите — текст появится в поле вопроса. Он не сохранится сам.");
      };
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript?.trim() ?? "")
          .filter(Boolean)
          .join(" ")
          .trim();
        if (!transcript) return;
        receivedTranscript = true;
        setDraft(transcript);
        setStatus("Голос распознан. Проверьте текст и нажмите «Сохранить вопрос».");
      };
      recognition.onerror = () => {
        failed = true;
        recognitionRef.current = null;
        setListening(false);
        setStatus(microphoneFallback);
      };
      recognition.onend = () => {
        recognitionRef.current = null;
        setListening(false);
        if (failed) return;
        setStatus(receivedTranscript
          ? "Голос распознан. Проверьте текст и нажмите «Сохранить вопрос»."
          : "Запись остановлена. Проверьте текст и сохраните вопрос вручную.");
      };
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setStatus(microphoneFallback);
    }
  }

  function closeOnEscape(event: KeyboardEvent<HTMLElement>) {
    if (mode === "floating" && event.key === "Escape") {
      event.preventDefault();
      onClose?.();
    }
  }

  const content = (
    <>
      <header className="fairy-heading">
        <DashboardIcon name="fairy" />
        <div>
          <p>Помощь внутри платформы</p>
          <h1 id={headingId}>Феечка</h1>
        </div>
        {mode === "floating" && (
          <button type="button" className="fairy-close" onClick={onClose} aria-label="Закрыть Феечку">×</button>
        )}
      </header>
      <p className="fairy-intro">
        Опишите, на каком экране остановились, что нажали и что увидели. Вопрос останется только на этом устройстве, пока вы сами его не скопируете.
      </p>
      <div className="fairy-compose">
        <label htmlFor={`${headingId}-question`}>Вопрос Феечке</label>
        <textarea
          ref={textareaRef}
          id={`${headingId}-question`}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            if (status === savedStatus) setStatus("");
          }}
          rows={5}
          placeholder="Например: я открыла второй уровень, но не вижу нужную кнопку…"
        />
        <div className="fairy-actions">
          {speechSupported && (
            <button
              type="button"
              className="fairy-microphone"
              aria-label={listening ? "Остановить голосовой ввод" : "Начать голосовой ввод"}
              aria-pressed={listening}
              onClick={startSpeech}
            >
              {listening ? "Остановить запись" : "Продиктовать"}
            </button>
          )}
          <button type="button" className="fairy-save" onClick={saveQuestion} disabled={!draft.trim()}>
            Сохранить вопрос
          </button>
        </div>
      </div>
      {status && <p className="fairy-status" role="status" aria-live="polite">{status}</p>}
      {notes.length > 0 && (
        <section className="fairy-notes" aria-labelledby={`${headingId}-notes`}>
          <h2 id={`${headingId}-notes`}>Сохранённые вопросы</h2>
          <ul aria-label="Сохранённые вопросы">
            {notes.map((note) => (
              <li key={note.id}>
                <time dateTime={note.createdAt}>Сохранено {formatSavedAt(note.createdAt)}</time>
                <p>{note.text}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );

  if (mode === "floating") {
    return (
      <dialog
        open
        className="fairy-assistant fairy-assistant-floating"
        data-fairy-scope={scope}
        aria-modal="true"
        aria-labelledby={headingId}
        onKeyDown={closeOnEscape}
      >
        {content}
      </dialog>
    );
  }

  return (
    <main
      className="dashboard-section fairy-assistant fairy-assistant-full"
      data-dashboard-section="fairy"
      data-dashboard-format={format}
      data-fairy-scope={scope}
      data-visual-theme="pink-cloud"
    >
      {content}
    </main>
  );
}
