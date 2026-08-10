"use client";

import { useState } from "react";
import {
  customizationSummary,
  questColorPalettes,
} from "../content/customization";
import type {
  QuestColorPalette,
  QuestCustomization,
  QuestCustomizationAxis,
  QuestCustomizationProfile,
} from "../content/types";

const axes: QuestCustomizationAxis[] = [
  "audience",
  "goal",
  "name",
  "style",
  "tone",
  "feature",
];

const previewCopy: Record<string, { caption: string; metric: string; action: string }> = {
  "family-expenses": { caption: "Осталось до конца месяца", metric: "62 450 ₽", action: "+ Добавить расход" },
  planner: { caption: "Главное сегодня", metric: "1 важное дело", action: "+ Добавить дело" },
  "idea-vault": { caption: "В моей копилке", metric: "12 идей", action: "+ Сохранить мысль" },
  "child-schedule": { caption: "Сегодня", metric: "3 занятия", action: "+ Добавить занятие" },
};

function samePalette(left: QuestColorPalette, right: QuestColorPalette): boolean {
  return left.name === right.name && left.background === right.background && left.surface === right.surface && left.accent === right.accent && left.text === right.text;
}

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
  const [customAxis, setCustomAxis] = useState<QuestCustomizationAxis | null>(
    null,
  );
  const [saved, setSaved] = useState(false);

  function select(axis: QuestCustomizationAxis, value: string) {
    setSaved(false);
    setCustomAxis(null);
    onChange({ ...selection, [axis]: value });
  }

  function chooseCustom(axis: QuestCustomizationAxis) {
    setSaved(false);
    setCustomAxis(axis);
    if (profile.axes[axis].options.includes(selection[axis]))
      onChange({ ...selection, [axis]: "" });
  }

  function updateCustom(axis: QuestCustomizationAxis, value: string) {
    setSaved(false);
    setCustomAxis(axis);
    onChange({ ...selection, [axis]: value });
  }

  function selectPalette(palette: QuestColorPalette) {
    setSaved(false);
    onChange({ ...selection, palette: { ...palette } });
  }

  function chooseCustomPalette() {
    setSaved(false);
    onChange({ ...selection, palette: { ...selection.palette, name: "Моя гамма" } });
  }

  function updatePaletteColor(field: keyof Omit<QuestColorPalette, "name">, value: string) {
    setSaved(false);
    onChange({
      ...selection,
      palette: { ...selection.palette, name: "Моя гамма", [field]: value },
    });
  }

  function save() {
    const complete = { ...selection };
    for (const axis of axes) {
      if (!complete[axis].trim())
        complete[axis] = profile.axes[axis].options[0];
    }
    onChange(complete);
    onSave(complete);
    setCustomAxis(null);
    setSaved(true);
  }

  const customPalette = !questColorPalettes.some((palette) => samePalette(palette, selection.palette));
  const preview = previewCopy[profile.slug] ?? previewCopy["family-expenses"];

  return (
    <section
      className={`quest-customizer ${compact ? "compact" : ""}`}
      aria-label="Конструктор своего проекта"
    >
      <header>
        <span>✦</span>
        <div>
          <p>Мой проект — не копия</p>
          <h3>{profile.title}</h3>
          <small>{profile.promise}</small>
        </div>
      </header>

      <div className="customizer-axes">
        {axes.map((axis, index) => {
          const config = profile.axes[axis];
          const usesCustom =
            customAxis === axis ||
            (!config.options.includes(selection[axis]) &&
              Boolean(selection[axis]));
          return (
            <fieldset key={axis}>
              <legend>
                <i>{String(index + 1).padStart(2, "0")}</i>
                <span>
                  <b>{config.label}</b>
                  <small>{config.hint}</small>
                </span>
              </legend>
              <div className="customizer-options">
                {config.options.map((option) => (
                  <label
                    key={option}
                    className={selection[axis] === option ? "selected" : ""}
                  >
                    <input
                      type="radio"
                      name={`${profile.slug}-${axis}`}
                      checked={selection[axis] === option}
                      onChange={() => select(axis, option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
                <label className={usesCustom ? "selected custom" : "custom"}>
                  <input
                    type="radio"
                    name={`${profile.slug}-${axis}`}
                    checked={usesCustom}
                    onChange={() => chooseCustom(axis)}
                  />
                  <span>Свой вариант</span>
                </label>
              </div>
              {usesCustom && (
                <label className="customizer-input">
                  <span>Напишите своими словами</span>
                  <input
                    type="text"
                    value={selection[axis]}
                    onChange={(event) => updateCustom(axis, event.target.value)}
                    placeholder={`Например: ${config.options[0]}`}
                  />
                </label>
              )}
            </fieldset>
          );
        })}
      </div>

      <section className="customizer-palette" aria-label="Выбор цветовой гаммы">
        <header>
          <i>07</i>
          <div>
            <h4>Выберите цветовую гамму</h4>
            <p>Это будут цвета вашего проекта — не цвета SUBMARINE. Нажмите готовый вариант или соберите свой.</p>
          </div>
        </header>
        <div className="palette-options">
          {questColorPalettes.map((palette) => {
            const selected = samePalette(palette, selection.palette);
            return (
              <button
                type="button"
                key={palette.name}
                aria-pressed={selected}
                className={selected ? "selected" : ""}
                onClick={() => selectPalette(palette)}
              >
                <span className="palette-swatches" aria-hidden="true">
                  <i style={{ backgroundColor: palette.background }} />
                  <i style={{ backgroundColor: palette.surface }} />
                  <i style={{ backgroundColor: palette.accent }} />
                  <i style={{ backgroundColor: palette.text }} />
                </span>
                <b>{palette.name}</b>
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={customPalette}
            className={`palette-custom-button ${customPalette ? "selected" : ""}`}
            onClick={chooseCustomPalette}
          >
            <span aria-hidden="true">＋</span>
            <b>Собрать свою гамму</b>
          </button>
        </div>

        {customPalette && (
          <div className="palette-color-pickers">
            {([
              ["background", "Фон проекта"],
              ["surface", "Карточки"],
              ["accent", "Кнопки и акценты"],
              ["text", "Основной текст"],
            ] as const).map(([field, label]) => (
              <label key={field}>
                <input
                  type="color"
                  aria-label={label}
                  value={selection.palette[field]}
                  onChange={(event) => updatePaletteColor(field, event.target.value)}
                />
                <span><b>{label}</b><small>{selection.palette[field]}</small></span>
              </label>
            ))}
          </div>
        )}

        <div
          className="palette-live-preview"
          aria-label="Живой предпросмотр выбранной гаммы"
          style={{ backgroundColor: selection.palette.background, color: selection.palette.text }}
        >
          <div>
            <small>ЖИВОЙ ПРЕДПРОСМОТР</small>
            <span>{selection.palette.name}</span>
          </div>
          <article style={{ backgroundColor: selection.palette.surface }}>
            <p>{preview.caption}</p>
            <h4>{selection.name || profile.axes.name.options[0]}</h4>
            <strong>{preview.metric}</strong>
            <span style={{ backgroundColor: selection.palette.accent, color: selection.palette.surface }}>{preview.action}</span>
          </article>
          <small>Меняйте гамму — этот макет сразу покажет сочетание цветов.</small>
        </div>
      </section>

      <div className="customizer-summary" role="status" aria-live="polite">
        <small>ВАША ВЕРСИЯ</small>
        <p>{customizationSummary(profile.slug, selection)}</p>
        {saved && <b>Сохранено на этом устройстве ✓</b>}
      </div>
      <button type="button" className="customizer-save" onClick={save}>
        Сохранить мою версию
      </button>
    </section>
  );
}
