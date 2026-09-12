import type { Metadata } from "next";
import { AppEntry } from "./components/AppEntry";
import { libraryProjectCount } from "./content/projects";

export const metadata: Metadata = {
  title: "НЕЙРОПРОФИ — ИИ-агенты и ИИ-сайты",
  description: `${libraryProjectCount} разных проектов курса НЕЙРОПРОФИ: готовые команды, короткие уровни и понятный результат на каждом шаге.`,
};

type PageSearchParams = Record<string, string | string[] | undefined>;

function serializeSearchParams(values: PageSearchParams): string {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    else if (value !== undefined) query.set(key, value);
  });
  const search = query.toString();
  return search ? `?${search}` : "";
}

export default async function Home({ searchParams }: { searchParams: Promise<PageSearchParams> }) {
  return <AppEntry initialSearch={serializeSearchParams(await searchParams)} />;
}
