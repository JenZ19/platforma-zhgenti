"use client";

/* eslint-disable @next/next/no-img-element -- generated lesson screens are fixed-size local teaching assets */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildQuest } from "../content/quests";
import { courseWeeks } from "../content/course-route";
import { troublesFor } from "../content/troubleshooting";
import { CurriculumNotice } from "./CurriculumNotice";
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
import { QuestSaveStatus } from "./QuestSaveStatus";
import { LessonExtension } from "./LessonExtension";
import { LearningKitPreview } from "./LearningKitPreview";
import { QuestResultShowcase } from "./QuestResultShowcase";
import { QuestResetButton } from "./QuestResetButton";
import { QuestFormatChoice } from "./QuestFormatChoice";
import { QuestLinks } from "./QuestLinks";
import { ServerDiscountOffer } from "./ServerDiscountOffer";
import { LessonText } from "./LessonText";
import { BeginnerTerms } from "./BeginnerTerms";
import { InstallCodexPlatformChoice } from "./InstallCodexPlatformChoice";
import { loadSetupPlatform, resetSetupPlatform, saveSetupPlatform, type SetupPlatform } from "../lib/setup-platform";
import { questLevelMinutes } from "../lib/quest-duration";
import { DashboardIcon } from "./DashboardIcon";
import { ProjectBrief, LessonChapter } from "./ProjectBrief";
import { ApiProviderChoice } from "./ApiProviderChoice";
import { LessonWorkbench } from "./LessonWorkbench";
import { ReadAheadControls } from "./ReadAheadControls";

