"use client";

/* eslint-disable @next/next/no-img-element -- local lesson screenshots are generated teaching assets */

import { useEffect, useMemo, useState } from "react";
import { buildMobileQuest, getMobileCapability } from "../content/mobile";
import { defaultCustomization, getCustomizationProfile } from "../content/customization";
import { isProjectBundle, resolveProjectVariant } from "../content/projects";
import type { CatalogProject, ProjectDefinition, ProjectFormat, QuestCustomization } from "../content/types";
import { loadCustomization, resetCustomization, saveCustomization } from "../lib/customization";
import { branchStorageSlug, loadOutputChoice, resetBundleState, saveOutputChoice } from "../lib/output-format";
import { buildRealDataChecklist, createEmptyPreparation, isPreparationReady, loadPreparation, resetPreparation, savePreparation, type QuestPreparation as PreparationState } from "../lib/preparation";
import { completeStep, createEmptyProgress, isStepUnlocked, loadProgress, resetProgress, saveProgress } from "../lib/progress";
import { MobileActionButton } from "./MobileActionButton";
import { QuestPreparation } from "./QuestPreparation";
import { QuestCustomizer } from "./QuestCustomizer";
import { QuestResetButton } from "./QuestResetButton";
import { QuestFormatChoice } from "./QuestFormatChoice";
import { QuestLinks } from "./QuestLinks";
import { ServerDiscountOffer } from "./ServerDiscountOffer";

export function MobileQuest({
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
    const next = initialOutput ?? loadOutputChoice(project.slug, "mobile", window.localStorage);
    if (initialOutput) saveOutputChoice(project.slug, "mobile", initialOutput, window.localStorage);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOutput(next);
    setChoiceLoaded(true);
  }, [bundled, initialOutput, project.slug]);

  if (bundled && !choiceLoaded) {
    return <main className="mobile-quest-shell"><section className="preparation-card preparation-loading">Готовим выбор формата…</section></main>;
  }

  function choose(format: ProjectFormat) {
    saveOutputChoice(project.slug, "mobile", format, window.localStorage);
    setOutput(format);
    onOutputChange(format);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetBundle() {
    if (!bundled) return;
    if (!window.confirm(`Сбросить проект «${project.title}» и начать с нуля?\n\nБудут удалены выбор формата, прогресс, ответы и оформление сервиса и ИИ-агента только в этом проекте. Остальные проекты сохранятся.`)) return;
    resetBundleState(project.slug, "mobile", window.localStorage);
    setOutput(undefined);
    onOutputChange(undefined);
  }

  if (bundled && !output) {
    return <QuestFormatChoice project={project} mobile onChoose={choose} onHome={onHome} onReset={resetBundle} />;
  }

  const concrete = resolveProjectVariant(project, output);
  if (!concrete) return null;
  const storageSlug = bundled ? branchStorageSlug(project.slug, output!, "mobile") : `mobile:${concrete.slug}`;
  return (
    <MobileQuestBody
      project={concrete}
      storageSlug={storageSlug}
      profileSlug={concrete.slug}
      format={bundled ? output : undefined}
      bundle={bundled ? { slug: project.slug, title: project.title, onReset: () => { setOutput(undefined); onOutputChange(undefined); } } : undefined}
      onHome={onHome}
    />
  );
}

