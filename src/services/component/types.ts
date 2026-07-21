export type PathExists = (candidatePath: string) => Promise<boolean>;

export type ListDirectories = (dirPath: string) => Promise<string[]>;

export interface TemplateCandidate {
  siteTemplateName: string;
  path: string;
}

export type TemplateResolution =
  | { kind: "resolved"; path: string }
  | { kind: "ambiguous"; candidates: TemplateCandidate[] }
  | { kind: "none" };

export interface DirectLink {
  kind: "direct";
  start: number;
  end: number;
  targetPath: string;
  tooltip: string;
}

export interface AmbiguousLink {
  kind: "ambiguous";
  start: number;
  end: number;
  tooltip: string;
  candidates: { label: string; targetPath: string }[];
}

export type ResolvedLink = DirectLink | AmbiguousLink;
