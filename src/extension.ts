import * as vscode from "vscode";
import * as fs from "node:fs/promises";
import { findComponentReferences } from "./componentParser";
import { resolveComponentFile } from "./componentResolver";

async function pathExists(candidatePath: string): Promise<boolean> {
  try {
    await fs.access(candidatePath);
    return true;
  } catch {
    return false;
  }
}

class BitrixComponentLinkProvider implements vscode.DocumentLinkProvider {
  async provideDocumentLinks(
    document: vscode.TextDocument
  ): Promise<vscode.DocumentLink[]> {
    const workspaceRoots = (vscode.workspace.workspaceFolders ?? []).map(
      (folder) => folder.uri.fsPath
    );
    if (workspaceRoots.length === 0) {
      return [];
    }

    const text = document.getText();
    const references = findComponentReferences(text);
    const links: vscode.DocumentLink[] = [];

    for (const ref of references) {
      const target = await resolveComponentFile(
        ref.namespace,
        ref.name,
        workspaceRoots,
        pathExists
      );
      if (!target) {
        continue;
      }

      const range = new vscode.Range(
        document.positionAt(ref.start),
        document.positionAt(ref.end)
      );
      const link = new vscode.DocumentLink(range, vscode.Uri.file(target));
      link.tooltip = `Open ${ref.namespace}:${ref.name}`;
      links.push(link);
    }

    return links;
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const provider = vscode.languages.registerDocumentLinkProvider(
    { language: "php" },
    new BitrixComponentLinkProvider()
  );
  context.subscriptions.push(provider);
}

export function deactivate(): void {}
