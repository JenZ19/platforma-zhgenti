import { expect, it } from "vitest";
import { questProjects, getProject, isProjectBundle, resolveProjectVariant } from "../projects";
import { resolvePublicProjectRoute } from "../project-routes";

it.each(questProjects.map(p=>p.slug))("keeps the direct learning link for %s",slug=>{
  const route=resolvePublicProjectRoute(slug);
  expect(route,slug).toBeDefined();
  const catalog=getProject(route!.slug)!;
  const resolved=isProjectBundle(catalog) ? resolveProjectVariant(catalog,route!.output!) : catalog;
  expect(resolved.slug).toBe(slug);
});
