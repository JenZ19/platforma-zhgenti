"use client";

/* eslint-disable @next/next/no-img-element -- local lesson screenshots are generated teaching assets */

import { useEffect, useMemo, useRef, useState } from "react";
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
import { QuestGuide } from "./QuestGuide";
import { QuestLinks } from "./QuestLinks";
import { ServerDiscountOffer } from "./ServerDiscountOffer";
import { LessonText } from "./LessonText";
import { BeginnerTerms } from "./BeginnerTerms";
import { InstallCodexPlatformChoice } from "./InstallCodexPlatformChoice";
import { loadSetupPlatform, resetSetupPlatform, saveSetupPlatform, type SetupPlatform } from "../lib/setup-platform";
import { questLevelMinutes } from "../lib/quest-duration";

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
  const installQuest = !bundled && project.slug === "install-codex";
  const [output, setOutput] = useState<ProjectFormat | undefined>(initialOutput);
  const [choiceLoaded, setChoiceLoaded] = useState(!bundled || Boolean(initialOutput));
  const [setupPlatform, setSetupPlatform] = useState<SetupPlatform | undefined>();
  const [setupChoiceLoaded, setSetupChoiceLoaded] = useState(!installQuest);

  useEffect(() => {
    if (!bundled) return;
    const next = initialOutput ?? loadOutputChoice(project.slug, "mobile", window.localStorage);
    if (initialOutput) saveOutputChoice(project.slug, "mobile", initialOutput, window.localStorage);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOutput(next);
    setChoiceLoaded(true);
  }, [bundled, initialOutput, project.slug]);

  useEffect(() => {
    if (!installQuest) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSetupPlatform(loadSetupPlatform("mobile", window.localStorage));
    setSetupChoiceLoaded(true);
  }, [installQuest]);

  if ((bundled && !choiceLoaded) || (installQuest && !setupChoiceLoaded)) {
    return <main className="mobile-quest-shell" data-visual-theme="tactile-album"><section className="preparation-card preparation-loading">Готовим выбор формата…</section></main>;
  }

  function chooseSetupPlatform(platform: SetupPlatform) {
    saveSetupPlatform("mobile", platform, window.localStorage);
    setSetupPlatform(platform);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetInstallQuest() {
    for (const platform of ["mac", "windows"] as const) {
      const branch = `mobile:install-codex:${platform}`;
      resetProgress(branch, window.localStorage);
      resetPreparation(branch, window.localStorage);
      resetCustomization(branch, window.localStorage);
    }
    resetSetupPlatform("mobile", window.localStorage);
    setSetupPlatform(undefined);
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

  if (installQuest && !setupPlatform) {
    return <InstallCodexPlatformChoice project={project} mobile onChoose={chooseSetupPlatform} onHome={onHome} />;
  }

  const concrete = resolveProjectVariant(project, output);
  if (!concrete) return null;
  const storageSlug = bundled ? branchStorageSlug(project.slug, output!, "mobile") : installQuest ? `mobile:install-codex:${setupPlatform}` : `mobile:${concrete.slug}`;
  return (
    <MobileQuestBody
      project={concrete}
      storageSlug={storageSlug}
      profileSlug={concrete.slug}
      format={bundled ? output : undefined}
      bundle={bundled ? { slug: project.slug, title: project.title, onReset: () => { setOutput(undefined); onOutputChange(undefined); } } : undefined}
      setupPlatform={installQuest ? setupPlatform : undefined}
      onSetupReset={installQuest ? resetInstallQuest : undefined}
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
  setupPlatform,
  onSetupReset,
  onHome,
}: {
  project: ProjectDefinition;
  storageSlug: string;
  profileSlug: string;
  format?: ProjectFormat;
  bundle?: { slug: string; title: string; onReset: () => void };
  setupPlatform?: SetupPlatform;
  onSetupReset?: () => void;
  onHome: () => void;
}) {
  const [preparation, setPreparation] = useState<PreparationState | null>(null);
  const [progress, setProgress] = useState(createEmptyProgress);
  const [copied, setCopied] = useState<"main" | "help" | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const mapTriggerRef = useRef<HTMLButtonElement>(null);
  const imageDialogRef = useRef<HTMLDialogElement>(null);
  const imageCloseRef = useRef<HTMLButtonElement>(null);
  const imageOpenerRef = useRef<HTMLButtonElement | null>(null);
  const mountedRef = useRef(true);
  const [customization, setCustomization] = useState<QuestCustomization | undefined>(() => defaultCustomization(profileSlug));
  const profile = useMemo(() => getCustomizationProfile(profileSlug), [profileSlug]);
  const checklist = useMemo(() => buildRealDataChecklist(project), [project]);
  const steps = useMemo(() => buildMobileQuest(project, preparation?.mode ?? "demo", customization, setupPlatform), [project, preparation?.mode, customization, setupPlatform]);
  const capability = getMobileCapability(project);
  const setupQuest = project.journey === "setup";

  useEffect(() => {
    // Mobile data is isolated from the computer quest by storageSlug.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(loadProgress(storageSlug, window.localStorage, steps.length));
    setPreparation(loadPreparation(storageSlug, window.localStorage));
    setCustomization(loadCustomization(storageSlug, profileSlug, window.localStorage));
  }, [profileSlug, steps.length, storageSlug]);

  useEffect(() => {
    const dialog = imageDialogRef.current;
    if (!dialog) return;
    if (!imageOpen) {
      if (dialog.open) {
        try {
          if (typeof dialog.close === "function") dialog.close();
          else dialog.removeAttribute("open");
        } catch {
          dialog.removeAttribute("open");
        }
      }
      return;
    }
    try {
      if (typeof dialog.showModal === "function") {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
    } catch {
      dialog.setAttribute("open", "");
    }
    imageCloseRef.current?.focus();
  }, [imageOpen]);

  useEffect(() => {
    const dialog = imageDialogRef.current;
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      imageOpenerRef.current = null;
      if (!dialog?.open) return;
      try {
        if (typeof dialog.close === "function") dialog.close();
        else dialog.removeAttribute("open");
      } catch {
        dialog.removeAttribute("open");
      }
    };
  }, []);

  const step = steps[progress.activeStep - 1] ?? steps[0];
  const ready = setupQuest || (preparation ? isPreparationReady(preparation, checklist) : false);
  const totalLevels = steps.length;
  const lastLevel = totalLevels;
  const percent = Math.round((progress.completed.length / totalLevels) * 100);
  const finished = progress.completed.length === totalLevels;
  const screenshotBadge = step.screenshotKind === "real" ? "реальный экран" : step.screenshotKind === "placeholder" ? "заглушка для замены" : "прототип";
  const screenshotAlt = step.screenshotKind === "real"
    ? `Реальный экран ${project.slug === "install-codex" ? "OpenAI" : "AdminVPS"} — ${step.title}`
    : step.screenshotKind === "placeholder"
      ? `Заглушка для будущего скриншота — ${step.title}`
      : `Мобильный прототип уровня ${step.id}: ${step.title}`;
  const supplementalLinks = setupQuest && step.mobileAction?.href
    ? step.links?.filter((link) => link.href !== step.mobileAction?.href)
    : step.links;
  const resultHint = step.showScreenshot === false
    ? "Проверьте три коротких пункта"
    : step.screenshotKind === "placeholder"
      ? "Здесь появится ваш настоящий экран"
      : step.screenshotKind === "prototype"
        ? "Сверьте свой экран с прототипом"
        : "Сверьте свой экран с примером";

  function storePreparation(next: PreparationState) {
    setPreparation(next);
    savePreparation(storageSlug, next, window.localStorage);
  }

  function togglePreparation(id: string) {
    if (!preparation || preparation.mode !== "real") return;
    const checked = preparation.checked.includes(id) ? preparation.checked.filter((item) => item !== id) : [...preparation.checked, id];
    storePreparation({ ...preparation, checked, ready: false });
  }

  function restoreMapTriggerFocus() {
    window.setTimeout(() => {
      if (mountedRef.current && mapTriggerRef.current?.isConnected) mapTriggerRef.current.focus();
    }, 0);
  }

  function closeMap() {
    setMapOpen(false);
    restoreMapTriggerFocus();
  }

  function openMobileStep(id: number, source = progress) {
    if (!Number.isInteger(id) || id < 1 || id > totalLevels || !isStepUnlocked(source, id)) return;
    const restoreMapFocus = mapOpen;
    const next = { ...source, activeStep: id };
    setProgress(next);
    saveProgress(storageSlug, next, window.localStorage, undefined, totalLevels);
    setMapOpen(false);
    setHelpOpen(false);
    setImageOpen(false);
    if (restoreMapFocus) restoreMapTriggerFocus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finishStep() {
    if (progress.completed.includes(step.id)) {
      if (step.id < lastLevel) openMobileStep(step.id + 1);
      return;
    }
    const completed = completeStep(progress, step.id, totalLevels);
    openMobileStep(completed.activeStep, completed);
  }

  async function copyPrompt(text: string, kind: "main" | "help") {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1400);
  }

  function finishImageDialog() {
    if (!mountedRef.current) return;
    const opener = imageOpenerRef.current;
    imageOpenerRef.current = null;
    setImageOpen(false);
    if (opener?.isConnected) opener.focus();
  }

  function closeImageDialog() {
    const dialog = imageDialogRef.current;
    if (!dialog) {
      finishImageDialog();
      return;
    }
    try {
      if (typeof dialog.close === "function" && dialog.open) dialog.close();
      else {
        dialog.removeAttribute("open");
        finishImageDialog();
      }
    } catch {
      dialog.removeAttribute("open");
      finishImageDialog();
    }
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
    setCopied(null);
    setHelpOpen(false);
    setMapOpen(false);
    setImageOpen(false);
    bundle?.onReset();
    onSetupReset?.();
  }

  if (preparation === null || !ready) {
    return (
      <main className="mobile-quest-shell" data-visual-theme="tactile-album">
        <header className="mobile-topbar"><button type="button" className="brand" onClick={onHome}><span>S</span><b>SUBMARINE<small>Квесты с телефона</small></b></button><span className="phone-mode-pill">● {setupQuest ? "нужен компьютер" : "только телефон"}</span></header>
        <section className="mobile-quest-hero"><button type="button" onClick={onHome}>← Все мобильные проекты</button><div className={`mobile-capability ${capability.id}`}>{capability.label}</div><p>Неделя {project.week} · {project.track}</p><h1>{bundle?.title ?? project.title}</h1><span>{project.outcome}</span>{format && <div className="data-mode-badge output"><span>✦</span> Формат: {format === "agent" ? "ИИ-агент" : "Сервис"}</div>}{setupPlatform && <div className="data-mode-badge setup-platform"><span>{setupPlatform === "mac" ? "⌘" : "⊞"}</span> Компьютер: {setupPlatform === "mac" ? "Mac" : "Windows"}</div>}<div className="mobile-progress"><div><b>{progress.completed.length} из {totalLevels}</b><span>{percent}%</span></div><i><b style={{ width: `${percent}%` }} /></i></div><QuestResetButton mobile onReset={reset} /></section>
        {preparation === null ? <section className="preparation-card preparation-loading">Готовим мобильный квест…</section> : <QuestPreparation project={project} preparation={preparation} mobile onChooseDemo={() => storePreparation({ version: 1, mode: "demo", checked: [], ready: true })} onChooseReal={() => storePreparation({ version: 1, mode: "real", checked: [], ready: false })} onToggle={togglePreparation} onStartReal={() => checklist.every((item) => preparation.checked.includes(item.id)) && storePreparation({ ...preparation, ready: true })} onBack={() => { resetPreparation(storageSlug, window.localStorage); setPreparation(createEmptyPreparation()); }} />}
        <footer className="mobile-footer"><span>SUBMARINE</span><h2>Всё сложное<br /><em>Фея берёт на себя.</em></h2></footer>
      </main>
    );
  }

  const stepDone = progress.completed.includes(step.id);

  return (
    <>
      <main className="mobile-quest-workspace mobile-quest-shell" data-quest-workspace="mobile" data-visual-theme="tactile-album">
        <header className="mobile-topbar"><button type="button" className="brand" onClick={onHome}><span>S</span><b>SUBMARINE<small>Квесты с телефона</small></b></button><span className="phone-mode-pill">● {setupQuest ? "нужен компьютер" : "только телефон"}</span></header>
        <section className="mobile-quest-hero">
          <button type="button" onClick={onHome}>← Все мобильные проекты</button>
          <div className={`mobile-capability ${capability.id}`}>{capability.label}</div>
          <p>Неделя {project.week} · {project.track}</p>
          <strong className="mobile-quest-project-title">{bundle?.title ?? project.title}</strong>
          <span>{project.outcome}</span>
          {format && <div className="data-mode-badge output"><span>✦</span> Формат: {format === "agent" ? "ИИ-агент" : "Сервис"}</div>}
          {setupPlatform && <div className="data-mode-badge setup-platform"><span>{setupPlatform === "mac" ? "⌘" : "⊞"}</span> Компьютер: {setupPlatform === "mac" ? "Mac" : "Windows"}</div>}
          {!setupQuest && <div className={`data-mode-badge ${preparation.mode}`}><span>●</span> Режим: {preparation.mode === "real" ? "реальные ответы · короткий разговор" : "вымышленные данные"}</div>}
          <div className="mobile-progress" aria-label={`Прогресс ${percent}%`}><div><b>{progress.completed.length} из {totalLevels}</b><span>{percent}%</span></div><i><b style={{ width: `${percent}%` }} /></i></div>
          <QuestResetButton mobile onReset={reset} />
        </section>

        <button ref={mapTriggerRef} className="mobile-level-map-trigger" type="button" aria-expanded={mapOpen} aria-controls="mobile-level-sheet" onClick={() => setMapOpen((value) => !value)}>Уровень {step.id} из {totalLevels} · Открыть карту уровней</button>
        {mapOpen && (
          <aside id="mobile-level-sheet" className="mobile-level-sheet" aria-labelledby="mobile-level-sheet-title">
            <header><h2 id="mobile-level-sheet-title">Карта уровней</h2><button type="button" onClick={closeMap} aria-label="Закрыть карту уровней"><span aria-hidden="true">×</span><span>Закрыть</span></button></header>
            <nav aria-label="Карта уровней">
              {steps.map((item) => {
                const unlocked = isStepUnlocked(progress, item.id);
                const done = progress.completed.includes(item.id);
                const current = item.id === step.id;
                const status = done ? "Пройден" : current ? "Сейчас" : unlocked ? "Доступен" : "Закрыт";
                return (
                  <button type="button" key={item.id} disabled={!unlocked} aria-current={current ? "step" : undefined} aria-label={`Уровень ${item.id}: ${item.title}${done ? ", пройден" : unlocked ? "" : ", закрыт"}`} onClick={() => openMobileStep(item.id)}>
                    <span aria-hidden="true">{done ? "✓" : item.id}</span><b>{item.title}<small>{status}</small></b>
                  </button>
                );
              })}
            </nav>
          </aside>
        )}

        <article className="mobile-quest-step-card" aria-live="polite">
          <header className="mobile-quest-step-heading"><p>{step.eyebrow} · уровень {step.id} из {totalLevels} · ≈ {questLevelMinutes(step.id, "mobile")} мин</p><h1>{step.title}</h1></header>

          {project.slug === "server-152fz" && <ServerDiscountOffer mobile />}

          <section className="mobile-why"><h2>Зачем</h2><LessonText text={step.why} kind="why" /></section>
          <BeginnerTerms terms={step.beginnerTerms} />

          <section className="mobile-do">
            <h2>Что сделать</h2>
            <LessonText text={step.action} variant="action" kind="action" />
            {step.id === 2 && profile && customization && <QuestCustomizer compact profile={profile} selection={customization} onChange={setCustomization} onSave={(next) => { saveCustomization(storageSlug, profileSlug, next, window.localStorage); setCustomization(next); }} />}
            <MobileActionButton action={step.mobileAction} projectSlug={project.slug} step={step.id} />
          </section>

          {step.prompt && <section className="mobile-prompt"><header><h2>Готовая команда для Codex</h2><span>Скопируйте целиком</span></header><p>{step.prompt}</p><button type="button" onClick={() => copyPrompt(step.prompt!, "main")}>{copied === "main" ? "Скопировано ✓" : "Скопировать команду"}</button></section>}

          {step.guide && <QuestGuide frames={step.guide} />}
          <QuestLinks links={supplementalLinks} />

          <section className="mobile-result">
            <div><div><h2>Готово, если</h2><p>{resultHint}</p></div>{step.showScreenshot !== false && <small className="mobile-screenshot-badge">{screenshotBadge}</small>}</div>
            {step.showScreenshot !== false && <button type="button" className={`screenshot-${step.screenshotKind ?? "prototype"}`} onClick={(event) => { imageOpenerRef.current = event.currentTarget; setImageOpen(true); }} aria-label="Увеличить мобильный пример"><img src={step.screenshot} alt={screenshotAlt} /><span>Увеличить</span></button>}
            <ul>{step.expected.map((item) => <li key={item}><span aria-hidden="true">✓</span>{item}</li>)}</ul>
            {finished && step.id === lastLevel && <section className="finish-card"><i aria-hidden="true">✦</i><p>Квест завершён</p><h3>{setupQuest ? "Рабочее место готово к следующим проектам" : "Теперь этот проект — часть твоего портфолио"}</h3></section>}
          </section>

          <section className="mobile-quest-help">
            <header><h2>Помощь</h2><button type="button" aria-expanded={helpOpen} onClick={() => setHelpOpen((value) => !value)}>{helpOpen ? "Скрыть помощь" : "Нужна помощь"}</button></header>
            {helpOpen && <div className="mobile-help"><span aria-hidden="true">?</span><div><h3>{step.help.title}</h3><LessonText text={step.help.body} kind="help" /><div className="mobile-help-prompt"><p>{step.help.prompt}</p><button type="button" onClick={() => copyPrompt(step.help.prompt, "help")}>{copied === "help" ? "Скопировано ✓" : "Скопировать команду помощи"}</button></div></div></div>}
          </section>

          <footer className="mobile-quest-step-actions">
            <button type="button" onClick={() => openMobileStep(step.id - 1)} disabled={step.id === 1}>← Назад</button>
            <button type="button" disabled={finished && step.id === lastLevel} onClick={finishStep}>{stepDone ? (step.id === lastLevel ? "Квест пройден ✦" : "Продолжить →") : step.id === lastLevel ? "Завершить квест ✦" : "Я сделала — продолжить →"}</button>
          </footer>
        </article>

        <footer className="mobile-footer"><span>SUBMARINE</span><h2>Всё сложное<br /><em>Фея берёт на себя.</em></h2></footer>
      </main>

      {step.showScreenshot !== false && (
        <dialog ref={imageDialogRef} className="image-modal" style={imageOpen ? undefined : { display: "none" }} aria-label="Увеличенный мобильный пример" onClose={finishImageDialog} onCancel={(event) => { event.preventDefault(); closeImageDialog(); }} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); closeImageDialog(); } }}>
          <button ref={imageCloseRef} type="button" aria-label="Закрыть увеличенный мобильный пример" onClick={closeImageDialog}><span aria-hidden="true">×</span><span>Закрыть</span></button>
          <img src={step.screenshot} alt={screenshotAlt} />
        </dialog>
      )}
    </>
  );
}
