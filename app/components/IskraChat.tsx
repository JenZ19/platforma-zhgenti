"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { getQuestProject } from '../content/projects';

type Source = { title: string; href: string };
type Message = { role: 'user' | 'assistant'; content: string; sources?: Source[] };
type Context = { scope: string; format: 'mobile' | 'desktop'; step: number; os: string };
const endpoint = '/kurs1/access/api/iskra';

async function readResponse(response: Response) {
  if (!response.headers.get('content-type')?.includes('json')) throw new Error('Откройте Искру на основной платформе ezhgenti.ru/kurs1/ и войдите в аккаунт.');
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Не удалось получить ответ. Попробуйте позже.');
  return result;
}

export function IskraChat({scope, format = 'desktop', draft, onDraftChange, children, textareaRef}: {
  scope: string; format?: 'mobile' | 'desktop'; draft: string; onDraftChange: (value: string) => void;
  children?: ReactNode; textareaRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  const id = useId();
  const [messages, setMessages] = useState<Message[]>([]);
  const [available, setAvailable] = useState(false);
  const [checked, setChecked] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [context, setContext] = useState<Context>({scope, format, step:1, os:'mac'});
  const active = useRef(true);
  const logRef = useRef<HTMLDivElement>(null);
  const sending = useRef(false);
  const lastRequest = useRef<{key:string; id:string} | null>(null);

  useEffect(() => {
    active.current = true;
    let cancelled = false;
    const controller = new AbortController();
    const lesson = document.querySelector<HTMLElement>('[data-iskra-scope]');
    const current: Context = {scope: lesson?.dataset.iskraScope || (getQuestProject(scope) ? scope : 'academy'), format,
      step: Number(lesson?.dataset.iskraStep || 1), os:lesson?.dataset.iskraOs || 'mac'};
    // The DOM contains only the identifiers of the rendered lesson, not user content.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContext(current);
    fetch(`${endpoint}?scope=${encodeURIComponent(current.scope)}&format=${format}`, {credentials:'same-origin', signal:controller.signal})
      .then(readResponse).then(data => { if (!cancelled) { setChecked(true); setAvailable(data.available === true); setMessages(data.messages ?? []); } })
      .catch(e => { if (!cancelled && e.name !== 'AbortError') setError(e.message); });
    return () => { cancelled = true; active.current = false; controller.abort(); };
  }, [scope, format]);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [messages]);

  async function send() {
    if (sending.current || !available || !draft.trim()) return;
    const question = draft.trim();
    const key = JSON.stringify([context, question]);
    const requestId = lastRequest.current?.key === key ? lastRequest.current.id : crypto.randomUUID();
    lastRequest.current = {key, id:requestId};
    sending.current = true;
    setPending(true); setError('');
    try {
      const response = await fetch(endpoint, {method:'POST', credentials:'same-origin',
        headers:{'Content-Type':'application/json', 'X-Neiroprofi-Request':'1'},
        body:JSON.stringify({...context, question, requestId}), signal:AbortSignal.timeout(110000)});
      // An explicit failure is safe to retry only as a deliberate new user request.
      if (!response.ok && response.status !== 409) lastRequest.current = null;
      const data = await readResponse(response);
      if (active.current) {
        setMessages(old => [...old, {role:'user',content:question} as Message,
          {role:'assistant',content:data.answer,sources:data.sources} as Message].slice(-20));
        onDraftChange('');
      }
      lastRequest.current = null;
    } catch(e) {
      if (active.current) setError(e instanceof Error && !['TimeoutError','AbortError'].includes(e.name)
        ? e.message : 'Ответ ещё не получен. Откройте Искру заново через минуту — готовый ответ сохранится в истории.');
    } finally {
      sending.current = false;
      if (active.current) setPending(false);
    }
  }

  return <section className="iskra-chat" aria-label="Диалог с Искрой">
    <p className="iskra-chat-intro">Помогу разобраться с уроком. Что не получается?</p>
    {messages.length > 0 && <div ref={logRef} className="iskra-messages" role="log" aria-label="История диалога" aria-live="polite">
      {messages.map((m,i) => <article className={`iskra-message iskra-message-${m.role}`} key={i}>
        <strong>{m.role === 'user' ? 'Вы' : 'Искра'}</strong>
        <div className="iskra-answer">{m.content.split(/\*\*([^*\n]+)\*\*/g).map((part,j) => j % 2 ? <strong key={j}>{part}</strong> : part)}</div>
        {m.sources?.length ? <div className="iskra-sources"><span>Материалы к ответу:</span>{m.sources.filter(s => /^\/kurs1\/\?format=(mobile|desktop)&(quest=[a-z0-9-]+|section=weeks)$/.test(s.href)).map(s => <a key={s.href} href={s.href}>{s.title}</a>)}</div> : null}
      </article>)}
    </div>}
    <div className="fairy-compose">
      <label htmlFor={id}>Ваш вопрос</label>
      <textarea ref={textareaRef} id={id} value={draft} maxLength={2000} rows={3} disabled={pending}
        onChange={e => onDraftChange(e.target.value)} placeholder="Например: как открыть мою книгу рецептов с телефона?" />
      <p className="iskra-privacy">Вопрос обработает ИИ-сервис MiniMax. Не отправляйте пароли и личные данные. В аккаунте доступна история за последние 30 дней. Искра может ошибаться.</p>
      <div className="fairy-actions">
        <button type="button" className="fairy-save" disabled={!available || pending} onClick={send}>
          {pending ? 'Искра готовит ответ…' : 'Спросить Искру'}
        </button>
        {!pending && children}
      </div>
    </div>
    {pending && <p role="status" className="iskra-thinking">Сверяюсь с материалами курса. Обычно это занимает до минуты…</p>}
    {error && <p role="alert" className="iskra-chat-error">{error}</p>}
    {!available && !error && <p role="status">{checked ? 'Искра пока недоступна. Можно сохранить вопрос для куратора.' : 'Проверяю подключение Искры…'}</p>}
  </section>;
}
