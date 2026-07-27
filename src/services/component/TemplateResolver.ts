import * as path from "node:path";
import {
  ListDirectories,
  PathExists,
  TemplateCandidate,
  TemplateResolution,
} from "./types";

// Empty template name means use .default folder.
const DEFAULT_TEMPLATE_FOLDER = ".default";

// local/ overrides bitrix/ entirely. Ambiguity only within one tier.
const TEMPLATE_ROOTS = ["local", "bitrix"] as const;

/**
 * Преобразует пустое имя шаблона в .default.
 * @param templateName - имя шаблона
 * @returns эффективное имя папки шаблона
 */
function effectiveTemplateFolder(templateName: string): string {
  return templateName === "" ? DEFAULT_TEMPLATE_FOLDER : templateName;
}

/**
 * Проверяет сегмент на отсутствие path-traversal.
 * @param segment - сегмент пути
 * @returns true если безопасен
 */
function isSafeTemplateFolder(segment: string): boolean {
  return (
    segment !== "." &&
    segment !== ".." &&
    !segment.includes("/") &&
    !segment.includes("\\")
  );
}

/**
 * Поиск через шаблоны сайта.
 * @param siteRoot - корень сайта
 * @param namespace - пространство имен компонента
 * @param name - имя компонента
 * @param templateFolder - папка шаблона
 * @param siteTemplate - настроенный шаблон или null
 * @param exists - функция проверки существования
 * @param listDirectories - функция списка директорий
 * @returns результат разрешения
 */
async function findViaSiteTemplates(
  siteRoot: string,
  namespace: string,
  name: string,
  templateFolder: string,
  siteTemplate: string | null,
  exists: PathExists,
  listDirectories: ListDirectories
): Promise<TemplateResolution> {
  for (const templateRoot of TEMPLATE_ROOTS) {
    const templatesDir = path.join(siteRoot, templateRoot, "templates");
    const siteTemplateNames =
      siteTemplate && isSafeTemplateFolder(siteTemplate)
        ? [siteTemplate]
        : [...(await listDirectories(templatesDir))].sort();

    const matches: TemplateCandidate[] = [];
    for (const siteTemplateName of siteTemplateNames) {
      const candidatePath = path.join(
        templatesDir,
        siteTemplateName,
        "components",
        namespace,
        name,
        templateFolder
      );
      if (await exists(candidatePath)) {
        matches.push({ siteTemplateName, path: candidatePath });
      }
    }

    if (matches.length === 1) {
      return { kind: "resolved", path: matches[0]!.path };
    }
    if (matches.length > 1) {
      return { kind: "ambiguous", candidates: matches };
    }
    // Zero matches at this tier: fall through to the next templateRoot.
  }

  return { kind: "none" };
}

/**
 * Поиск через встроенные шаблоны компонента.
 * @param siteRoot - корень сайта
 * @param namespace - пространство имен компонента
 * @param name - имя компонента
 * @param templateFolder - папка шаблона
 * @param exists - функция проверки существования
 * @returns путь к шаблону или null
 */
async function findViaBundledTemplates(
  siteRoot: string,
  namespace: string,
  name: string,
  templateFolder: string,
  exists: PathExists
): Promise<string | null> {
  for (const componentRoot of TEMPLATE_ROOTS) {
    const candidate = path.join(
      siteRoot,
      componentRoot,
      "components",
      namespace,
      name,
      "templates",
      templateFolder
    );
    if (await exists(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Возвращает template.php если есть, иначе директорию.
 * @param dir - директория шаблона
 * @param exists - функция проверки существования
 * @returns путь к файлу или директории
 */
async function toEntryFile(dir: string, exists: PathExists): Promise<string> {
  const entryFile = path.join(dir, "template.php");
  return (await exists(entryFile)) ? entryFile : dir;
}

/**
 * Разрешает директорию шаблона
 * @param namespace - пространство имен компонента
 * @param name - имя компонента
 * @param templateName - имя шаблона
 * @param siteRoot - корень сайта
 * @param siteTemplate - настроенный шаблон или null
 * @param exists - функция проверки существования
 * @param listDirectories - функция списка директорий
 * @returns результат разрешения
 */
export async function resolveTemplateDir(
  namespace: string,
  name: string,
  templateName: string,
  siteRoot: string,
  siteTemplate: string | null,
  exists: PathExists,
  listDirectories: ListDirectories
): Promise<TemplateResolution> {
  const templateFolder = effectiveTemplateFolder(templateName);
  if (
    !isSafeTemplateFolder(namespace) ||
    !isSafeTemplateFolder(name) ||
    !isSafeTemplateFolder(templateFolder)
  ) {
    return { kind: "none" };
  }

  const viaSiteTemplate = await findViaSiteTemplates(
    siteRoot,
    namespace,
    name,
    templateFolder,
    siteTemplate,
    exists,
    listDirectories
  );
  if (viaSiteTemplate.kind !== "none") {
    return viaSiteTemplate;
  }

  const bundledPath = await findViaBundledTemplates(
    siteRoot,
    namespace,
    name,
    templateFolder,
    exists
  );
  return bundledPath ? { kind: "resolved", path: bundledPath } : { kind: "none" };
}

/**
 * Разрешает файл шаблона
 * @param namespace - пространство имен компонента
 * @param name - имя компонента
 * @param templateName - имя шаблона
 * @param siteRoot - корень сайта
 * @param siteTemplate - настроенный шаблон или null
 * @param exists - функция проверки существования
 * @param listDirectories - функция списка директорий
 * @returns результат разрешения
 */
export async function resolveTemplateFile(
  namespace: string,
  name: string,
  templateName: string,
  siteRoot: string,
  siteTemplate: string | null,
  exists: PathExists,
  listDirectories: ListDirectories
): Promise<TemplateResolution> {
  const dirResolution = await resolveTemplateDir(
    namespace,
    name,
    templateName,
    siteRoot,
    siteTemplate,
    exists,
    listDirectories
  );

  if (dirResolution.kind === "resolved") {
    return { kind: "resolved", path: await toEntryFile(dirResolution.path, exists) };
  }

  if (dirResolution.kind === "ambiguous") {
    const candidates = await Promise.all(
      dirResolution.candidates.map(async (candidate) => ({
        siteTemplateName: candidate.siteTemplateName,
        path: await toEntryFile(candidate.path, exists),
      }))
    );
    return { kind: "ambiguous", candidates };
  }

  return { kind: "none" };
}
