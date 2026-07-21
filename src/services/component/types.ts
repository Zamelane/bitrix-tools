import { ComponentReference } from "../../core/types/component";

export type PathExists = (candidatePath: string) => Promise<boolean>;

export interface ResolvedComponentLink {
  reference: ComponentReference;
  targetPath: string;
}
