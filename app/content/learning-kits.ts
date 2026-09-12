const kitSlugs = new Set(["carousel-agent", "threads-agent", "webinar-moderator-agent", "family-health-hub"]);
export function learningKitHref(slug: string): string | undefined {
  return kitSlugs.has(slug) ? `/materials/learning-kits/${slug}-2026-09-08.1.zip` : undefined;
}
