import { findIncludeComponentCalls } from "./ComponentParser";
import { findSiteRoot, resolveComponentFile } from "./ComponentResolver";
import { resolveTemplateFile } from "./TemplateResolver";
import { ListDirectories, PathExists, ResolvedLink } from "./types";

/** Фасад для работы с компонентами */
export class ComponentService {
  constructor(
    private readonly pathExists: PathExists,
    private readonly listDirectories: ListDirectories
  ) {}

  /**
   * Находит кликабельные ссылки
   * @param text - содержимое документа
   * @param documentDir - директория документа
   * @param siteTemplate - настроенный шаблон сайта или null
   * @returns массив разрешенных ссылок
   */
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
          kind: "direct",
          start: call.component.start,
          end: call.component.end,
          targetPath: componentPath,
          tooltip: `Open ${call.component.namespace}:${call.component.name}`,
        });
      }

      const templateResolution = await resolveTemplateFile(
        call.template.namespace,
        call.template.name,
        call.template.templateName,
        siteRoot,
        siteTemplate,
        this.pathExists,
        this.listDirectories
      );
      const templateLabel = call.template.templateName || ".default";

      if (templateResolution.kind === "resolved") {
        links.push({
          kind: "direct",
          start: call.template.start,
          end: call.template.end,
          targetPath: templateResolution.path,
          tooltip: `Open template "${templateLabel}"`,
        });
      } else if (templateResolution.kind === "ambiguous") {
        links.push({
          kind: "ambiguous",
          start: call.template.start,
          end: call.template.end,
          tooltip: `Choose which site template to open for "${templateLabel}"`,
          candidates: templateResolution.candidates.map((candidate) => ({
            label: candidate.siteTemplateName,
            targetPath: candidate.path,
          })),
        });
      }
    }

    return links;
  }
}
