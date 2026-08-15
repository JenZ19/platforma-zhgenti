import type { Metadata } from "next";
import "./globals.css";
import "./pink-learning-dashboard.css";

export const metadata: Metadata = {
  title: "Академия квестов SUBMARINE",
  description: "Все проекты курса «ИИ-агенты и ИИ-сайты» в формате пошаговых квестов.",
  openGraph: {
    title: "42 проекта. Одна новая профессия.",
    description: "Выберите сервис или ИИ-агента, пройдите полный путь проекта и добавьте готовую работу в портфолио.",
    images: ["/og-45-projects.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Академия квестов SUBMARINE",
    description: "42 проекта курса — шаг за шагом.",
    images: ["/og-45-projects.png"],
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