function MobileQuestBody({
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
  const [copied, setCopied] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [customization, setCustomization] = useState<QuestCustomization | undefined>(() => defaultCustomization(profileSlug));
  const profile = useMemo(() => getCustomizationProfile(profileSlug), [profileSlug]);
  const checklist = useMemo(() => buildRealDataChecklist(project), [project]);
  const steps = useMemo(() => buildMobileQuest(project, preparation?.mode ?? "demo", customization), [project, preparation?.mode, customization]);
  const capability = getMobileCapability(project);
  const setupQuest = project.journey === "setup";

  useEffect(() => {
    // Mobile data is isolated from the computer quest by storageSlug.
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
  const ready = setupQuest || (preparation ? isPreparationReady(preparation, checklist) : false);
  const percent = Math.round((progress.completed.length / 17) * 100);

  function storePreparation(next: PreparationState) {
    setPreparation(next);
    savePreparation(storageSlug, next, window.localStorage);
  }

  function togglePreparation(id: string) {
    if (!preparation || preparation.mode !== "real") return;
    const checked = preparation.checked.includes(id) ? preparation.checked.filter((item) => item !== id) : [...preparation.checked, id];
    storePreparation({ ...preparation, checked, ready: false });
  }

  function finishStep() {
    const next = completeStep(progress, step.id);
    setProgress(next);
    saveProgress(storageSlug, next, window.localStorage);
    setHelpOpen(false);
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(step.prompt ?? "");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function reset() {
    const title = bundle?.title ?? project.title;
    const warning = bundle
      ? "Будут удалены выбор формата, прогресс, ответы и оформление сервиса и ИИ-агента только в этом проекте. Остальные проекты сохранятся."
      : "Будут удалены прогресс, ответы и оформление только этого проекта. Остальные проекты сохранятся.";
    if (!window.confirm(`Сбросить проект «${title}» и начать с нуля?\n\n${warning}`)) return;
    if (bundle) resetBundleState(bundle.slug, "mobile", window.localStorage);
    else {
      resetProgress(storageSlug, window.localStorage);
      resetPreparation(storageSlug, window.localStorage);
      resetCustomization(storageSlug, window.localStorage);
    }
    setProgress(createEmptyProgress());
    setPreparation(createEmptyPreparation());
    setCustomization(defaultCustomization(profileSlug));
    setCopied(false);
    setHelpOpen(false);
    setImageOpen(false);
    bundle?.onReset();
  }

  return (
    <main className="mobile-quest-shell">
      <header className="mobile-topbar"><button type="button" className="brand" onClick={onHome}><span>S</span><b>SUBMARINE<small>Квесты с телефона</small></b></button><span className="phone-mode-pill">● {setupQuest ? "нужен компьютер" : "только телефон"}</span></header>
      <section className="mobile-quest-hero"><button type="button" onClick={onHome}>← Все мобильные проекты</button><div className={`mobile-capability ${capability.id}`}>{capability.label}</div><p>Неделя {project.week} · {project.track}</p><h1>{bundle?.title ?? project.title}</h1><span>{project.outcome}</span>{format && <div className="data-mode-badge output"><span>✦</span> Формат: {format === "agent" ? "ИИ-агент" : "Сервис"}</div>}<div className="mobile-progress"><div><b>{progress.completed.length} из 17</b><span>{percent}%</span></div><i><b style={{ width: `${percent}%` }} /></i></div><QuestResetButton mobile onReset={reset} /></section>

      {project.slug === "server-152fz" && <ServerDiscountOffer mobile />}

      {preparation === null ? <section className="preparation-card preparation-loading">Готовим мобильный квест…</section> : !ready ? <QuestPreparation project={project} preparation={preparation} mobile onChooseDemo={() => storePreparation({ version: 1, mode: "demo", checked: [], ready: true })} onChooseReal={() => storePreparation({ version: 1, mode: "real", checked: [], ready: false })} onToggle={togglePreparation} onStartReal={() => checklist.every((item) => preparation.checked.includes(item.id)) && storePreparation({ ...preparation, ready: true })} onBack={() => { resetPreparation(storageSlug, window.localStorage); setPreparation(createEmptyPreparation()); }} /> : (
        <section className="mobile-level-wrap">
          <nav className="mobile-level-rail" aria-label="Уровни мобильного квеста">{steps.map((item) => { const unlocked = isStepUnlocked(progress, item.id); const done = progress.completed.includes(item.id); return <button type="button" key={item.id} className={`${item.id === step.id ? "active" : ""} ${done ? "done" : ""}`} disabled={!unlocked} onClick={() => { if (!unlocked) return; const next = { ...progress, activeStep: item.id }; setProgress(next); saveProgress(storageSlug, next, window.localStorage); }} aria-label={`Уровень ${item.id}: ${item.title}`}>{done ? "✓" : item.id}</button>; })}</nav>
          <article className="mobile-level-card">
            <header><div><p>{step.eyebrow} · уровень {step.id}</p><h2>{step.title}</h2></div><span>{step.id < 7 ? "3 мин" : "5 мин"}</span></header>
            <section className="mobile-why"><b>Зачем</b><p>{step.why}</p></section>
            {step.id === 2 && profile && customization && <QuestCustomizer compact profile={profile} selection={customization} onChange={setCustomization} onSave={(next) => { saveCustomization(storageSlug, profileSlug, next, window.localStorage); setCustomization(next); }} />}
            <section className="mobile-do"><p className="section-kicker">Одно действие</p><h3>{step.action}</h3><MobileActionButton action={step.mobileAction} projectSlug={project.slug} step={step.id} /></section>
            {step.prompt && <section className="mobile-prompt"><header><span>Команда уже готова</span><b>Codex</b></header><p>{step.prompt}</p><button type="button" onClick={copyPrompt}>{copied ? "Скопировано ✓" : "Скопировать на всякий случай"}</button></section>}
            <QuestLinks links={step.links} />
            <section className="mobile-result"><div><p className="section-kicker">Что должно получиться</p><h3>Сверьте экран</h3></div><button type="button" onClick={() => setImageOpen(true)} aria-label="Увеличить мобильный пример"><img src={step.screenshot} alt={`Мобильный пример уровня ${step.id}`} /><span>Увеличить</span></button><ul>{step.expected.map((item) => <li key={item}><span>✓</span>{item}</li>)}</ul></section>
            <div className="mobile-level-actions"><button type="button" onClick={() => setHelpOpen((value) => !value)}>Нужна помощь</button><button type="button" onClick={finishStep}>{progress.completed.includes(step.id) ? step.id === 17 ? "Квест пройден ✦" : "Перейти дальше →" : "Я сделала — дальше →"}</button></div>
            {helpOpen && <section className="mobile-help"><b>?</b><div><h3>{step.help.title}</h3><p>{step.help.body}</p></div></section>}
          </article>
        </section>
      )}
      <footer className="mobile-footer"><span>SUBMARINE</span><h2>Всё сложное<br /><em>Фея берёт на себя.</em></h2></footer>
      {imageOpen && <div className="image-modal" role="dialog" aria-modal="true" aria-label="Мобильный пример"><button type="button" onClick={() => setImageOpen(false)}>×</button><img src={step.screenshot} alt={`Увеличенный мобильный пример уровня ${step.id}`} /></div>}
    </main>
  );
}
