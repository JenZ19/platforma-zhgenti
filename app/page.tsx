import type { Metadata } from "next";
import { AppEntry } from "./components/AppEntry";

export const metadata: Metadata = {
  title: "Академия квестов — ИИ-агенты и ИИ-сайты",
  description: "38 разных проектов курса SUBMARINE: готовые команды, короткие уровни и понятный результат на каждом шаге.",
};

export default function Home() {
  return <AppEntry />;
}
