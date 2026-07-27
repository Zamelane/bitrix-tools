import * as fs from "node:fs/promises";

/**
 * Проверяет существование пути
 * @param candidatePath - проверяемый путь
 * @returns true если путь существует
 */
export async function pathExists(candidatePath: string): Promise<boolean> {
  try {
    await fs.access(candidatePath);
    return true;
  } catch {
    return false;
  }
}
