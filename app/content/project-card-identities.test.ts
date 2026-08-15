import { describe, expect, it } from "vitest";
import { projectBundleSeeds } from "./project-bundles";
import { captureProjectSlugs } from "./projects";
import {
  getProjectCardIdentityBySlug,
  projectCardIdentitySlugs,
} from "./project-card-identities";

const expectedSlugs = [...captureProjectSlugs, ...projectBundleSeeds.map((bundle) => bundle.slug)];

describe("project card identities", () => {
  it("covers every concrete project and every combined card", () => {
    expect(projectCardIdentitySlugs).toHaveLength(expectedSlugs.length);
    expect(new Set(projectCardIdentitySlugs)).toEqual(new Set(expectedSlugs));
  });

  it("keeps every sticker combination individual and short", () => {
    const identities = expectedSlugs.map((slug) => getProjectCardIdentityBySlug(slug));
    const combinations = identities.map((identity) => [
      identity.label,
      identity.glyph,
      identity.accent,
      identity.shape,
      identity.corner,
    ].join("|"));

    expect(new Set(combinations)).toHaveLength(combinations.length);
    for (const identity of identities) {
      expect(identity.label.trim().split(/\s+/).length).toBeLessThanOrEqual(3);
      expect(identity.label.trim().split(/\s+/).length).toBeGreaterThanOrEqual(1);
      expect(identity.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(identity.tilt).toBeGreaterThanOrEqual(-6);
      expect(identity.tilt).toBeLessThanOrEqual(6);
    }
  });

  it("uses subject-specific labels for representative projects", () => {
    expect(getProjectCardIdentityBySlug("family-expenses")).toMatchObject({ label: "Учёт расходов", glyph: "₽" });
    expect(getProjectCardIdentityBySlug("carousel-agent")).toMatchObject({ label: "Карусели", glyph: "▤" });
    expect(getProjectCardIdentityBySlug("webinar-moderator-agent")).toMatchObject({ label: "Модератор вебинара", glyph: "●" });
    expect(getProjectCardIdentityBySlug("expert-site")).toMatchObject({ label: "Сайт эксперта", glyph: "⌘" });
  });
});
