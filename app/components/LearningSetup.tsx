"use client";
import { useState } from "react";
import { exportLearningBackup, importLearningBackup } from "../lib/learning-backup";
import { PersonalFairy } from "./PersonalFairy";
import { TelegramReminders } from "./TelegramReminders";

export function LearningSetup({ mobile, onRefresh = () => undefined, initiallyExpanded = mobile }: { mobile: boolean; onRefresh?: () => void; initiallyExpanded?: boolean }) {
  const [notice, setNotice] = useState("");
  const [expanded, setExpanded] = useState(initiallyExpanded);
  return <details className="learning-setup" open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
    <summary>{mobile ? "Настройки: помощник и учебный прогресс" : "Настройки учебного прогресса"}</summary>
    {mobile ? <section>
      <h3>Делаем проекты с Феечкой</h3>
      <p>Урок открыт здесь, а сайт или приложение вы собираете с Феечкой в Telegram. Устанавливать Codex на телефон не нужно.</p>
      <ol className="fairy-start-steps">
        <li><strong>Откройте Феечку.</strong> Если Telegram показывает кнопку «Начать» — нажмите её.</li>
        <li><strong>Вернитесь в урок и скопируйте команду.</strong> Кнопка «Скопировать команду» находится на нужном шаге.</li>
        <li><strong>Вставьте команду в чат Феечки и отправьте.</strong> Дождитесь ответа, откройте результат и вернитесь в урок.</li>
      </ol>
      {expanded && <PersonalFairy settings className="fairy-start-link" />}
    </section> : null}
    <details className="progress-transfer"><summary>Продолжить на другом устройстве</summary>
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
    </details>
    {expanded && <TelegramReminders />}
    <p><a href="#learning-reset">Начать обучение заново →</a></p>
    <p role="status">{notice}</p>
  </details>;
}
