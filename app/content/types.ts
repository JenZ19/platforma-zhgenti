export type ProjectKind =
  | "service"
  | "agent"
  | "simple-site"
  | "advanced-site"
  | "portfolio";

export type ProjectFormat = "service" | "agent";
export type ProjectWeek = 1 | 2 | 3 | 4 | 5 | 6;

export type ProjectDefinition = {
  slug: string;
  title: string;
  week: ProjectWeek;
  kind: ProjectKind;
  track: string;
  symbol: string;
  audience: string;
  outcome: string;
  device: "телефон" | "телефон или ноутбук" | "лучше ноутбук" | "компьютер";
  journey?: "project" | "setup";
  entities: string[];
  features: string[];
  demo: string[];
  safety: string;
  portfolioAngle: string;
};

export type ProjectBundleDefinition = {
  slug: string;
  title: string;
  weeks: readonly [1, 2];
  track: "Сервис или ИИ-агент";
  symbol: string;
  outcome: string;
  device: "телефон или ноутбук";
  formats: Record<ProjectFormat, ProjectDefinition>;
};

export type CatalogProject = ProjectDefinition | ProjectBundleDefinition;

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
  preview: { caption: string; metric: string; action: string };
  axes: Record<QuestCustomizationAxis, QuestCustomizationAxisProfile>;
};

export type AgentContract = {
  slug: string;
  theme: string;
  role: string;
  inputExample: string;
  voiceExample: string;
  requiredFields: string[];
  firstQuestion: string;
  answerExample: string;
  decisionRule: string;
  resultTitle: string;
  resultItems: string[];
  selfCheck: string[];
  confirmationRule: string;
  handoff: string;
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
  links?: QuestLink[];
};

export type QuestLink = {
  label: string;
  href: string;
  note?: string;
  external?: boolean;
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
