"use client";
import { useEffect, useState } from "react";
import type { ProjectDefinition, ProjectFormat } from "../content/types";
import { loadPortfolioResults, savePortfolioResult, workKindLabel, type PortfolioResult } from "../lib/portfolio-results";
import { ProjectPreview } from "./ProjectPreview";

export function PortfolioResultCard({ id, project, onOpen, output }: { id: string; project: ProjectDefinition; onOpen: () => void; output?: ProjectFormat }) {
  const [value, setValue] = useState<Omit<PortfolioResult, "updatedAt">>({ title: "", url: "", description: "", status: "study" });
  const [saved, setSaved] = useState<PortfolioResult>();
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const result = loadPortfolioResults(window.localStorage)[id];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (result) { setValue(result); setSaved(result); }
  }, [id]);
  return <article className="portfolio-result-card" aria-label={project.title}>
    <ProjectPreview project={project} />
    <div className="portfolio-card-body">
      <small>Обложка — пример из курса, не скриншот вашей работы</small>
      <h2>{saved?.title || project.title}</h2>
      <p>{workKindLabel(project, output)} · {saved?.status === "client" ? "Для заказчика" : saved?.status === "personal" ? "Для себя" : "Учебная работа"}</p>
      {saved?.description ? <p>{saved.description}</p> : <p>Добавьте описание: кому помогает ваша версия и какую задачу решает.</p>}
      {saved?.url ? <a className="dashboard-primary-action" href={saved.url} target="_blank" rel="noreferrer">Открыть мою работу ↗</a> : <p><strong>Ссылка ещё не добавлена.</strong> Прохождение урока не публикует работу автоматически.</p>}
      <details open={!saved || undefined}><summary>{saved ? "Изменить карточку" : "Заполнить карточку своей работы"}</summary>
        <form onSubmit={(event) => {
          event.preventDefault();
          try { const results = savePortfolioResult(id, value, window.localStorage); setSaved(results[id]); setNotice("Сохранено в этом браузере. Для другого устройства скачайте копию прогресса на главной."); } catch (error) { setNotice(error instanceof Error ? error.message : "Не удалось сохранить."); }
        }}>
          <label>Ваше название<input required maxLength={120} value={value.title} onChange={(event) => setValue({ ...value, title: event.target.value })} placeholder={project.title} /></label>
          <label>Ссылка на результат<input type="url" value={value.url} onChange={(event) => setValue({ ...value, url: event.target.value })} placeholder="https://…" /></label>
          <label>Для кого и что делает<textarea rows={4} maxLength={1500} value={value.description} onChange={(event) => setValue({ ...value, description: event.target.value })} /></label>
          <label>Честный статус<select value={value.status} onChange={(event) => setValue({ ...value, status: event.target.value as PortfolioResult["status"] })}><option value="study">Учебная работа</option><option value="personal">Пользуюсь сама</option><option value="client">Сделано для заказчика</option></select></label>
          <p>Перед показом откройте ссылку в отдельном окне без входа в свой аккаунт. Не публикуйте личные данные, чужие материалы без разрешения и закрытые ссылки с токеном.</p>
          <button type="submit">Сохранить карточку</button>
        </form>
      </details>
      <p role="status">{notice}</p>
      <button className="portfolio-lesson-link" type="button" onClick={onOpen}>Вернуться к уроку →</button>
    </div>
  </article>;
}
