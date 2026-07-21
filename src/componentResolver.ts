import * as path from "node:path";

export type PathExists = (candidatePath: string) => Promise<boolean>;

const COMPONENT_ROOTS = ["local", "bitrix"] as const;

function isSafePathSegment(segment: string): boolean {
  return segment !== "." && segment !== "..";
}

export async function resolveComponentDir(
  namespace: string,
  name: string,
  workspaceRoots: readonly string[],
  exists: PathExists
): Promise<string | null> {
  if (!isSafePathSegment(namespace) || !isSafePathSegment(name)) {
    return null;
  }

  for (const componentRoot of COMPONENT_ROOTS) {
    for (const workspaceRoot of workspaceRoots) {
      const candidate = path.join(
        workspaceRoot,
        componentRoot,
        "components",
        namespace,
        name
      );
      if (await exists(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

export async function resolveComponentFile(
  namespace: string,
  name: string,
  workspaceRoots: readonly string[],
  exists: PathExists
): Promise<string | null> {
  const dir = await resolveComponentDir(namespace, name, workspaceRoots, exists);
  if (!dir) {
    return null;
  }

  const entryFile = path.join(dir, "component.php");
  return (await exists(entryFile)) ? entryFile : dir;
}
