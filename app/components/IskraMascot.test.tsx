import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { FairyAssistant } from "./FairyAssistant";
import { readFileSync } from "node:fs";

it("keeps Iskra gently moving in navigation and help, and honors reduced motion", () => {
  const css = readFileSync("app/pink-learning-dashboard.css", "utf8");
  expect(css).toContain("@keyframes iskra-idle");
  expect(css).toContain("@keyframes iskra-wave");
  expect(css).toMatch(/\.learning-shell \.iskra-mascot\s*\{[^}]*animation: iskra-idle 4\.8s ease-in-out infinite;/);
  expect(css).toContain("iskra-idle 4.8s ease-in-out 900ms infinite");
  expect(css).toMatch(/button:active > \.iskra-mascot\s*\{[^}]*transform: scale\(0\.9, 0\.94\)/);
  expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.iskra-mascot[\s\S]*?animation: none !important/);
});

it("shows Iskra and respects an unavailable AI connection", async () => {
  const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({available:false,messages:[]}), {headers:{'Content-Type':'application/json'}}));
  try {
  const { container } = render(<FairyAssistant scope="academy" mode="full" />);
  expect(container.querySelector(".iskra-mascot")).toHaveAttribute("src", "/covers/iskra-mascot-64.webp");
  expect(await screen.findByText(/Искра пока недоступна/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Спросить Искру" })).toBeDisabled();
  expect(screen.getByRole("textbox", { name: "Ваш вопрос" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Сохранить вопрос" })).toBeDisabled();
  expect(screen.queryByText(/Опишите, на каком экране остановились/)).not.toBeInTheDocument();
  } finally { fetcher.mockRestore(); }
});
