"use client";

import { useEffect, useState } from "react";
import { resetLearning, restoreLearning, resetBackupKey } from "../lib/reset-learning";

export function LearningReset({ mobile, onRefresh = () => undefined }: { mobile: boolean; onRefresh?: () => void }) {
  const [notice, setNotice] = useState("");
  const [canRestore, setCanRestore] = useState(false);
  const [wasReset, setWasReset] = useState(false);

  function checkBackup() {
    try { setCanRestore(window.localStorage.getItem(resetBackupKey) !== null); }
    catch { setCanRestore(false); }
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkBackup();
  }, []);

  function reset() {
    if (!window.confirm("Начать всё обучение заново? В этом браузере сбросятся пройденные шаги, выбор проектов, их учебные настройки, список «На потом» и карточки портфолио — в мобильном и компьютерном формате. Доступ, адрес Феечки, вопросы и созданные сайты/файлы сохранятся. Последний сброс можно отменить.")) return;
    try {
      resetLearning(window.localStorage);
      checkBackup();
      setWasReset(true);
      setNotice("Учебный прогресс сброшен. Можно начать с первой недели. Последний сброс можно отменить здесь.");
      window.dispatchEvent(new Event("learning-settings"));
      onRefresh();
    } catch {
      checkBackup();
      setNotice("Не удалось завершить сброс. Проверьте доступ к хранилищу браузера. Если копия создана, восстановите прогресс кнопкой ниже.");
    }
  }

  function restore() {
    if (!window.confirm("Восстановить данные перед последним сбросом? Новые отметки и учебные настройки в этом браузере будут заменены копией.")) return;
    try {
      restoreLearning(window.localStorage);
      setWasReset(false);
      setNotice("Данные перед последним сбросом восстановлены.");
      window.dispatchEvent(new Event("learning-settings"));
      onRefresh();
    } catch { setNotice("Не удалось восстановить прогресс. Копия для восстановления сохранена в браузере."); }
  }

  return <section id="learning-reset" className="learning-reset" aria-labelledby="learning-reset-title">
    <div>
      <h2 id="learning-reset-title">Начать обучение заново</h2>
      <p>Сбросьте все учебные шаги и выбор проектов, чтобы пройти курс с первой недели.</p>
      <details>
        <summary>Что сбросится, а что останется</summary>
        <p><strong>Сбросятся:</strong> отметки уроков и подготовки, выбор проектов недели, учебные настройки проектов, список «На потом» и карточки портфолио.</p>
        <p><strong>Сохранятся:</strong> доступ к курсу, адрес личной Феечки, вопросы и переписка. Созданные сайты, агенты и файлы не удалятся.</p>
        <p><strong>Хранится в аккаунте, а не в браузере:</strong> календарь шести недель, опубликованное портфолио и сертификат. Сброс их не трогает: календарь сдвигается в блоке «Настроить календарь», страницу портфолио можно снять с публикации в разделе «Портфолио».</p>
        <p>Сброс действует <strong>только в этом браузере</strong>, сразу для мобильного и компьютерного формата. На других устройствах ничего не изменится. Если браузером пользуются несколько учениц, их учебные отметки здесь общие.</p>
        <p>Копия перед последним сбросом сохранится здесь до очистки данных браузера. Её можно восстановить кнопкой «Отменить последний сброс».</p>
      </details>
    </div>
    <div className="learning-reset-actions">
      <button type="button" onClick={reset}>Сбросить всё обучение</button>
      {canRestore && <button type="button" onClick={restore}>Отменить последний сброс</button>}
      {wasReset && <a href={mobile ? "?format=mobile&section=home" : "?section=home"}>Начать с главной →</a>}
    </div>
    <p role="status">{notice}</p>
  </section>;
}
