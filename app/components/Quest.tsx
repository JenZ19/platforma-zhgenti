"use client";

/* eslint-disable @next/next/no-img-element -- generated lesson screens are fixed-size local teaching assets */

import { useEffect, useMemo, useState } from "react";
import { buildQuest } from "../content/quests";
import { defaultCustomization, getCustomizationProfile } from "../content/customization";
import type { ProjectDefinition, QuestCustomization } from "../content/types";
import { loadCustomization, resetCustomization, saveCustomization } from "../lib/customization";
import {
  buildRealDataChecklist,
  createEmptyPreparation,
  isPreparationReady,
  loadPreparation,
  resetPreparation,
  savePreparation,
  type QuestPreparation as PreparationState,
} from "../lib/preparation";
import {
  completeStep,
  createEmptyProgress,
  isStepUnlocked,
  loadProgress,
  resetProgress,
  saveProgress,
} from "../lib/progress";
import { QuestPreparation } from "./QuestPreparation";
import { QuestGuide } from "./QuestGuide";
import { QuestCustomizer } from "./QuestCustomizer";

export function Quest({ project, onHome }: { project: ProjectDefinition; onHome: () => void }) {
  const [preparation, setPreparation] = useState<PreparationState | null>(null);
  const [progress, setProgress] = useState(createEmptyProgress);
  const [helpOpen, setHelpOpen] = useState(false);
  const [copied, setCopied] = useState<"main" | "help" | null>(null);
  const [reward, setReward] = useState<string | null>(null);
  const [imageOpen, setImageOpen] = useState(false);
  const [customization, setCustomization] = useState<QuestCustomization | undefined>(() => defaultCustomization(project.slug));
  const profile = useMemo(() => getCustomizationProfile(project.slug), [project.slug]);
  const steps = useMemo(() => buildQuest(project, preparation?.mode ?? "demo", customization), [project, preparation?.mode, customization]);
  const checklist = useMemo(() => buildRealDataChecklist(project), [project]);

  useEffect(() => {
    // Quest progress is stored in this browser and restored after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(loadProgress(project.slug, window.localStorage));
    setPreparation(loadPreparation(project.slug, window.localStorage));
    setCustomization(loadCustomization(project.slug, window.localStorage));
  }, [project.slug]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      window.scrollTo({ top: 0, behavior: "instant" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 120);
    return () => window.clearTimeout(timer);
  }, [progress.activeStep]);

  const step = steps[progress.activeStep - 1] ?? steps[0];
  const percent = Math.round((progress.completed.length / 17) * 100);
  const finished = progress.completed.length === 17;
  const preparationReady = preparation ? isPreparationReady(preparation, checklist) : false;

  function storePreparation(next: PreparationState) {
    setPreparation(next);
    savePreparation(project.slug, next, window.localStorage);
  }

  function chooseDemo() {
    storePreparation({ version: 1, mode: "demo", checked: [], ready: true });
  }

  function chooseReal() {
    storePreparation({ version: 1, mode: "real", checked: [], ready: false });
  }

  function togglePreparation(id: string) {
    if (!preparation || preparation.mode !== "real") return;
    const checked = preparation.checked.includes(id)
      ? preparation.checked.filter((item) => item !== id)
      : [...preparation.checked, id];
    storePreparation({ ...preparation, checked, ready: false });
  }

  function startRealQuest() {
    if (!preparation || preparation.mode !== "real" || !checklist.every((item) => preparation.checked.includes(item.id))) return;
    storePreparation({ ...preparation, ready: true });
  }

  function changeDataMode() {
    resetPreparation(project.slug, window.localStorage);
    setPreparation(createEmptyPreparation());
  }

  function chooseStep(id: number) {
    if (!isStepUnlocked(progress, id)) return;
    const next = { ...progress, activeStep: id };
    setProgress(next);
    saveProgress(project.slug, next, window.localStorage);
    setHelpOpen(false);
  }

  function finishStep() {
    const wasDone = progress.completed.includes(step.id);
    const next = completeStep(progress, step.id);
    setProgress(next);
    saveProgress(project.slug, next, window.localStorage);
    setHelpOpen(false);
    if (!wasDone && step.reward) setReward(step.reward);
  }

  async function copy(text: string, kind: "main" | "help") {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1600);
  }

  function reset() {
    if (!window.confirm(`Начать квест «${project.title}» заново?`)) return;
    resetProgress(project.slug, window.localStorage);
    resetPreparation(project.slug, window.localStorage);
    resetCustomization(project.slug, window.localStorage);
    setProgress(createEmptyProgress());
    setPreparation(createEmptyPreparation());
    setCustomization(defaultCustomization(project.slug));
    setHelpOpen(false);
  }

  return (
    <main className="quest-shell">
      <header className="site-header quest-site-header">
        <button type="button" className="brand brand-button" onClick={onHome}><span>S</span><b>SUBMARINE<small>Все квесты</small></b></button>
        <div className="quest-head-meta"><span>Неделя {project.week}</span><span><i>✦</i> {progress.score} искр</span></div>
      </header>

      <section className="quest-hero">
        <button type="button" className="back-link" onClick={onHome}>← Вернуться ко всем проектам</button>
        <p className="kicker"><span /> {project.track} · {project.device}</p>
        <h1>{project.title}</h1>
        <p>{project.outcome}</p>
        <div className="quest-progress" aria-label={`Прогресс ${percent}%`}><div><span>Твоё превращение</span><strong>{progress.completed.length} / 17</strong></div><i><b style={{ width: `${percent}%` }} /></i></div>
        {preparationReady && <div className={`data-mode-badge ${preparation?.mode}`}><span>{preparation?.mode === "real" ? "◇" : "✦"}</span> Режим: {preparation?.mode === "real" ? "реальные ответы · короткий разговор" : "вымышленные данные"}</div>}
      </section>

      {preparation === null ? <section className="preparation-card preparation-loading">Готовим квест…</section> : !preparationReady ? (
        <QuestPreparation
          project={project}
          preparation={preparation}
          onChooseDemo={chooseDemo}
          onChooseReal={chooseReal}
          onToggle={togglePreparation}
          onStartReal={startRealQuest}
          onBack={changeDataMode}
        />
      ) : <div className="quest-layout">
        <aside className="quest-map" aria-label="Карта квеста">
          <div className="map-heading"><span className="map-symbol">{project.symbol}</span><div><p>Карта превращения</p><small>17 коротких уровней</small></div></div>
          <div className="level-list">
            {steps.map((item) => {
              const unlocked = isStepUnlocked(progress, item.id);
              const done = progress.completed.includes(item.id);
              return <button key={item.id} type="button" aria-label={`Уровень ${item.id}: ${item.title}${unlocked ? "" : ", закрыт"}`} disabled={!unlocked} onClick={() => chooseStep(item.id)} className={`${item.id === step.id ? "active" : ""} ${done ? "done" : ""}`}><span>{done ? "✓" : unlocked ? item.id : "⌁"}</span><b><small>{item.eyebrow}</small>{item.title}</b></button>;
            })}
          </div>
          <button type="button" className="reset-link" onClick={reset}>Начать этот квест заново</button>
        </aside>

        <article className="level-card" aria-live="polite">
          <header className="level-header"><div><p>Уровень {String(step.id).padStart(2, "0")} <i>✦</i></p><h2>{step.title}</h2></div><span>≈ {step.id < 5 ? 5 : step.id < 13 ? 7 : 10} мин</span></header>
          <section className="why-card"><b>Зачем это</b><p>{step.why}</p></section>

          {step.id === 2 && profile && customization && <QuestCustomizer profile={profile} selection={customization} onChange={setCustomization} onSave={(next) => { saveCustomization(project.slug, next, window.localStorage); setCustomization(next); }} />}

          <section className="action-section">
            <p className="section-kicker">Что сделать</p>
            <h3>{step.action}</h3>
            {!step.guide && step.prompt && <div className="prompt-card"><div><span>Готовая команда для Codex</span><i>✦</i></div><pre>{step.prompt}</pre><button type="button" onClick={() => copy(step.prompt!, "main")}>{copied === "main" ? "Скопировано ✓" : "Скопировать команду"}</button></div>}
          </section>

          {step.guide && <QuestGuide frames={step.guide} />}

          <section className="expected-section">
            <div className="expected-heading"><div><p className="section-kicker">Что должно получиться</p><h3>Сверь свой экран с примером</h3></div><span>пример</span></div>
            <button type="button" className="reference-shot" onClick={() => setImageOpen(true)} aria-label="Увеличить пример результата"><img src={step.screenshot} alt={`Пример уровня ${step.id}: ${step.title}`} /><span>Увеличить</span></button>
            <ul>{step.expected.map((item) => <li key={item}><span>✓</span>{item}</li>)}</ul>
          </section>

          <div className="level-actions"><button type="button" className="secondary-button" onClick={() => setHelpOpen((value) => !value)}>{helpOpen ? "Скрыть помощь" : "Нужна помощь"}</button><button type="button" className="primary-button" disabled={finished && step.id === 17} onClick={finishStep}>{progress.completed.includes(step.id) ? (step.id === 17 ? "Квест пройден ✦" : "Перейти дальше →") : "Я сделала — следующий шаг →"}</button></div>

          {helpOpen && <section className="help-card"><span>?</span><div><p className="section-kicker">{step.help.title}</p><p>{step.help.body}</p><div className="help-copy"><p>{step.help.prompt}</p><button type="button" onClick={() => copy(step.help.prompt, "help")}>{copied === "help" ? "Готово ✓" : "Скопировать"}</button></div></div></section>}
          {finished && step.id === 17 && <section className="finish-card"><i>✦</i><p>Квест завершён</p><h3>Теперь этот проект — часть твоего портфолио</h3><span>Ссылка, описание и безопасные экраны готовы к показу.</span></section>}
        </article>
      </div>}

      <footer className="academy-footer"><span>SUBMARINE</span><p>Один проект за другим.<br />Так появляется новая профессия.</p></footer>

      {imageOpen && <div className="image-modal" role="dialog" aria-modal="true" aria-label="Увеличенный пример"><button type="button" onClick={() => setImageOpen(false)}>×</button><img src={step.screenshot} alt={`Увеличенный пример уровня ${step.id}`} /></div>}
      {reward && <div className="reward-modal" role="dialog" aria-modal="true" aria-label="Новая награда"><div><p>✦ · ✧ · ✦</p><span>Новая награда</span><h3>{reward}</h3><b>+10 искр в твою коллекцию</b><button type="button" className="primary-button" onClick={() => setReward(null)}>Забрать награду</button></div></div>}
    </main>
  );
}
