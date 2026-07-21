export type PathExists = (candidatePath: string) => Promise<boolean>;

export type ListDirectories = (dirPath: string) => Promise<string[]>;

export interface ResolvedLink {
  start: number;
  end: number;
  targetPath: string;
  tooltip: string;
}
