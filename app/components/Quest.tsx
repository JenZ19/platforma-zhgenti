"use client";

/* eslint-disable @next/next/no-img-element -- generated lesson screens are fixed-size local teaching assets */

import { useEffect, useMemo, useState } from "react";
import { buildQuest } from "../content/quests";
import { defaultCustomization, getCustomizationProfile } from "../content/customization";
import { isProjectBundle, resolveProjectVariant } from "../content/projects";
import type { CatalogProject, ProjectDefinition, ProjectFormat, QuestCustomization } from "../content/types";
import { loadCustomization, resetCustomization, saveCustomization } from "../lib/customization";
import { branchStorageSlug, loadOutputChoice, resetBundleState, saveOutputChoice } from "../lib/output-format";
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
import { QuestResetButton } from "./QuestResetButton";
import { QuestFormatChoice } from "./QuestFormatChoice";

export function Quest({
  project,
  initialOutput,
  onOutputChange = () => undefined,
  onHome,
}: {
  project: CatalogProject;
  initialOutput?: ProjectFormat;
  onOutputChange?: (output?: ProjectFormat) => void;
  onHome: () => void;
}) {
  const bundled = isProjectBundle(project);
  const [output, setOutput] = useState<ProjectFormat | undefined>(initialOutput);
  const [choiceLoaded, setChoiceLoaded] = useState(!bundled || Boolean(initialOutput));

  useEffect(() => {
    if (!bundled) return;
    const next = initialOutput ?? loadOutputChoice(project.slug, "desktop", window.localStorage);
    if (initialOutput) saveOutputChoice(project.slug, "desktop", initialOutput, window.localStorage);
    // Choice is device-local and restored only after the browser mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOutput(next);
    setChoiceLoaded(true);
  }, [bundled, initialOutput, project.slug]);

  if (bundled && !choiceLoaded) {
    return <main className="quest-shell"><section className="preparation-card preparation-loading">Готовим выбор формата…</section></main>;
  }

  function choose(format: ProjectFormat) {
    saveOutputChoice(project.slug, "desktop", format, window.localStorage);
    setOutput(format);
    onOutputChange(format);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetBundle() {
    if (!bundled) return;
    if (!window.confirm(`Сбросить проект «${project.title}» и начать с нуля?\n\nБудут удалены выбор формата, прогресс, ответы и оформление сервиса и ИИ-агента только в этом проекте. Остальные проекты сохранятся.`)) return;
    resetBundleState(project.slug, "desktop", window.localStorage);
    setOutput(undefined);
    onOutputChange(undefined);
  }

  if (bundled && !output) {
    return <QuestFormatChoice project={project} onChoose={choose} onHome={onHome} onReset={resetBundle} />;
  }

  const concrete = resolveProjectVariant(project, output);
  if (!concrete) return null;
  const storageSlug = bundled ? branchStorageSlug(project.slug, output!, "desktop") : concrete.slug;
  return (
    <QuestBody
      project={concrete}
      storageSlug={storageSlug}
      profileSlug={concrete.slug}
      format={bundled ? output : undefined}
      bundle={bundled ? { slug: project.slug, title: project.title, onReset: () => { setOutput(undefined); onOutputChange(undefined); } } : undefined}
      onHome={onHome}
    />
  );
}

function QuestBody({
  project,
  storageSlug,
  profileSlug,
  format,
  bundle,
  onHome,
}: {
  project: ProjectDefinition;
  storageSlug: string;
  profileSlug: string;
  format?: ProjectFormat;
  bundle?: { slug: string; title: string; onReset: () => void };
  onHome: () => void;
}) {
  const [preparation, setPreparation] = useState<PreparationState | null>(null);
  const [progress, setProgress] = useState(createEmptyProgress);
  const [helpOpen, setHelpOpen] = useState(false);
  const [copied, setCopied] = useState<"main" | "help" | null>(null);
  const [reward, setReward] = useState<string | null>(null);
  const [imageOpen, setImageOpen] = useState(false);
  const [customization, setCustomization] = useState<QuestCustomization | undefined>(() => defaultCustomization(profileSlug));
  const profile = useMemo(() => getCustomizationProfile(profileSlug), [profileSlug]);
  const steps = useMemo(() => buildQuest(project, preparation?.mode ?? "demo", customization), [project, preparation?.mode, customization]);
  const checklist = useMemo(() => buildRealDataChecklist(project), [project]);

  useEffect(() => {
    // Quest progress is stored in this browser and restored after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(loadProgress(storageSlug, window.localStorage));
    setPreparation(loadPreparation(storageSlug, window.localStorage));
    setCustomization(loadCustomization(storageSlug, profileSlug, window.localStorage));
  }, [profileSlug, storageSlug]);

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
    savePreparation(storageSlug, next, window.localStorage);
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
    resetPreparation(storageSlug, window.localStorage);
    setPreparation(createEmptyPreparation());
  }

  function chooseStep(id: number) {
    if (!isStepUnlocked(progress, id)) return;
    const next = { ...progress, activeStep: id };
    setProgress(next);
    saveProgress(storageSlug, next, window.localStorage);
    setHelpOpen(false);
  }

  function finishStep() {
    const wasDone = progress.completed.includes(step.id);
    const next = completeStep(progress, step.id);
    setProgress(next);
    saveProgress(storageSlug, next, window.localStorage);
    setHelpOpen(false);
    if (!wasDone && step.reward) setReward(step.reward);
  }

  async function copy(text: string, kind: "main" | "help") {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1600);
  }

  function reset() {
    const title = bundle?.title ?? project.title;
    const warning = bundle
      ? "Будут удалены выбор формата, прогресс, ответы и оформление сервиса и ИИ-агента только в этом проекте. Остальные проекты сохранятся."
      : "Будут удалены прогресс, ответы и оформление только этого проекта. Остальные проекты сохранятся.";
    if (!window.confirm(`Сбросить проект «${title}» и начать с нуля?\n\n${warning}`)) return;
    if (bundle) resetBundleState(bundle.slug, "desktop", window.localStorage);
    else {
      resetProgress(storageSlug, window.localStorage);
      resetPreparation(storageSlug, window.localStorage);
      resetCustomization(storageSlug, window.localStorage);
    }
    setProgress(createEmptyProgress());
    setPreparation(createEmptyPreparation());
    setCustomization(defaultCustomization(profileSlug));
    setHelpOpen(false);
    setCopied(null);
    setReward(null);
    setImageOpen(false);
    bundle?.onReset();
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
        <h1>{bundle?.title ?? project.title}</h1>
        <p>{project.outcome}</p>
        <div className="quest-progress" aria-label={`Прогресс ${percent}%`}><div><span>Твоё превращение</span><strong>{progress.completed.length} / 17</strong></div><i><b style={{ width: `${percent}%` }} /></i></div>
        <QuestResetButton onReset={reset} />
        {format && <div className="data-mode-badge output"><span>✦</span> Формат: {format === "agent" ? "ИИ-агент" : "Сервис"}</div>}
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
        </aside>

        <article className="level-card" aria-live="polite">
          <header className="level-header"><div><p>Уровень {String(step.id).padStart(2, "0")} <i>✦</i></p><h2>{step.title}</h2></div><span>≈ {step.id < 5 ? 5 : step.id < 13 ? 7 : 10} мин</span></header>
          <section className="why-card"><b>Зачем это</b><p>{step.why}</p></section>

          {step.id === 2 && profile && customization && <QuestCustomizer profile={profile} selection={customization} onChange={setCustomization} onSave={(next) => { saveCustomization(storageSlug, profileSlug, next, window.localStorage); setCustomization(next); }} />}

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
