import type { Metadata } from "next";
import "./globals.css";

/* eslint-disable @next/next/no-page-custom-font -- app-router layout owns the course font links */

export const metadata: Metadata = {
  title: "Академия квестов SUBMARINE",
  description: "Все проекты курса «ИИ-агенты и ИИ-сайты» в формате пошаговых квестов.",
  openGraph: {
    title: "42 проекта. Одна новая профессия.",
    description: "Выберите сервис или ИИ-агента, пройдите 17 шагов и добавьте готовую работу в портфолио.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Академия квестов SUBMARINE",
    description: "42 проекта курса — шаг за шагом.",
    images: ["/og.png"],
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><head><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" /></head><body>{children}</body></html>;
}
