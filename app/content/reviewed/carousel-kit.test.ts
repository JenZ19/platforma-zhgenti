import { describe, expect, it } from "vitest";
import { carouselKitLesson } from "./carousel-kit";

describe("carousel kit lesson overrides", () => {
  it("covers only source-backed milestones 5 through 15", () => {
    expect(carouselKitLesson(4)).toBeUndefined();
    expect(carouselKitLesson(16)).toBeUndefined();
    for (let id = 5; id <= 15; id += 1) {
      const lesson = carouselKitLesson(id);
      expect(lesson?.title).toBeTruthy();
      expect(lesson?.why).toBeTruthy();
      expect(lesson?.action).toBeTruthy();
      expect(lesson?.request).toBeTruthy();
      expect(lesson?.expected?.length).toBeGreaterThan(1);
    }
  });

  it("uses the real style and slide counts", () => {
    const text = JSON.stringify(Array.from({ length: 11 }, (_, index) => carouselKitLesson(index + 5)));
    expect(text).toMatch(/10 направлен/);
    expect(text).toMatch(/5–11 PNG/);
    expect(text).toMatch(/4 PNG/);
    expect(text).not.toMatch(/11 арт-направлен/);
    expect(text).not.toMatch(/4–10 PNG/);
  });

  it("does not promise absent UI or unsafe paid behavior", () => {
    const text = JSON.stringify(Array.from({ length: 11 }, (_, index) => carouselKitLesson(index + 5)));
    expect(text).not.toMatch(/три варианта от ИИ|миниатюры слайдов|подтвердите палитру|предпросмотр до отрисовки/iu);
    expect(text).toMatch(/кнопка Qwen запускает расход/);
    expect(text).toMatch(/обычн.*в[её]рстк/iu);
    expect(text).toMatch(/ALLOWED_USER_IDS|ALLOWED_CHAT_IDS/);
  });

  it("requires evidence-based source text comparison", () => {
    const lesson = carouselKitLesson(6)!;
    expect(JSON.stringify(lesson)).toMatch(/сравн|свер/iu);
    expect(JSON.stringify(lesson)).not.toMatch(/гарантир/iu);
  });
});
