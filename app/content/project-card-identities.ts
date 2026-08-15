import type { CatalogProject } from "./types";

export type ProjectCardStickerShape =
  | "receipt"
  | "label"
  | "seal"
  | "ticket"
  | "bookmark"
  | "cloud";

export type ProjectCardIdentity = {
  label: string;
  glyph: string;
  accent: string;
  shape: ProjectCardStickerShape;
  tilt: number;
  corner: "left" | "right";
};

function identity(
  label: string,
  glyph: string,
  accent: string,
  shape: ProjectCardStickerShape,
  tilt: number,
  corner: ProjectCardIdentity["corner"],
): ProjectCardIdentity {
  return { label, glyph, accent, shape, tilt, corner };
}

const projectCardIdentities: Record<string, ProjectCardIdentity> = {
  "install-codex": identity("Рабочее место", "⌘", "#9f2f67", "ticket", -4, "left"),
  "server-152fz": identity("Сервер в России", "▣", "#375b7a", "label", 3, "right"),
  "api-keys": identity("API-ключ", "⌁", "#6c4d91", "bookmark", -3, "left"),
  "family-expenses": identity("Учёт расходов", "₽", "#8f512d", "receipt", -4, "left"),
  planner: identity("Планер недели", "□", "#426d5c", "label", 3, "right"),
  "idea-vault": identity("Копилка идей", "✦", "#7d3c56", "cloud", -3, "left"),
  "child-schedule": identity("Расписание ребёнка", "◷", "#4a5f91", "ticket", 4, "right"),
  "pressure-diary": identity("Дневник давления", "♥", "#805128", "seal", -3, "left"),
  "fitness-tracker": identity("Трекер активности", "↗", "#3f6b75", "bookmark", 3, "right"),
  "recipe-book": identity("База рецептов", "⌂", "#755387", "receipt", -4, "left"),
  "personal-organizer": identity("Личный органайзер", "◇", "#8a3f42", "label", 4, "right"),
  "home-helper": identity("Домашние дела", "⌁", "#466232", "cloud", -3, "left"),
  "family-health-hub": identity("Здоровье семьи", "+", "#2f6f75", "seal", 3, "right"),

  "day-planner-agent": identity("План дня", "✓", "#6d4a8f", "ticket", -4, "left"),
  "home-organizer-agent": identity("Домашний агент", "⌂", "#864b32", "bookmark", 3, "right"),
  "meal-planning-agent": identity("Меню и покупки", "○", "#3e687a", "receipt", -3, "left"),
  "study-agent": identity("Агент обучения", "↗", "#87375f", "label", 4, "right"),
  "idea-analysis-agent": identity("Разбор идей", "✦", "#445f87", "cloud", -4, "left"),
  "expense-agent": identity("Агент расходов", "₽", "#70488e", "seal", 3, "right"),
  "family-schedule-agent": identity("Семейный агент", "◷", "#92502f", "ticket", -3, "left"),
  "habit-agent": identity("Бережная привычка", "○", "#426c58", "bookmark", 4, "right"),

  "brief-agent": identity("Сбор брифа", "≡", "#803f64", "receipt", -4, "left"),
  "content-agent": identity("Контент-помощник", "✎", "#445a83", "label", 3, "right"),
  "expert-assistant-agent": identity("Помощник эксперта", "◇", "#714b90", "cloud", -3, "left"),
  "administrator-agent": identity("ИИ-администратор", "◷", "#935032", "seal", 4, "right"),
  "consultant-agent": identity("ИИ-консультант", "i", "#386c5d", "ticket", -4, "left"),
  "online-school-agent": identity("Агент онлайн-школы", "↗", "#7f3c61", "bookmark", 3, "right"),
  "event-organizer-agent": identity("Организатор событий", "◇", "#3e6084", "receipt", -3, "left"),
  "client-care-agent": identity("Работа с клиентами", "♡", "#684b8d", "label", 4, "right"),
  "fairy-team-agent": identity("Три ИИ-феи", "✦", "#934934", "cloud", -4, "left"),
  "carousel-agent": identity("Карусели", "▤", "#3d6b59", "ticket", 3, "right"),
  "threads-agent": identity("Threads-агент", "@", "#7e3c5d", "bookmark", -3, "left"),
  "webinar-moderator-agent": identity("Модератор вебинара", "●", "#405d81", "seal", 4, "right"),

  "unique-design": identity("Уникальный дизайн", "✣", "#694889", "cloud", -4, "left"),
  "expert-site": identity("Сайт эксперта", "⌘", "#8f4a31", "ticket", 3, "right"),
  "psychologist-site": identity("Сайт психолога", "♡", "#3d6959", "label", -3, "left"),
  "beauty-site": identity("Сайт бьюти-мастера", "✦", "#7e3d60", "seal", 4, "right"),
  "photographer-site": identity("Сайт фотографа", "◉", "#3f5c81", "bookmark", -4, "left"),
  "designer-site": identity("Сайт дизайнера", "□", "#6c4a8a", "receipt", 3, "right"),
  "consultation-site": identity("Сайт консультации", "i", "#934b30", "cloud", -3, "left"),
  "course-site": identity("Сайт курса", "↗", "#3f6a57", "ticket", 4, "right"),
  "event-site": identity("Сайт мероприятия", "◷", "#7d3c5e", "label", -4, "left"),
  "small-shop-site": identity("Витрина магазина", "◇", "#405e82", "seal", 3, "right"),
  "portfolio-site": identity("Личное портфолио", "✦", "#6b4a8c", "bookmark", -3, "left"),

  "expert-pro-site": identity("Продвинутый эксперт", "✦", "#8f4c31", "receipt", 4, "right"),
  "school-pro-site": identity("Школа с тарифами", "↗", "#3c6b58", "cloud", -4, "left"),
  "service-pro-site": identity("Сайт с калькулятором", "=", "#7f3d60", "ticket", 3, "right"),
  "catalog-pro-site": identity("Каталог с корзиной", "▦", "#3f5e80", "label", -3, "left"),
  "graduate-portfolio": identity("Портфолио выпускницы", "✦", "#69498b", "seal", 4, "right"),

  planning: identity("Планер или агент", "✓", "#8d4a32", "bookmark", -4, "left"),
  ideas: identity("Идеи или агент", "✦", "#3e6c59", "receipt", 3, "right"),
  "family-budget": identity("Бюджет или агент", "₽", "#7f3c60", "cloud", -3, "left"),
  recipes: identity("Рецепты или агент", "⌂", "#3e5e83", "ticket", 4, "right"),
  "family-schedule": identity("Расписание или агент", "◷", "#6d4a8d", "label", -4, "left"),
  habits: identity("Трекер или агент", "○", "#914c31", "seal", 3, "right"),
  household: identity("Дом или агент", "⌁", "#3d6a58", "bookmark", -3, "left"),
};

const fallbackIdentity: ProjectCardIdentity = identity(
  "Готовый проект",
  "✦",
  "#7d3c60",
  "label",
  -3,
  "left",
);

export const projectCardIdentitySlugs = Object.keys(projectCardIdentities);

export function getProjectCardIdentityBySlug(slug: string): ProjectCardIdentity {
  return projectCardIdentities[slug] ?? fallbackIdentity;
}

export function getProjectCardIdentity(project: CatalogProject): ProjectCardIdentity {
  return projectCardIdentities[project.slug] ?? {
    ...fallbackIdentity,
    label: project.title.split(/\s+/).slice(0, 3).join(" "),
    glyph: project.symbol,
  };
}
