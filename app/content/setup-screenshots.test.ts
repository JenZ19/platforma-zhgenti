import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { buildSetupQuest } from "./setup-quests";
import { getProject } from "./projects";

/**
 * Живьём сняты три кадра: официальная страница загрузки (шаг 1, общая для обеих систем),
 * установщик на Mac (шаг 2) и открытая страница результата на Mac (шаг 6). Остальные —
 * макеты интерфейса. Метка «real» включает подпись «Сверь свой экран с примером»,
 * поэтому ставить её макету нельзя.
 */
const captured = new Set(["mac:1", "win:1", "mac:2", "mac:6"]);

describe("экраны квеста установки", () => {
  const project = getProject("install-codex")!;

  for (const platform of ["mac", "windows"] as const) {
    it(`${platform}: настоящим экраном помечены только снятые кадры`, () => {
      for (const step of buildSetupQuest(project, platform)) {
        if (step.showScreenshot === false) continue;
        const expected = captured.has(`${platform === "mac" ? "mac" : "win"}:${step.id}`) ? "real" : "generated";
        expect(step.screenshotKind, `шаг ${step.id}`).toBe(expected);
      }
    });

    it(`${platform}: у каждого шага есть свой кадр и он лежит в public`, () => {
      for (const step of buildSetupQuest(project, platform)) {
        if (step.showScreenshot === false) continue;
        expect(step.screenshot, `шаг ${step.id}`).toBeTruthy();
        expect(existsSync(resolve(process.cwd(), "public" + step.screenshot)), step.screenshot).toBe(true);
      }
    });
  }

  it("заглушек в квесте установки больше не осталось", () => {
    for (const platform of ["mac", "windows"] as const) {
      for (const step of buildSetupQuest(project, platform)) {
        expect(step.screenshotKind, `${platform} шаг ${step.id}`).not.toBe("placeholder");
        expect(step.showScreenshot, `${platform} шаг ${step.id}`).not.toBe(false);
      }
    }
  });
});
