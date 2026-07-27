import * as path from "node:path";
import { PathExists } from "./types";

const COMPONENT_ROOTS = ["local", "bitrix"] as const;

// component.php is conventional entry; class.php for OOP-only components.
const COMPONENT_ENTRY_FILES = ["component.php", "class.php"] as const;

// Limit upward walk to prevent infinite scanning outside Bitrix sites.
const MAX_SITE_ROOT_SEARCH_DEPTH = 32;

function isSafePathSegment(segment: string): boolean {
  return segment !== "." && segment !== "..";
}

/**
 * Ищет корень сайта вверх по дереву директорий.
 * Использует `bitrix/modules` как маркер реального docroot.
 * @param startDir - начальная директория поиска
 * @param exists - функция проверки существования пути
 * @returns путь к корню сайта или null
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

/**
 * Находит директорию компонента
 * @param namespace - пространство имен компонента
 * @param name - имя компонента
 * @param siteRoot - корень сайта
 * @param exists - функция проверки существования
 * @returns путь к директории или null
 */
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

/**
 * Находит файл компонента (component.php или class.php)
 * @param namespace - пространство имен компонента
 * @param name - имя компонента
 * @param siteRoot - корень сайта
 * @param exists - функция проверки существования
 * @returns путь к файлу или директории
 */
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

  for (const fileName of COMPONENT_ENTRY_FILES) {
    const candidate = path.join(dir, fileName);
    if (await exists(candidate)) {
      return candidate;
    }
  }

  return dir;
}
