import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { FairyAssistant } from "./FairyAssistant";

it("shows Iskra without claiming that AI answers are connected", () => {
  const { container } = render(<FairyAssistant scope="academy" mode="full" />);
  expect(container.querySelector(".iskra-mascot")).toHaveAttribute("src", "/covers/iskra-mascot-transparent.png");
  expect(screen.getByText(/ИИ-ответы ещё не подключены/)).toBeVisible();
  expect(screen.getByRole("textbox", { name: "Ваш вопрос" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Сохранить вопрос" })).toBeDisabled();
  expect(screen.queryByText(/Опишите, на каком экране остановились/)).not.toBeInTheDocument();
});
