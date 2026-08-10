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

export type QuestCustomizationAxis =
  | "audience"
  | "goal"
  | "name"
  | "style"
  | "tone"
  | "feature";

export type QuestColorPalette = {
  name: string;
  background: string;
  surface: string;
  accent: string;
  text: string;
};

export type QuestCustomization = Record<QuestCustomizationAxis, string> & {
  palette: QuestColorPalette;
};

export type QuestCustomizationAxisProfile = {
  label: string;
  hint: string;
  options: string[];
};

export type QuestCustomizationProfile = {
  slug: string;
  title: string;
  promise: string;
  axes: Record<QuestCustomizationAxis, QuestCustomizationAxisProfile>;
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
  guide?: QuestGuideFrame[];
};

export type QuestGuideScene = "finder" | "codex" | "academy" | "preview" | "publish" | "portfolio";

export type QuestGuideFrame = {
  id: number;
  title: string;
  app: string;
  action: string;
  exactText?: string;
  after: string;
  doneWhen: string;
  fallback: string;
  screenshot: string;
  scene: QuestGuideScene;
  target: string;
};