/** Что дальше после последнего шага: сохранить работу и открыть следующую неделю. */
function QuestFinishCard({ project, setupQuest }: { project: ProjectDefinition; setupQuest: boolean }) {
  const nextWeek = setupQuest ? 1 : project.week + 1;
  const finishedRoute = nextWeek > 6;
  return <section className="finish-card">
    <i aria-hidden="true">✦</i>
    <p>Квест завершён</p>
    <h3>{setupQuest ? "Рабочее место готово" : "Работа сделана — закрепим результат"}</h3>
    <span>{setupQuest
      ? "Codex установлен и проверен. Дальше — первый собственный проект: выберите один вариант первой недели."
      : finishedRoute
        ? "Это последняя неделя маршрута. Соберите портфолио из 3–5 работ — после публикации платформа выдаст сертификат."
        : `Добавьте работу в портфолио: настоящее название и ссылку. Отметка уроков сама по себе ничего не публикует. Дальше идёт неделя ${nextWeek} — «${courseWeeks[nextWeek - 1]?.title ?? ""}».`}</span>
    <div className="finish-card-actions">
      {!setupQuest && <a className="dashboard-primary-action" href="?section=portfolio">Добавить в портфолио →</a>}
      <a className={setupQuest ? "dashboard-primary-action" : "home-secondary-action"} href="?section=weeks">
        {setupQuest ? "Выбрать проект первой недели →" : finishedRoute ? "Проверить маршрут →" : `Открыть неделю ${nextWeek} →`}
      </a>
    </div>
  </section>;
}

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
  const installQuest = !bundled && project.slug === "install-codex";
  const [output, setOutput] = useState<ProjectFormat | undefined>(initialOutput);
  const [choiceLoaded, setChoiceLoaded] = useState(!bundled || Boolean(initialOutput));
  const [setupPlatform, setSetupPlatform] = useState<SetupPlatform | undefined>();
  const [setupChoiceLoaded, setSetupChoiceLoaded] = useState(!installQuest);

  useEffect(() => {
    if (!bundled) return;
    const next = initialOutput ?? loadOutputChoice(project.slug, "desktop", window.localStorage);
    if (initialOutput) saveOutputChoice(project.slug, "desktop", initialOutput, window.localStorage);
    // Choice is device-local and restored only after the browser mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOutput(next);
    setChoiceLoaded(true);
  }, [bundled, initialOutput, project.slug]);

  useEffect(() => {
    if (!installQuest) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSetupPlatform(loadSetupPlatform("desktop", window.localStorage));
    setSetupChoiceLoaded(true);
  }, [installQuest]);

  if ((bundled && !choiceLoaded) || (installQuest && !setupChoiceLoaded)) {
    return <main className="quest-shell" data-track-layout="comfortable" data-visual-theme="tactile-album"><section className="preparation-card preparation-loading">Готовим выбор формата…</section></main>;
  }

  function chooseSetupPlatform(platform: SetupPlatform) {
    saveSetupPlatform("desktop", platform, window.localStorage);
    setSetupPlatform(platform);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetInstallQuest() {
    for (const platform of ["mac", "windows"] as const) {
      const branch = `install-codex:${platform}`;
      resetProgress(branch, window.localStorage);
      resetPreparation(branch, window.localStorage);
      resetCustomization(branch, window.localStorage);
    }
    resetSetupPlatform("desktop", window.localStorage);
    setSetupPlatform(undefined);
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

  if (installQuest && !setupPlatform) {
    return <InstallCodexPlatformChoice project={project} onChoose={chooseSetupPlatform} onHome={onHome} />;
  }

  const concrete = resolveProjectVariant(project, output);
  if (!concrete) return null;
  const storageSlug = bundled ? branchStorageSlug(project.slug, output!, "desktop") : installQuest ? `install-codex:${setupPlatform}` : concrete.slug;
  return (
    <QuestBody
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

function QuestBody({
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
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [helpOpen, setHelpOpen] = useState(false);
  const [previewStep, setPreviewStep] = useState<number | null>(null);
  const [copied, setCopied] = useState<"main" | "help" | "extension" | null>(null);
  const [reward, setReward] = useState<string | null>(null);
  const rewardDialogRef = useRef<HTMLDialogElement>(null);
  const rewardCloseRef = useRef<HTMLButtonElement>(null);
  const rewardOpenerRef = useRef<HTMLButtonElement | null>(null);
  const rewardMountedRef = useRef(true);
  const questStepCardRef = useRef<HTMLElement>(null);
  const narrowLevelMapRef = useRef<HTMLDetailsElement>(null);
  const [imageOpen, setImageOpen] = useState(false);
  const [narrowViewport, setNarrowViewport] = useState(false);
  const imageDialogRef = useRef<HTMLDialogElement>(null);
  const imageCloseRef = useRef<HTMLButtonElement>(null);
  const imageOpenerRef = useRef<HTMLButtonElement | null>(null);
  const imageMountedRef = useRef(true);
  const [customization, setCustomization] = useState<QuestCustomization | undefined>(() => defaultCustomization(profileSlug));
  const profile = useMemo(() => getCustomizationProfile(profileSlug), [profileSlug]);
  const steps = useMemo(() => buildQuest(project, preparation?.mode ?? "demo", customization, setupPlatform), [project, preparation?.mode, customization, setupPlatform]);
  const checklist = useMemo(() => buildRealDataChecklist(project), [project]);
  const setupQuest = project.journey === "setup";

  const scrollAfterStepChange = useRef(false);
  useLayoutEffect(() => {
    if (!scrollAfterStepChange.current) return;
    scrollAfterStepChange.current = false;
    // Safari can cancel a smooth scroll when the old lesson DOM is replaced.
    // Move keyboard focus off the old footer and scroll only after React commits.
    questStepCardRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  });

  useEffect(() => {
    const syncNarrowViewport = () => setNarrowViewport(window.innerWidth <= 767);
    syncNarrowViewport();
    window.addEventListener("resize", syncNarrowViewport);
    return () => window.removeEventListener("resize", syncNarrowViewport);
  }, []);

  useEffect(() => {
    // Quest progress is stored in this browser and restored after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(loadProgress(storageSlug, window.localStorage, steps.length));
    setSaveState("idle");
    setPreviewStep(null);
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
    const dialog = rewardDialogRef.current;
    if (!reward || !dialog) return;
    try {
      if (typeof dialog.showModal === "function") {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
    } catch {
      dialog.setAttribute("open", "");
    }
    rewardCloseRef.current?.focus();
  }, [reward]);

  useEffect(() => {
    const dialog = imageDialogRef.current;
    imageMountedRef.current = true;
    return () => {
      imageMountedRef.current = false;
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

  useEffect(() => {
    const dialog = rewardDialogRef.current;
    rewardMountedRef.current = true;
    return () => {
      rewardMountedRef.current = false;
      rewardOpenerRef.current = null;
      if (!dialog?.open) return;
      try {
        if (typeof dialog.close === "function") dialog.close();
        else dialog.removeAttribute("open");
      } catch {
        dialog.removeAttribute("open");
      }
    };
  }, []);

  const step = steps[(previewStep ?? progress.activeStep) - 1] ?? steps[0];
  const totalLevels = steps.length;
  const lastLevel = totalLevels;
  const percent = Math.round((progress.completed.length / totalLevels) * 100);
  const finished = progress.completed.length === totalLevels;
  const preparationReady = setupQuest || (preparation ? isPreparationReady(preparation, checklist) : false);
  const screenshotBadge = step.screenshotKind === "real" ? "реальный экран"
    : step.screenshotKind === "generated" ? "пример экрана"
    : step.screenshotKind === "placeholder" ? "заглушка для замены" : "прототип";
  const screenshotAlt = step.screenshotKind === "real"
    ? `Реальный экран ${project.slug === "install-codex" ? "OpenAI" : "AdminVPS"} — ${step.title}`
    : step.screenshotKind === "generated"
      ? `Пример экрана — ${step.title}. Макет интерфейса, у вас он может отличаться`
      : step.screenshotKind === "placeholder"
        ? `Заглушка для будущего скриншота — ${step.title}`
        : `Прототип уровня ${step.id}: ${step.title}`;

  function storePreparation(next: PreparationState) {
    if (next.ready) scrollAfterStepChange.current = true;
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

  function openStep(id: number, source = progress) {
    if (!Number.isInteger(id) || id < 1 || id > totalLevels || !isStepUnlocked(source, id)) return false;
    const next = { ...source, activeStep: id };
    try {
      if (customization) saveCustomization(storageSlug, profileSlug, customization, window.localStorage);
      saveProgress(storageSlug, next, window.localStorage, undefined, totalLevels);
    } catch {
      setSaveState("error");
      return false;
    }
    setSaveState("saved");
    scrollAfterStepChange.current = true;
    setPreviewStep(null);
    setProgress(next);
    setHelpOpen(false);
    setImageOpen(false);
    return true;
  }

  function storeCustomization(next: QuestCustomization) {
    setCustomization(next);
    try {
      saveCustomization(storageSlug, profileSlug, next, window.localStorage);
      setSaveState("saved");
      return true;
    } catch {
      setSaveState("error");
      return false;
    }
  }

  function finishStep(opener?: HTMLButtonElement) {
    if (previewStep !== null) return;
    const wasDone = progress.completed.includes(step.id);
    if (wasDone) {
      if (step.id < lastLevel) openStep(step.id + 1);
      return;
    }
    const completed = completeStep(progress, step.id, totalLevels);
    if (!openStep(completed.activeStep, completed)) return;
    if (!wasDone && step.reward) {
      rewardOpenerRef.current = opener ?? null;
      setReward(step.reward);
    }
  }

  async function copy(text: string, kind: "main" | "help" | "extension") {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1600);
  }

  function finishImageDialog() {
    if (!imageMountedRef.current) return;
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

  function finishRewardDialog() {
    if (!rewardMountedRef.current) return;
    rewardOpenerRef.current = null;
    scrollAfterStepChange.current = true;
    setReward(null);
  }

  function closeRewardDialog() {
    const dialog = rewardDialogRef.current;
    if (!dialog) {
      finishRewardDialog();
      return;
    }
    try {
      if (typeof dialog.close === "function" && dialog.open) dialog.close();
      else {
        dialog.removeAttribute("open");
        finishRewardDialog();
      }
    } catch {
      dialog.removeAttribute("open");
      finishRewardDialog();
    }
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
    setPreviewStep(null);
    setProgress(createEmptyProgress());
    setSaveState("idle");
    setPreparation(createEmptyPreparation());
    setCustomization(defaultCustomization(profileSlug));
    setHelpOpen(false);
    setCopied(null);
    setReward(null);
    setImageOpen(false);
    bundle?.onReset();
    onSetupReset?.();
  }

  if (preparation === null || !preparationReady) {
    return (
      <main className="quest-shell" data-track-layout="comfortable" data-visual-theme="tactile-album">
        <header className="site-header quest-site-header">
          <button type="button" className="brand brand-button" onClick={onHome}><span>Н</span><b>НЕЙРОПРОФИ<small>Все квесты</small></b></button>
          <div className="quest-head-meta"><span>Неделя {project.week}</span><span><i>✦</i> {progress.score} искр</span></div>
        </header>

        <div className="quest-entry-layout"><section className="quest-hero">
          <button type="button" className="back-link" onClick={onHome}>← Вернуться ко всем проектам</button>
          <p className="kicker"><span /> {project.track} · {project.device}</p>
          <h1>{bundle?.title ?? project.title}</h1>
          <p>{project.outcome}</p>
          <div className="quest-progress" aria-label={`Прогресс ${percent}%`}><div><span>Твоё превращение</span><strong>{progress.completed.length} / {totalLevels}</strong></div><i><b style={{ width: `${percent}%` }} /></i></div>
          <QuestResetButton onReset={reset} />
          {format && <div className="data-mode-badge output"><span>✦</span> Формат: {format === "agent" ? "ИИ-агент" : "Сервис"}</div>}
        </section><QuestResultShowcase project={project} /></div>

        {!setupQuest && <ProjectBrief project={project} />}
        {preparation === null ? <section className="preparation-card preparation-loading">Готовим квест…</section> : (
          <QuestPreparation
            project={project}
            preparation={preparation}
            onChooseDemo={chooseDemo}
            onChooseReal={chooseReal}
            onToggle={togglePreparation}
            onStartReal={startRealQuest}
            onBack={changeDataMode}
          />
        )}

        <footer className="academy-footer"><span>НЕЙРОПРОФИ</span><p>Один проект за другим.<br />Так появляется новая профессия.</p></footer>
      </main>
    );
  }

  const stepDone = progress.completed.includes(step.id);
  const troubles = troublesFor(step, project);
  const resultHint = step.showScreenshot === false
    ? "Проверь результат"
    : step.screenshotKind === "generated"
      ? "Пример экрана: у вас интерфейс может отличаться"
      : step.screenshotKind === "placeholder"
        ? "Здесь появится ваш настоящий экран"
        : step.screenshotKind === "prototype"
          ? "Сверь свой экран с прототипом"
          : "Сверь свой экран с примером";

  return (
    <>
      <main className="quest-workspace" data-iskra-scope={project.slug} data-iskra-step={step.id} data-iskra-os={setupPlatform ?? 'mac'} data-track-layout="comfortable" data-quest-workspace="desktop" data-visual-theme="elina-burgundy">
        <article ref={questStepCardRef} className="quest-step-card" aria-live="polite" tabIndex={-1}>
          <CurriculumNotice slug={storageSlug} total={totalLevels} />
          <header className="quest-step-heading">
            <div className="quest-step-project-bar">
              <button type="button" className="back-link" onClick={onHome}>← Все проекты</button>
              <span>{bundle?.title ?? project.title}</span>
              <span>Неделя {project.week}</span>
              <span>{progress.score} искр</span>
            </div>
            <div className="quest-step-badges">
              {format && <span className="data-mode-badge output">Формат: {format === "agent" ? "ИИ-агент" : "Сервис"}</span>}
              {setupPlatform && <span className="data-mode-badge setup-platform">Компьютер: {setupPlatform === "mac" ? "Mac" : "Windows"}</span>}
              {!setupQuest && <span className={`data-mode-badge ${preparation.mode}`}>Режим: {preparation.mode === "real" ? "реальные ответы · короткий разговор" : "вымышленные данные"}</span>}
            </div>
            <QuestResetButton onReset={reset} />
            <p>{step.eyebrow} · уровень {step.id} из {totalLevels}{!/\d+\s*мин/i.test(step.eyebrow) && <> · ≈ {questLevelMinutes(step.id, "desktop")} мин</>}</p>
            <h1>{step.title}</h1>
            {!setupQuest && step.customization === undefined && <LessonChapter step={step.id} total={totalLevels} />}
          </header>

          {narrowViewport && <details ref={narrowLevelMapRef} className="narrow-desktop-level-map">
            <summary><span>Уровень {step.id} из {totalLevels}</span><b>Карта уровней</b></summary>
            <nav aria-label="Выбор уровня на узком экране">
              {steps.map((item) => {
                const unlocked = isStepUnlocked(progress, item.id);
                const done = progress.completed.includes(item.id);
                const current = item.id === step.id;
                const status = current && done ? "Сейчас · пройден" : current ? "Сейчас" : done ? "Пройден" : unlocked ? "Доступен" : "Закрыт";
                const stateLabel = current && done ? ", текущий, пройден" : current ? ", текущий" : done ? ", пройден" : unlocked ? ", доступен" : ", закрыт";
                return (
                  <button
                    type="button"
                    key={item.id}
                    disabled={!unlocked}
                    aria-current={current ? "step" : undefined}
                    aria-label={`Уровень ${item.id}: ${item.title}${stateLabel}`}
                    onClick={() => {
                      if (narrowLevelMapRef.current) narrowLevelMapRef.current.open = false;
                      openStep(item.id);
                      if (questStepCardRef.current?.isConnected) questStepCardRef.current.focus({ preventScroll: true });
                    }}
                  >
                    <span aria-hidden="true">{done ? "✓" : item.id}</span>
                    <b>{item.title}<small>{status}</small></b>
                  </button>
                );
              })}
            </nav>
          </details>}

          <LessonWorkbench key={`${storageSlug}:${step.id}`} project={project} step={step} />
          <ReadAheadControls reading={previewStep !== null} step={step.id} total={totalLevels} optionalSetup={step.id === 1 && ["server-152fz","api-keys"].includes(project.slug)} onHome={onHome} onPreview={id=>{scrollAfterStepChange.current=true;setPreviewStep(id);setHelpOpen(false);}} onReturn={()=>{scrollAfterStepChange.current=true;setPreviewStep(null);}} />
          <QuestResultShowcase project={project} stepId={step.id} />
          {project.slug === "server-152fz" && step.id === 1 && <ServerDiscountOffer />}

          <section className="quest-purpose">
            <h2>Зачем</h2>
            <LessonText text={step.why} kind="why" />
          </section>

          <section className="quest-action" id="lesson-action">
            <h2>Что сделать</h2>
            <LessonText text={step.action} variant="action" kind="action" />
            {project.slug === "api-keys" && step.id === 5 && <ApiProviderChoice />}
            {(step.customization === undefined ? step.id === 2 : Boolean(step.customization)) && profile && customization && <QuestCustomizer agent={step.customization === "agent"} profile={profile} selection={customization} onChange={storeCustomization} onSave={storeCustomization} />}
          </section>

          <BeginnerTerms terms={step.beginnerTerms} />


          {step.guide && <details className="lesson-extra"><summary>Нужны подробности? Открыть подсказки к шагу</summary><QuestGuide frames={step.guide} /></details>}
          {step.extension && <LessonExtension extension={step.extension} onCopy={() => copy(step.extension!.prompt, "extension")} copied={copied === "extension"} />}
          {!(project.slug === "api-keys" && step.id === 5) && <QuestLinks links={step.links} />}
          <LearningKitPreview slug={project.slug} stepId={step.id} />

          <section className="quest-result" id="lesson-check">
            <div className="quest-result-heading"><div><h2>Готово, если</h2><p>{resultHint}</p></div>{step.showScreenshot !== false && <span>{screenshotBadge}</span>}</div>
            {step.showScreenshot !== false && <button type="button" className={`reference-shot screenshot-${step.screenshotKind ?? "prototype"}`} onClick={(event) => { imageOpenerRef.current = event.currentTarget; setImageOpen(true); }} aria-label="Увеличить пример результата"><img src={step.screenshot} alt={screenshotAlt} /><span>Увеличить</span></button>}
            <ul>{step.expected.map((item) => <li key={item}><span aria-hidden="true">✓</span>{item}</li>)}</ul>
            {finished && step.id === lastLevel && <QuestFinishCard project={project} setupQuest={setupQuest} />}
          </section>

          {troubles.length > 0 && <details className="quest-troubles">
            <summary>Если пошло не так на этом шаге</summary>
            <dl>
              {troubles.map((trouble) => <div key={trouble.symptom}>
                <dt>{trouble.symptom}</dt>
                <dd>{trouble.fix}</dd>
              </div>)}
            </dl>
            <p>Не помогло — спросите куратора кнопкой выше или Искру: это быстрее, чем переделывать проект заново.</p>
          </details>}

          <section className="quest-help">
            <header><h2>Помощь</h2><button type="button" className="secondary-button" aria-expanded={helpOpen} onClick={() => setHelpOpen((value) => !value)}>{helpOpen ? "Скрыть помощь" : "Нужна помощь"}</button></header>
            {helpOpen && <div className="help-card"><span aria-hidden="true">?</span><div><h3>{step.help.title}</h3><LessonText text={step.help.body} kind="help" /><div className="help-copy"><p>{step.help.prompt}</p><button type="button" onClick={() => copy(step.help.prompt, "help")}>{copied === "help" ? "Скопировано ✓" : "Скопировать команду помощи"}</button></div></div></div>}
          </section>

          <QuestSaveStatus state={saveState} />
          {previewStep === null && <footer className="quest-step-actions">
            <button type="button" onClick={() => openStep(step.id - 1)} disabled={step.id === 1}>← Назад</button>
            <button type="button" disabled={finished && step.id === lastLevel} onClick={(event) => finishStep(event.currentTarget)}>{stepDone ? (step.id === lastLevel ? "Квест пройден ✦" : "Продолжить →") : step.id === lastLevel ? "Завершить квест ✦" : "Я сделала — продолжить →"}</button>
          </footer>}
        </article>

        <aside className="quest-level-panel">
          <div className="quest-level-progress">
            <span>Прогресс</span>
            <strong>{progress.completed.length} / {totalLevels}</strong>
            <small>{totalLevels} коротких уровней</small>
            <i aria-label={`Прогресс ${percent}%`}><b style={{ width: `${percent}%` }} /></i>
          </div>
          <nav aria-label="Карта уровней">
            {steps.map((item) => {
              const unlocked = isStepUnlocked(progress, item.id);
              const done = progress.completed.includes(item.id);
              const current = item.id === step.id;
              const status = done ? "Пройден" : current ? "Сейчас" : unlocked ? "Доступен" : "Закрыт";
              return (
                <button
                  type="button"
                  key={item.id}
                  disabled={!unlocked}
                  aria-current={current ? "step" : undefined}
                  aria-label={`Уровень ${item.id}: ${item.title}${done ? ", пройден" : unlocked ? "" : ", закрыт"}`}
                  onClick={() => openStep(item.id)}
                >
                  <span aria-hidden="true">{done ? "✓" : item.id}</span>
                  <b>{item.title}<small>{status}</small></b>
                </button>
              );
            })}
          </nav>
        </aside>
      </main>

      {step.showScreenshot !== false && (
        <dialog
          ref={imageDialogRef}
          className="image-modal"
          style={imageOpen ? undefined : { display: "none" }}
          aria-label="Увеличенный пример"
          onClose={finishImageDialog}
          onCancel={(event) => { event.preventDefault(); closeImageDialog(); }}
          onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); closeImageDialog(); } }}
        >
          <button ref={imageCloseRef} type="button" aria-label="Закрыть увеличенный пример" onClick={closeImageDialog}><DashboardIcon name="close" /><span>Закрыть</span></button>
          <img src={step.screenshot} alt={screenshotAlt} />
        </dialog>
      )}
      {reward && (
        <dialog
          ref={rewardDialogRef}
          className="reward-modal"
          aria-label="Новая награда"
          onClose={finishRewardDialog}
          onCancel={(event) => { event.preventDefault(); closeRewardDialog(); }}
          onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); closeRewardDialog(); } }}
        >
          <div><p>✦ · ✧ · ✦</p><span>Новая награда</span><h3>{reward}</h3><b>+10 искр в твою коллекцию</b><button ref={rewardCloseRef} type="button" className="primary-button" onClick={closeRewardDialog}>Забрать награду</button></div>
        </dialog>
      )}
    </>
  );
}
