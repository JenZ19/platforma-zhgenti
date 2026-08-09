export type ProjectPreparationProfile = {
  folderName: string;
  sourceFile: string;
  sourceTitle: string;
  sourceWhy: string;
  sourceFields: string[];
  sourceExample: string;
  rulesFile: string;
  rulesTitle: string;
  rulesWhy: string;
  rules: string[];
  presentationFile: string;
  presentationTitle: string;
  presentationWhy: string;
  presentation: string[];
  sharingFile: string;
  sharingTitle: string;
  sharingWhy: string;
  sharing: string[];
  safetyChecks: string[];
};

export type PreparationProfileMap = Record<string, ProjectPreparationProfile>;

