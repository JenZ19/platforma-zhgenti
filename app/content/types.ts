export type ProjectKind =
  | "service"
  | "bot"
  | "agent"
  | "simple-site"
  | "advanced-site"
  | "portfolio";

export type ProjectDefinition = {
  slug: string;
  title: string;
  week: 1 | 2 | 3 | 4 | 5 | 6;
  kind: ProjectKind;
  track: string;
  symbol: string;
  audience: string;
  outcome: string;
  device: "телефон" | "телефон или ноутбук" | "лучше ноутбук";
  entities: string[];
  features: string[];
  demo: string[];
  safety: string;
  portfolioAngle: string;
};

export type QuestStep = {
  id: number;
  title: string;
  eyebrow: string;
  why: string;
  action: string;
  kind: "action" | "prompt";
  prompt?: string;
  expected: string[];
  screenshot: string;
  reward?: string;
  help: { title: string; body: string; prompt: string };
};

