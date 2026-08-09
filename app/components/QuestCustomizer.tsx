"use client";

import { useState } from "react";
import { customizationSummary } from "../content/customization";
import type {
  QuestCustomization,
  QuestCustomizationAxis,
  QuestCustomizationProfile,
} from "../content/types";

const axes: QuestCustomizationAxis[] = ["audience", "goal", "name", "style", "tone", "feature"];

export function QuestCustomizer({
  profile,
  selection,
  onChange,
  onSave,
  compact = false,
}: {
  profile: QuestCustomizationProfile;
  selection: QuestCustomization;
  onChange: (next: QuestCustomization) => void;
  onSave: (next: QuestCustomization) => void;
  compact?: boolean;
}) {
  const [customAxis, setCustomAxis] = useState<QuestCustomizationAxis | null>(null);
  const [saved, setSaved] = useState(false);

  function select(axis: QuestCustomizationAxis, value: string) {
    setSaved(false);
    setCustomAxis(null);
    onChange({ ...selection, [axis]: value });
  }

  function chooseCustom(axis: QuestCustomizationAxis) {
    setSaved(false);
    setCustomAxis(axis);
    if (profile.axes[axis].options.includes(selection[axis])) onChange({ ...selection, [axis]: "" });
  }

  function updateCustom(axis: QuestCustomizationAxis, value: string) {
    setSaved(false);
    setCustomAxis(axis);
    onChange({ ...selection, [axis]: value });
  }

  function save() {
    const complete = { ...selection };
    for (const axis of axes) {
      if (!complete[axis].trim()) complete[axis] = profile.axes[axis].options[0];
    }
    onChange(complete);
    onSave(complete);
    setCustomAxis(null);
    setSaved(true);
  }

  return (
    <section className={`quest-customizer ${compact ? "compact" : ""}`} aria-label="Конструктор своего проекта">
      <header>
        <span>✦</span>
        <div><p>Мой проект — не копия</p><h3>{profile.title}</h3><small>{profile.promise}</small></div>
      </header>

      <div className="customizer-axes">
        {axes.map((axis, index) => {
          const config = profile.axes[axis];
          const usesCustom = customAxis === axis || (!config.options.includes(selection[axis]) && Boolean(selection[axis]));
          return (
            <fieldset key={axis}>
              <legend><i>{String(index + 1).padStart(2, "0")}</i><span><b>{config.label}</b><small>{config.hint}</small></span></legend>
              <div className="customizer-options">
                {config.options.map((option) => <label key={option} className={selection[axis] === option ? "selected" : ""}><input type="radio" name={`${profile.slug}-${axis}`} checked={selection[axis] === option} onChange={() => select(axis, option)} /><span>{option}</span></label>)}
                <label className={usesCustom ? "selected custom" : "custom"}><input type="radio" name={`${profile.slug}-${axis}`} checked={usesCustom} onChange={() => chooseCustom(axis)} /><span>Свой вариант</span></label>
              </div>
              {usesCustom && <label className="customizer-input"><span>Напишите своими словами</span><input type="text" value={selection[axis]} onChange={(event) => updateCustom(axis, event.target.value)} placeholder={`Например: ${config.options[0]}`} autoFocus /></label>}
            </fieldset>
          );
        })}
      </div>

      <div className="customizer-summary" role="status" aria-live="polite"><small>ВАША ВЕРСИЯ</small><p>{customizationSummary(profile.slug, selection)}</p>{saved && <b>Сохранено на этом устройстве ✓</b>}</div>
      <button type="button" className="customizer-save" onClick={save}>Сохранить мою версию</button>
    </section>
  );
}
