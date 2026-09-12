import { DashboardIcon } from "./DashboardIcon";

export function QuestResetButton({ onReset, mobile = false }: { onReset: () => void; mobile?: boolean }) {
  return (
    <button
      type="button"
      className={`quest-reset-control${mobile ? " mobile" : ""}`}
      aria-label="Сбросить проект и начать с нуля"
      onClick={onReset}
    >
      <span aria-hidden="true"><DashboardIcon name="reset" /></span>
      <span>
        <b>Начать квест заново</b>
        <small>Удалятся только прогресс и настройки этого проекта</small>
      </span>
    </button>
  );
}
