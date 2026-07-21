import { findIncludeComponentCalls } from "./ComponentParser";
import { findSiteRoot, resolveComponentFile } from "./ComponentResolver";
import { resolveTemplateFile } from "./TemplateResolver";
import { ListDirectories, PathExists, ResolvedLink } from "./types";

/**
 * Facade over the component/template parser and resolvers. This is the
 * only entry point the VS Code adapter layer is allowed to talk to.
 */
export class ComponentService {
  constructor(
    private readonly pathExists: PathExists,
    private readonly listDirectories: ListDirectories
  ) {}

  async findLinks(
    text: string,
    documentDir: string,
    siteTemplate: string | null
  ): Promise<ResolvedLink[]> {
    const siteRoot = await findSiteRoot(documentDir, this.pathExists);
    if (!siteRoot) {
      return [];
    }

    const calls = findIncludeComponentCalls(text);
    const links: ResolvedLink[] = [];

    for (const call of calls) {
      const componentPath = await resolveComponentFile(
        call.component.namespace,
        call.component.name,
        siteRoot,
        this.pathExists
      );
      if (componentPath) {
        links.push({
          start: call.component.start,
          end: call.component.end,
          targetPath: componentPath,
          tooltip: `Open ${call.component.namespace}:${call.component.name}`,
        });
      }

      const templatePath = await resolveTemplateFile(
        call.template.namespace,
        call.template.name,
        call.template.templateName,
        siteRoot,
        siteTemplate,
        this.pathExists,
        this.listDirectories
      );
      if (templatePath) {
        links.push({
          start: call.template.start,
          end: call.template.end,
          targetPath: templatePath,
          tooltip: `Open template "${call.template.templateName || ".default"}"`,
        });
      }
    }

    return links;
  }
}
