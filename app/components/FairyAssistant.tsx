"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  loadQuestionNotesResult,
  saveQuestionNoteResult,
  type QuestionNote,
} from "../lib/academy-dashboard";
import type { StorageLike } from "../lib/progress";
import { DashboardIcon } from "./DashboardIcon";
import { IskraMascot } from "./IskraMascot";
import { CuratorRequests } from "./CuratorRequests";
import { IskraChat } from "./IskraChat";

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
const noteLoadFallback = "Не удалось открыть сохранённые вопросы в этом браузере. Новый вопрос лучше скопировать вручную.";
const noteSaveFallback = "Не удалось сохранить вопрос в этом браузере. Скопируйте текст и передайте его вручную.";

function speechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

function browserStorage(): StorageLike | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
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

function clearRecognitionHandlers(recognition: SpeechRecognitionInstance) {
  recognition.onstart = null;
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;
}

function stopRecognitionSafely(recognition: SpeechRecognitionInstance) {
  clearRecognitionHandlers(recognition);
  try {
    recognition.stop();
  } catch {
    // Some browsers throw when recognition has already stopped.
  } finally {
    clearRecognitionHandlers(recognition);
  }
}

export function FairyAssistant(props: FairyAssistantProps) {
  return <FairyAssistantSession key={props.scope} {...props} />;
}

function FairyAssistantSession({ scope, mode, format, onClose }: FairyAssistantProps) {
  const headingId = useId();
  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState<QuestionNote[]>([]);
  const [status, setStatus] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const notifyNativeCloseRef = useRef(true);

  useEffect(() => {
    // Notes belong to this browser, so read them only after the client has mounted.
    const storage = browserStorage();
    const loaded = storage ? loadQuestionNotesResult(scope, storage) : { notes: [], error: "storage" as const };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotes(loaded.notes);
    setStatus(loaded.error ? noteLoadFallback : "");
  }, [scope]);

  useEffect(() => {
    // Capability detection must happen on the client to keep server markup stable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSpeechSupported(Boolean(speechRecognitionConstructor()));
  }, []);

  useEffect(() => {
    if (mode !== "floating") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    try {
      notifyNativeCloseRef.current = true;
      dialog.showModal();
      textareaRef.current?.focus();
    } catch {
      onClose?.();
      return;
    }
    return () => {
      notifyNativeCloseRef.current = false;
      try {
        if (dialog.open) dialog.close();
      } catch {
        // The dialog may already be closed by the browser's native cancel flow.
      }
    };
  }, [mode, onClose]);

  useEffect(() => () => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) stopRecognitionSafely(recognition);
  }, []);

  function saveQuestion() {
    if (!draft.trim()) return;
    const storage = browserStorage();
    const result = storage
      ? saveQuestionNoteResult(scope, draft, storage)
      : { notes, saved: false, error: "storage" as const };
    if (!result.saved) {
      if (result.error) setStatus(noteSaveFallback);
      return;
    }
    setNotes(result.notes);
    setDraft("");
    setStatus(savedStatus);
  }

  function stopSpeech() {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    try {
      recognition.stop();
    } catch {
      recognitionRef.current = null;
      clearRecognitionHandlers(recognition);
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

    let receivedTranscript = false;
    let recognition: SpeechRecognitionInstance | null = null;
    try {
      recognition = new Recognition();
      recognitionRef.current = recognition;
      recognition.lang = "ru-RU";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => {
        if (recognitionRef.current !== recognition) return;
        setListening(true);
        setStatus("Говорите — текст появится в поле вопроса. Он не сохранится сам.");
      };
      recognition.onresult = (event) => {
        if (recognitionRef.current !== recognition) return;
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
        if (recognitionRef.current !== recognition) return;
        clearRecognitionHandlers(recognition!);
        recognitionRef.current = null;
        setListening(false);
        setStatus(microphoneFallback);
      };
      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return;
        recognitionRef.current = null;
        setListening(false);
        setStatus(receivedTranscript
          ? "Голос распознан. Проверьте текст и нажмите «Сохранить вопрос»."
          : "Запись остановлена. Проверьте текст и сохраните вопрос вручную.");
      };
      recognition.start();
    } catch {
      if (recognition) stopRecognitionSafely(recognition);
      recognitionRef.current = null;
      setListening(false);
      setStatus(microphoneFallback);
    }
  }

  function closeDialog() {
    const dialog = dialogRef.current;
    if (!dialog) {
      onClose?.();
      return;
    }
    try {
      notifyNativeCloseRef.current = true;
      if (dialog.open) dialog.close();
      else onClose?.();
    } catch {
      onClose?.();
    }
  }

  const content = (
    <>
      <header className="fairy-heading">
        <IskraMascot />
        <div>
          <p>Искра · помощь внутри платформы</p>
          <h1 id={headingId}>Мои вопросы</h1>
        </div>
        {mode === "floating" && (
          <button type="button" className="fairy-close" onClick={closeDialog} aria-label="Закрыть мои вопросы"><DashboardIcon name="close" /></button>
        )}
      </header>
      <IskraChat scope={scope} format={format} draft={draft} onDraftChange={setDraft} textareaRef={textareaRef}>
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
          <button type="button" className="fairy-microphone" onClick={saveQuestion} disabled={!draft.trim()}>
            Сохранить вопрос
          </button>
      </IskraChat>
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
        ref={dialogRef}
        className="fairy-assistant fairy-assistant-floating"
        data-fairy-scope={scope}
        aria-labelledby={headingId}
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
        onClose={() => {
          if (notifyNativeCloseRef.current) onClose?.();
        }}
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
      data-visual-theme="elina-burgundy"
    >
      {content}
      <CuratorRequests />
    </main>
  );
}
