import { findComponentReferences } from "./ComponentParser";
import { findSiteRoot, resolveComponentFile } from "./ComponentResolver";
import { PathExists, ResolvedComponentLink } from "./types";

/**
 * Facade over the component parser and resolver. This is the only
 * entry point the VS Code adapter layer is allowed to talk to.
 */
export class ComponentService {
  constructor(private readonly pathExists: PathExists) {}

  async findComponentLinks(
    text: string,
    documentDir: string
  ): Promise<ResolvedComponentLink[]> {
    const siteRoot = await findSiteRoot(documentDir, this.pathExists);
    if (!siteRoot) {
      return [];
    }

    const references = findComponentReferences(text);
    const links: ResolvedComponentLink[] = [];

    for (const reference of references) {
      const targetPath = await resolveComponentFile(
        reference.namespace,
        reference.name,
        siteRoot,
        this.pathExists
      );
      if (targetPath) {
        links.push({ reference, targetPath });
      }
    }

    return links;
  }
}
