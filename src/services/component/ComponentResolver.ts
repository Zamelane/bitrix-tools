import * as path from "node:path";
import { PathExists } from "./types";

const COMPONENT_ROOTS = ["local", "bitrix"] as const;

// Bounds the upward directory walk in findSiteRoot so a file with no
// Bitrix ancestor (e.g. opened outside any site) can't scan past a
// sane number of levels before giving up.
const MAX_SITE_ROOT_SEARCH_DEPTH = 32;

function isSafePathSegment(segment: string): boolean {
  return segment !== "." && segment !== "..";
}

/**
 * Walks up from `startDir` looking for the nearest ancestor that looks like
 * a real Bitrix site docroot. `bitrix/modules` (not just a bare `bitrix/`
 * folder) is used as the marker — a bare `bitrix/` can also show up in
 * vendored IDE-stub packages (e.g. `vendor/bitrix/...`), which would
 * otherwise cause the walk to stop one level too early. This lets
 * navigation work regardless of which folder is open as the VS Code
 * workspace root, since the docroot is often nested (e.g. `www/public/`).
 */
export async function findSiteRoot(
  startDir: string,
  exists: PathExists
): Promise<string | null> {
  let currentDir = startDir;

  for (let depth = 0; depth < MAX_SITE_ROOT_SEARCH_DEPTH; depth++) {
    if (await exists(path.join(currentDir, "bitrix", "modules"))) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }

  return null;
}

export async function resolveComponentDir(
  namespace: string,
  name: string,
  siteRoot: string,
  exists: PathExists
): Promise<string | null> {
  if (!isSafePathSegment(namespace) || !isSafePathSegment(name)) {
    return null;
  }

  for (const componentRoot of COMPONENT_ROOTS) {
    const candidate = path.join(
      siteRoot,
      componentRoot,
      "components",
      namespace,
      name
    );
    if (await exists(candidate)) {
      return candidate;
    }
  }
  return null;
}

export async function resolveComponentFile(
  namespace: string,
  name: string,
  siteRoot: string,
  exists: PathExists
): Promise<string | null> {
  const dir = await resolveComponentDir(namespace, name, siteRoot, exists);
  if (!dir) {
    return null;
  }

  const entryFile = path.join(dir, "component.php");
  return (await exists(entryFile)) ? entryFile : dir;
}
