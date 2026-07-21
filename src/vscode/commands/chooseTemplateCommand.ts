import * as vscode from "vscode";

export const CHOOSE_TEMPLATE_COMMAND_ID = "bitrixTools.chooseTemplate";

export interface TemplateCandidateArg {
  label: string;
  targetPath: string;
}

// The command is registered globally (vscode.commands.registerCommand), so
// in principle it's invocable with any arguments, not just the well-formed
// ones our own DocumentLinkProvider encodes — TS types on the parameter
// aren't enforced at runtime. Guard against malformed entries explicitly
// rather than letting a bad candidate crash the async command with a
// generic "command failed" notification.
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
 * Invoked by clicking an ambiguous template DocumentLink (a `command:`
 * URI). Lets the user pick which site template to open when more than one
 * matched on disk, instead of silently guessing one.
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
