import type { Metadata } from "next";
import "./globals.css";
import "./pink-learning-dashboard.css";

export const metadata: Metadata = {
  title: "Академия квестов НЕЙРОПРОФИ",
  description: "Шесть недель практики: полезный сервис, ИИ-агенты, сайт и собственное портфолио. Один выбранный результат за раз.",
  openGraph: {
    title: "НЕЙРОПРОФИ — от первого проекта к портфолио",
    description: "Основной маршрут на шесть недель и библиотека дополнительных проектов по выбору.",
    images: ["/og-neiroprofi.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Академия квестов НЕЙРОПРОФИ",
    description: "Сервисы, ИИ-агенты и сайты — один результат за раз.",
    images: ["/og-neiroprofi.png"],
  },
  icons: { icon: "/favicon-neiroprofi.svg", shortcut: "/favicon-neiroprofi.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
