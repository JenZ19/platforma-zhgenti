"use client";
import { useAccountSync } from "../lib/progress-sync";

export function QuestSaveStatus({ state }: { state: "idle" | "saved" | "error" }) {
  const account = useAccountSync();
  const where = account ? "в аккаунте" : "в этом браузере";
  return <p className="quest-save-status" role={state === "error" ? "alert" : "status"}>
    {state === "error"
      ? "Не удалось сохранить изменения в браузере. Не закрывайте страницу. Попробуйте ещё раз; если ошибка повторяется, обратитесь к куратору."
      : state === "saved"
        ? account ? "Сохранено в аккаунте — продолжите на любом устройстве" : "Сохранено в этом браузере"
        : `Настройки сохраняются автоматически. Выполненный шаг — после «Я сделала — продолжить». Сохранение действует ${where}.`}
  </p>;
}
