import * as path from "node:path";
import { ListDirectories, PathExists } from "./types";

// Bitrix's convention: an empty template name in IncludeComponent means
// "use the component's shipped default template", which lives in a
// folder literally named ".default".
const DEFAULT_TEMPLATE_FOLDER = ".default";

// local/ overrides bitrix/, same convention as component resolution.
const TEMPLATE_ROOTS = ["local", "bitrix"] as const;

function effectiveTemplateFolder(templateName: string): string {
  return templateName === "" ? DEFAULT_TEMPLATE_FOLDER : templateName;
}

// Defense in depth: the parser already restricts the template-name charset
// so it can't contain path separators or "..", but resolveTemplateDir is a
// public function in this module and shouldn't rely solely on callers
// upstream having sanitized their input before it reaches path.join.
function isSafeTemplateFolder(segment: string): boolean {
  return (
    segment !== "." &&
    segment !== ".." &&
    !segment.includes("/") &&
    !segment.includes("\\")
  );
}

/**
 * Site-template-scoped lookup: local/templates/{siteTemplate}/components/{ns}/{name}/{template}
 * and the bitrix/ equivalent. If `siteTemplate` is given (from the
 * `bitrixTools.siteTemplate` setting) only that one is checked — this is
 * the escape hatch for multi-site installs, where the real site template
 * is chosen at runtime from the database and can't be determined
 * statically. Without it, every site template folder found on disk is
 * tried, in alphabetical order, which is a reasonable guess for the
 * common single-site case.
 */
async function findViaSiteTemplates(
  siteRoot: string,
  namespace: string,
  name: string,
  templateFolder: string,
  siteTemplate: string | null,
  exists: PathExists,
  listDirectories: ListDirectories
): Promise<string | null> {
  for (const templateRoot of TEMPLATE_ROOTS) {
    const templatesDir = path.join(siteRoot, templateRoot, "templates");
    // A configured bitrixTools.siteTemplate value comes from the user's own
    // settings.json, but it still ends up in path.join below — guard it the
    // same way as everything else rather than trusting it implicitly.
    const siteTemplateNames =
      siteTemplate && isSafeTemplateFolder(siteTemplate)
        ? [siteTemplate]
        : [...(await listDirectories(templatesDir))].sort();

    for (const siteTemplateName of siteTemplateNames) {
      const candidate = path.join(
        templatesDir,
        siteTemplateName,
        "components",
        namespace,
        name,
        templateFolder
      );
      if (await exists(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

/**
 * Fallback when no site-template override exists: the template bundled
 * directly with the component itself, e.g.
 * local/components/{ns}/{name}/templates/{template}.
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

export async function resolveTemplateDir(
  namespace: string,
  name: string,
  templateName: string,
  siteRoot: string,
  siteTemplate: string | null,
  exists: PathExists,
  listDirectories: ListDirectories
): Promise<string | null> {
  const templateFolder = effectiveTemplateFolder(templateName);
  if (
    !isSafeTemplateFolder(namespace) ||
    !isSafeTemplateFolder(name) ||
    !isSafeTemplateFolder(templateFolder)
  ) {
    return null;
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
  if (viaSiteTemplate) {
    return viaSiteTemplate;
  }

  return findViaBundledTemplates(siteRoot, namespace, name, templateFolder, exists);
}

export async function resolveTemplateFile(
  namespace: string,
  name: string,
  templateName: string,
  siteRoot: string,
  siteTemplate: string | null,
  exists: PathExists,
  listDirectories: ListDirectories
): Promise<string | null> {
  const dir = await resolveTemplateDir(
    namespace,
    name,
    templateName,
    siteRoot,
    siteTemplate,
    exists,
    listDirectories
  );
  if (!dir) {
    return null;
  }

  const entryFile = path.join(dir, "template.php");
  return (await exists(entryFile)) ? entryFile : dir;
}
