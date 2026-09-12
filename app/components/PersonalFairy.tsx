"use client";
import { useId, useState } from "react";
import { usePersonalFairy } from "../lib/school-fairy";

export function PersonalFairy({label = "Открыть Феечку", className, settings = false, ask = false}: {label?: string; className?: string; settings?: boolean; ask?: boolean}) {
  const fairy = usePersonalFairy();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const id = useId();
  if (fairy.loading) return <span className="personal-fairy-loading">Загружаем вашу Феечку…</span>;
  // Сбой загрузки не должен запирать телефонный маршрут: адрес можно ввести руками,
  // а если его ещё не выдали — сказать об этом словами, а не технической ошибкой.
  return <div className="personal-fairy">
    {fairy.error && <div className="personal-fairy-problem" role="status">
      <p>{fairy.error}</p>
      <p>Если адрес Феечки вам ещё не выдали, попросите его у куратора: без него команды из уроков отправлять некуда. Уже есть — впишите ниже, связь с сервером для этого не нужна.</p>
      <button type="button" onClick={fairy.reload}>Повторить загрузку</button>
    </div>}
    {fairy.url && !editing ? <>
      <a className={className} href={fairy.url} target="_blank" rel="noreferrer">{label}</a>
      {settings && <><p>Сохранена в вашем аккаунте: <strong>@{fairy.url.split('/').pop()}</strong></p><button type="button" onClick={() => {setDraft(fairy.url!); setEditing(true);}}>Изменить Феечку</button></>}
    </> : editing || ask || settings || fairy.error ? <form onSubmit={async event => {
      event.preventDefault(); if (saving) return;
      setSaving(true); setError("");
      try { await fairy.save(draft); setEditing(false); }
      catch (error) {setError(error instanceof Error && error.name !== "AbortError" ? error.message : "Не удалось подтвердить сохранение. Попробуйте ещё раз.");}
      finally {setSaving(false);}
    }}>
      <label htmlFor={id}>Адрес вашей Феечки</label>
      <p id={`${id}-help`}>Вставьте ссылку на личного бота или его @имя. Сохраним в вашем аккаунте — повторно вводить не понадобится. Это не Фея-крёстная.</p>
      <input id={id} aria-describedby={`${id}-help`} value={draft} onChange={event => setDraft(event.target.value)} placeholder="@my_fairy_bot" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={100} required disabled={saving}/>
      <div className="learning-actions"><button type="submit" disabled={saving}>{saving ? "Сохраняем…" : "Сохранить Феечку"}</button>{editing && fairy.url && <button type="button" disabled={saving} onClick={() => {setEditing(false); setError("");}}>Отмена</button>}</div>
      {error && <p role="alert">{error}</p>}
      {!fairy.url && <details><summary>Где взять адрес?</summary><p>Откройте профиль своей Феечки в Telegram и скопируйте её имя пользователя. Если личного бота ещё нет, попросите его у куратора. Пароли и API-токены сюда вставлять не нужно.</p></details>}
    </form> : <button className={className} type="button" onClick={() => setEditing(true)}>Добавить мою Феечку</button>}
  </div>;
}
