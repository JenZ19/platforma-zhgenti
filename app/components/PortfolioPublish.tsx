"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { ProjectDefinition, ProjectFormat } from "../content/types";
import type { DashboardSnapshot } from "../lib/academy-dashboard";
import { loadPortfolioResults, workKindLabel } from "../lib/portfolio-results";
import { certificatePageUrl, galleryPageUrl, portfolioPageUrl, suggestSlug, useCourseAccount, type PortfolioWork } from "../lib/course-account";

export type PublishableWork = { id: string; project: ProjectDefinition; output?: ProjectFormat };

const statusLabels: Record<PortfolioWork["status"], string> = {
  study: "Учебная работа",
  personal: "Пользуюсь сама",
  client: "Сделано для заказчика",
};

/** Публикация портфолио: открытая страница по ссылке и сертификат после шести недель. */
export function PortfolioPublish({ works, snapshot }: { works: PublishableWork[]; snapshot: DashboardSnapshot }) {
  const { account, loading, available, savePortfolio, publishPortfolio, unpublishPortfolio, requestCertificate } = useCourseAccount();
  const id = useId();
  const [cards, setCards] = useState<Record<string, { title: string; description: string; url: string; status: PortfolioWork["status"] }>>({});
  const [chosen, setChosen] = useState<string[]>([]);
  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [listed, setListed] = useState(false);
  const [indexable, setIndexable] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCards(loadPortfolioResults(window.localStorage) as typeof cards);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!account.portfolio.exists) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeadline((value) => value || account.portfolio.headline || "");
    setAbout((value) => value || account.portfolio.about || "");
    setContact((value) => value || account.portfolio.contact?.value || "");
    setAddress((value) => value || account.portfolio.slug || "");
    setListed(account.portfolio.listed);
    setIndexable(account.portfolio.indexable);
  }, [account.portfolio]);

  const fillable = useMemo(() => works.filter((work) => cards[work.id]?.title || cards[work.id]?.description), [works, cards]);
  const selected = chosen.length ? chosen : fillable.slice(0, 8).map((work) => work.id);
  const closedWeeks = (snapshot.course ?? []).filter((week) => week.complete).map((week) => week.week);
  const allWeeksClosed = closedWeeks.length >= 6;
  const published = account.portfolio.published && account.portfolio.slug;
  const certificate = account.portfolio.certificate;

  if (loading || !available || !ready) return null;

  function payload() {
    const list = works.filter((work) => selected.includes(work.id)).slice(0, 8).map((work) => ({
      title: (cards[work.id]?.title || work.project.title).trim(),
      description: (cards[work.id]?.description || "").trim(),
      url: (cards[work.id]?.url || "").trim(),
      status: cards[work.id]?.status ?? "study",
      kind: workKindLabel(work.project, work.output),
    }));
    return { headline, about, contact, works: list };
  }

  async function run(label: string, action: () => Promise<unknown>, done: string) {
    if (busy) return;
    setBusy(label);
    setError("");
    setNotice("");
    try { await action(); setNotice(done); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Не удалось сохранить. Попробуйте ещё раз."); }
    finally { setBusy(""); }
  }

  return <section className="portfolio-publish" aria-labelledby={`${id}-title`}>
    <header>
      <p className="academy-kicker">Страница для показа клиенту</p>
      <h2 id={`${id}-title`}>Опубликовать портфолио</h2>
      <p>Соберём из ваших карточек отдельную страницу с адресом, который можно отправить заказчику. По умолчанию она открывается только у тех, кому вы дали ссылку, и не попадает в поиск. Снять с публикации можно в любой момент.</p>
    </header>

    {!fillable.length ? <p className="portfolio-publish-empty">Сначала заполните хотя бы одну карточку работы выше: название, описание и ссылку. После этого здесь появится публикация.</p> : <>
      <form onSubmit={(event) => {
        event.preventDefault();
        run("publish", async () => {
          await savePortfolio(payload());
          await publishPortfolio(address, listed, listed && indexable);
        }, "Портфолио опубликовано. Ссылку ниже можно отправлять.");
      }}>
        <fieldset className="portfolio-publish-works">
          <legend>Какие работы показать ({selected.length} из {fillable.length})</legend>
          <p>До восьми работ. Для сертификата нужно не меньше трёх. Статус каждой работы берётся из её карточки — не выдавайте учебный проект за выполненный заказ.</p>
          {fillable.map((work) => {
            const card = cards[work.id];
            return <label key={work.id} className="portfolio-publish-work">
              <input type="checkbox" checked={selected.includes(work.id)} onChange={(event) => {
                const next = event.target.checked ? [...selected, work.id] : selected.filter((value) => value !== work.id);
                setChosen(next.length ? next : [work.id]);
              }} />
              <strong>{card?.title || work.project.title}</strong>
              <small>{workKindLabel(work.project, work.output)} · {statusLabels[card?.status ?? "study"]}{card?.url ? "" : " · без ссылки"}</small>
            </label>;
          })}
        </fieldset>

        <label htmlFor={`${id}-headline`}>Чем я помогаю</label>
        <input id={`${id}-headline`} required maxLength={120} value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder="Собираю сервисы и ИИ-агентов для небольших проектов" />

        <label htmlFor={`${id}-about`}>Коротко о себе</label>
        <textarea id={`${id}-about`} required rows={4} maxLength={600} value={about} onChange={(event) => setAbout(event.target.value)} placeholder="Что вы умеете, какие задачи берёте и чего пока не делаете." />

        <label htmlFor={`${id}-contact`}>Как с вами связаться</label>
        <input id={`${id}-contact`} required maxLength={300} value={contact} onChange={(event) => setContact(event.target.value)} placeholder="@имя в Telegram, почта или https-ссылка" />
        <p className="portfolio-publish-hint">Телефон и домашний адрес на странице не публикуем. Контакт увидят все, кому вы дадите ссылку.</p>

        <label htmlFor={`${id}-address`}>Адрес страницы</label>
        <div className="portfolio-publish-address">
          <span>{portfolioPageUrl("")}</span>
          <input id={`${id}-address`} required maxLength={40} value={address} onChange={(event) => setAddress(event.target.value.toLowerCase())}
            onFocus={() => { if (!address) setAddress(suggestSlug(headline).slice(0, 24) || "portfolio"); }}
            placeholder="anna-services" pattern="[a-z0-9][a-z0-9\-]{2,39}" />
        </div>
        <p className="portfolio-publish-hint">Латиница, цифры и дефис. Адрес закрепляется за вами — менять его каждый раз не нужно.</p>

        <fieldset className="portfolio-publish-reach">
          <legend>Кто увидит страницу</legend>
          <label className="portfolio-publish-work">
            <input type="checkbox" checked={listed} onChange={(event) => { setListed(event.target.checked); if (!event.target.checked) setIndexable(false); }} />
            <strong>Показывать в витрине работ</strong>
            <small>Имя, строка «чем помогаю» и ссылка попадут в общий список <a href={galleryPageUrl()} target="_blank" rel="noreferrer">{galleryPageUrl()}</a>. Почту там не показываем.</small>
          </label>
          <label className="portfolio-publish-work">
            <input type="checkbox" checked={indexable} disabled={!listed} onChange={(event) => setIndexable(event.target.checked)} />
            <strong>Разрешить поисковикам находить мою страницу</strong>
            <small>{listed ? "Тогда вас смогут найти по имени в Яндексе и Google. Убрать из выдачи получится не сразу — поисковик обновляет её неделями." : "Доступно вместе с витриной: без ссылки из витрины поисковику неоткуда узнать о странице."}</small>
          </label>
          <p className="portfolio-publish-hint">Обе галочки можно снять в любой момент — это ваше решение, а не условие курса.</p>
        </fieldset>

        <div className="learning-actions">
          <button type="submit" className="dashboard-primary-action" disabled={!!busy}>
            {busy === "publish" ? "Публикуем…" : published ? "Обновить опубликованную страницу" : "Опубликовать портфолио"}
          </button>
          <button type="button" disabled={!!busy} onClick={() => run("save", () => savePortfolio(payload()), "Черновик сохранён в аккаунте. Страница пока закрыта.")}>
            {busy === "save" ? "Сохраняем…" : "Сохранить черновик"}
          </button>
        </div>
      </form>

      {published && <div className="portfolio-publish-live">
        <p><strong>Страница открыта:</strong> <a href={portfolioPageUrl(account.portfolio.slug!)} target="_blank" rel="noreferrer">{portfolioPageUrl(account.portfolio.slug!)}</a></p>
        <div className="learning-actions">
          <button type="button" onClick={async () => {
            try { await navigator.clipboard.writeText(portfolioPageUrl(account.portfolio.slug!)); setNotice("Ссылка скопирована."); }
            catch { setNotice("Скопируйте ссылку вручную из строки выше."); }
          }}>Скопировать ссылку</button>
          <button type="button" disabled={!!busy} onClick={() => {
            if (!window.confirm("Снять портфолио с публикации? Ссылка перестанет открываться, а карточки и адрес сохранятся.")) return;
            run("unpublish", () => unpublishPortfolio(), "Страница снята с публикации.");
          }}>Снять с публикации</button>
        </div>
        <p className="portfolio-publish-hint">Откройте ссылку в окне без входа и проверьте, что там нет лишнего: страница показывает ровно то, что вы ввели.</p>
        <p className="portfolio-publish-hint">{account.portfolio.listed
          ? <>Страница показана в витрине: <a href={galleryPageUrl()} target="_blank" rel="noreferrer">{galleryPageUrl()}</a>. {account.portfolio.indexable ? "Поисковикам она тоже открыта." : "Поисковикам она закрыта."}</>
          : "В витрину страница не попала — открывается только по вашей ссылке."}</p>
      </div>}

      <section className="portfolio-certificate">
        <h3>Сертификат о прохождении</h3>
        {certificate ? <>
          <p><strong>Сертификат {certificate.number}</strong> выдан. Страница проверки: <a href={certificatePageUrl(certificate.number)} target="_blank" rel="noreferrer">{certificatePageUrl(certificate.number)}</a></p>
          <p className="portfolio-publish-hint">Сертификат школы о прохождении курса дополнительного образования. Это не документ государственного образца. Чтобы сохранить его файлом, откройте страницу и распечатайте её в PDF.</p>
        </> : <>
          <p>Выдаётся, когда закрыты все шесть недель маршрута и опубликовано портфолио с тремя работами и больше.</p>
          <ul className="portfolio-certificate-checks">
            <li>{allWeeksClosed ? "✓" : "—"} Шесть недель маршрута закрыты ({closedWeeks.length} из 6)</li>
            <li>{published ? "✓" : "—"} Портфолио опубликовано</li>
            <li>{selected.length >= 3 ? "✓" : "—"} В портфолио не меньше трёх работ</li>
          </ul>
          <button type="button" className="dashboard-primary-action" disabled={!!busy || !allWeeksClosed || !published || selected.length < 3}
            onClick={() => run("certificate", () => requestCertificate(closedWeeks), "Сертификат выдан. Номер появится выше.")}>
            {busy === "certificate" ? "Оформляем…" : "Получить сертификат"}
          </button>
          <p className="portfolio-publish-hint">Отметки о прохождении берутся из этого браузера и из вашего аккаунта. Если какая-то неделя закрыта на другом устройстве, откройте платформу там же — прогресс сольётся сам.</p>
        </>}
      </section>
    </>}

    {error && <p role="alert" className="portfolio-publish-error">{error}</p>}
    <p role="status">{notice}</p>
  </section>;
}
