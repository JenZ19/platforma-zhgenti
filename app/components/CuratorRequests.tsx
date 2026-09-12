"use client";
import { useCuratorRequests, waitingCount } from "../lib/curator-requests";

function when(moment: number): string {
  return new Date(moment * 1000).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

/** Список вопросов куратору с ответами — рядом с Искрой. */
export function CuratorRequests() {
  const { requests, loading, available } = useCuratorRequests();
  if (loading || !available) return null;

  return <section className="curator-requests" aria-labelledby="curator-requests-title">
    <h2 id="curator-requests-title">Вопросы куратору</h2>
    {!requests.length
      ? <p>Здесь появятся вопросы, которые вы отправите куратору со страницы урока — кнопка «Спросить куратора об этом шаге». Искра отвечает сразу, куратор — когда прочитает.</p>
      : <>
        <p>{waitingCount(requests) ? `Ждут ответа: ${waitingCount(requests)}. Куратор отвечает не сразу — ответ появится здесь.` : "На все вопросы есть ответы."}</p>
        <ol className="curator-requests-list">
          {requests.map((request) => <li key={request.id}>
            <p className="curator-request-meta">
              {when(request.created)}
              {request.project ? ` · ${request.project}` : ""}
              {request.step ? ` · шаг ${request.step}` : ""}
            </p>
            <p className="curator-request-question">{request.question}</p>
            {request.answer
              ? <div className="curator-request-answer"><p><strong>Ответ куратора{request.answered ? ` · ${when(request.answered)}` : ""}:</strong></p><p>{request.answer}</p></div>
              : <p className="curator-request-waiting">Ждёт ответа куратора.</p>}
          </li>)}
        </ol>
      </>}
  </section>;
}
