"use client";
import { useEffect, useState } from "react";
import { exportLearningBackup, importLearningBackup, normalizePersonalBot, personalBotKey } from "../lib/learning-backup";

export function LearningSetup({ mobile, onRefresh = () => undefined }: { mobile: boolean; onRefresh?: () => void }) {
  const [bot, setBot] = useState("");
  const [notice, setNotice] = useState("");
  const [expanded, setExpanded] = useState(mobile);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBot(window.localStorage.getItem(personalBotKey) ?? "");
  }, []);
  return <details className="learning-setup" open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
    <summary>{mobile ? "Перед стартом: доступ с телефона и сохранение" : "Сохранение и перенос прогресса"}</summary>
    {mobile ? <section>
      <h3>Личный помощник в Telegram</h3>
      <p>Codex на телефон устанавливать не нужно. Для работы через Telegram школа должна выдать вам личного помощника, подключённого к вашему рабочему месту.</p>
      <p><strong>Ссылки ещё нет?</strong> Напишите куратору в вашем учебном чате: «Я учусь с телефона. Пришлите ссылку на моего личного помощника и подтвердите, что рабочее место готово». До выдачи доступа можно читать уроки; запуск через Telegram пока недоступен.</p>
      <form onSubmit={(event) => { event.preventDefault(); const url = normalizePersonalBot(bot); if (!url) { setNotice("Введите ссылку вида https://t.me/имя_bot, которую выдала школа. Токен сюда не нужен."); return; } try { window.localStorage.setItem(personalBotKey, url); setBot(url); window.dispatchEvent(new Event("learning-settings")); setNotice("Ссылка сохранена. Откройте помощника и проверьте его ответ. Это не автоматическое подключение сервера."); } catch { setNotice("Браузер не разрешил сохранить ссылку."); } }}>
        <label>Ссылка от школы<input value={bot} onChange={(event) => setBot(event.target.value)} placeholder="https://t.me/ваш_помощник_bot" autoComplete="off" /></label>
        <button type="submit">Сохранить ссылку</button>
        {normalizePersonalBot(bot) ? <a href={normalizePersonalBot(bot)} target="_blank" rel="noreferrer">Открыть и проверить помощника ↗</a> : null}
      </form>
      <p>Отправьте: «Покажи имя моего рабочего проекта и подтверди, что можешь создавать в нём файлы. Не показывай ключи и пароли». Если ответа нет или помощник не подключён, вернитесь к куратору.</p>
    </section> : null}
    <section><h3>Продолжить на другом устройстве</h3>
      <p>Прогресс хранится в этом браузере. Автоматической синхронизации между телефоном и компьютером нет. Скачайте копию, передайте её себе и загрузите на втором устройстве.</p>
      <p>Копия содержит отметки уроков, выбор маршрута и карточки портфолио. Ответы, голосовые записи, ключи и переписка в неё не входят. Названия и ссылки работ могут быть личными — храните файл у себя.</p>
      <div className="learning-actions"><button type="button" onClick={() => {
        try { const url = URL.createObjectURL(new Blob([exportLearningBackup(window.localStorage)], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = "neiroprofi-progress.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice("Копия скачана. Проектные файлы и данные созданных сервисов нужно сохранять отдельно."); } catch { setNotice("Не удалось скачать копию. Проверьте разрешения браузера."); }
      }}>Скачать прогресс</button>
      <label className="learning-import">Загрузить копию<input type="file" accept=".json,application/json" onChange={async (event) => {
        const file = event.target.files?.[0]; if (!file) return;
        if (!window.confirm("Добавить прогресс из копии? Более длинное прохождение сохранится. Выбор маршрута и карточки портфолио заменятся данными из файла.")) return;
        try { if (file.size > 2_000_000) throw new Error("Файл слишком большой."); const count = importLearningBackup(await file.text(), window.localStorage); setNotice(`Готово: перенесено записей — ${count}. Выберите тот же формат обучения, что на предыдущем устройстве.`); onRefresh(); } catch (error) { setNotice(error instanceof Error ? error.message : "Не удалось прочитать копию."); }
        event.target.value = "";
      }} /></label></div>
    </section><p role="status">{notice}</p>
  </details>;
}
