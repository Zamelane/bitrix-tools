import * as path from "node:path";
import {
  ListDirectories,
  PathExists,
  TemplateCandidate,
  TemplateResolution,
} from "./types";

// Bitrix's convention: an empty template name in IncludeComponent means
// "use the component's shipped default template", which lives in a
// folder literally named ".default".
const DEFAULT_TEMPLATE_FOLDER = ".default";

// local/ overrides bitrix/ as a whole tier, same convention as component
// resolution: if local/templates has ANY match, bitrix/templates is never
// even considered. Ambiguity (multiple site templates) can therefore only
// ever happen *within* one of these tiers, never by mixing the two.
const TEMPLATE_ROOTS = ["local", "bitrix"] as const;

function effectiveTemplateFolder(templateName: string): string {
  return templateName === "" ? DEFAULT_TEMPLATE_FOLDER : templateName;
}

// Defense in depth: the parser already restricts the template-name charset
// so it can't contain path separators or "..", but this module shouldn't
// rely solely on callers upstream having sanitized their input before it
// reaches path.join. Also applied to the user-configured siteTemplate
// setting, which is just as capable of reaching path.join.
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
 * statically. Without it, every site template folder found on disk at the
 * winning tier is checked; if more than one has a match, the result is
 * reported as ambiguous instead of guessing.
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
 * Fallback when no site-template override exists: the template bundled
 * directly with the component itself, e.g.
 * local/components/{ns}/{name}/templates/{template}. Never ambiguous —
 * there's exactly one such location per components root.
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

async function toEntryFile(dir: string, exists: PathExists): Promise<string> {
  const entryFile = path.join(dir, "template.php");
  return (await exists(entryFile)) ? entryFile : dir;
}

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
