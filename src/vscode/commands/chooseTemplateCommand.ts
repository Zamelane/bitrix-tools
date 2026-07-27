import * as vscode from "vscode";

export const CHOOSE_TEMPLATE_COMMAND_ID = "bitrixTools.chooseTemplate";

export interface TemplateCandidateArg {
  label: string;
  targetPath: string;
}

/**
 * Проверяет валидность аргумента кандидата.
 * @param candidate - проверяемое значение
 * @returns true если валидный TemplateCandidateArg
 */
function isWellFormedCandidate(
  candidate: unknown
): candidate is TemplateCandidateArg {
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    typeof (candidate as TemplateCandidateArg).label === "string" &&
    (candidate as TemplateCandidateArg).label.length > 0 &&
    typeof (candidate as TemplateCandidateArg).targetPath === "string" &&
    (candidate as TemplateCandidateArg).targetPath.length > 0
  );
}

/**
 * Показывает выбор шаблона
 * @param candidates - список кандидатов
 */
export async function chooseTemplateCommand(
  candidates: TemplateCandidateArg[]
): Promise<void> {
  const wellFormed = (candidates ?? []).filter(isWellFormedCandidate);
  if (wellFormed.length === 0) {
    return;
  }

  const items = wellFormed.map((candidate) => ({
    label: candidate.label,
    detail: candidate.targetPath,
    candidate,
  }));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: "Choose which site template to open",
  });
  if (!picked) {
    return;
  }

  try {
    const document = await vscode.workspace.openTextDocument(
      picked.candidate.targetPath
    );
    await vscode.window.showTextDocument(document);
  } catch {
    vscode.window.showErrorMessage(
      `Could not open "${picked.candidate.targetPath}" — it may have been moved or deleted.`
    );
  }
}
