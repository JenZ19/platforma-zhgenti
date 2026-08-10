import { describe, expect, it } from "vitest";
import { customizationKey } from "./customization";
import {
  branchStorageSlug,
  loadOutputChoice,
  outputChoiceKey,
  parseOutputChoice,
  resetBundleState,
  saveOutputChoice,
} from "./output-format";
import { preparationKey } from "./preparation";
import { progressKey } from "./progress";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe("bundled project output format", () => {
  it("builds isolated desktop and mobile keys and parses safely", () => {
    expect(outputChoiceKey("planning", "desktop")).toBe("feya-academy-output-v1:planning");
    expect(outputChoiceKey("planning", "mobile")).toBe("feya-academy-output-v1:mobile:planning");
    expect(branchStorageSlug("planning", "service", "desktop")).toBe("planning:service");
    expect(branchStorageSlug("planning", "agent", "desktop")).toBe("planning:agent");
    expect(branchStorageSlug("planning", "service", "mobile")).toBe("mobile:planning:service");
    expect(parseOutputChoice('"service"')).toBe("service");
    expect(parseOutputChoice('"broken"')).toBeUndefined();
    expect(parseOutputChoice("bad json")).toBeUndefined();
  });

  it("stores a choice independently by device", () => {
    const storage = new MemoryStorage();
    saveOutputChoice("planning", "desktop", "service", storage);
    saveOutputChoice("planning", "mobile", "agent", storage);
    expect(loadOutputChoice("planning", "desktop", storage)).toBe("service");
    expect(loadOutputChoice("planning", "mobile", storage)).toBe("agent");
  });

  it("resets both branches only for the current bundled project and device", () => {
    const storage = new MemoryStorage();
    const desktopBranches = ["planning:service", "planning:agent"];
    const mobileBranches = ["mobile:planning:service", "mobile:planning:agent"];

    saveOutputChoice("planning", "desktop", "agent", storage);
    for (const slug of [...desktopBranches, ...mobileBranches, "ideas:service"]) {
      storage.setItem(progressKey(slug), "progress");
      storage.setItem(preparationKey(slug), "preparation");
      storage.setItem(customizationKey(slug), "customization");
    }

    resetBundleState("planning", "desktop", storage);

    expect(storage.getItem(outputChoiceKey("planning", "desktop"))).toBeNull();
    for (const slug of desktopBranches) {
      expect(storage.getItem(progressKey(slug))).toBeNull();
      expect(storage.getItem(preparationKey(slug))).toBeNull();
      expect(storage.getItem(customizationKey(slug))).toBeNull();
    }
    for (const slug of [...mobileBranches, "ideas:service"]) {
      expect(storage.getItem(progressKey(slug))).not.toBeNull();
      expect(storage.getItem(preparationKey(slug))).not.toBeNull();
      expect(storage.getItem(customizationKey(slug))).not.toBeNull();
    }
  });
});
