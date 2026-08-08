import type { Metadata } from "next";
import { AppEntry } from "./components/AppEntry";

export const metadata: Metadata = {
  title: "Академия квестов — ИИ-агенты и ИИ-сайты",
  description: "52 проекта курса SUBMARINE: готовые команды, 17 коротких уровней и понятный результат на каждом шаге.",
};

export default function Home() {
  return <AppEntry />;
}

