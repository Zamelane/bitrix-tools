import * as vscode from "vscode";
import { ComponentService } from "../../services/component/ComponentService";

export class ComponentLinkProvider implements vscode.DocumentLinkProvider {
  constructor(private readonly componentService: ComponentService) {}

  async provideDocumentLinks(
    document: vscode.TextDocument
  ): Promise<vscode.DocumentLink[]> {
    const workspaceRoots = (vscode.workspace.workspaceFolders ?? []).map(
      (folder) => folder.uri.fsPath
    );
    if (workspaceRoots.length === 0) {
      return [];
    }

    const links = await this.componentService.findComponentLinks(
      document.getText(),
      workspaceRoots
    );

    return links.map(({ reference, targetPath }) => {
      const range = new vscode.Range(
        document.positionAt(reference.start),
        document.positionAt(reference.end)
      );
      const link = new vscode.DocumentLink(range, vscode.Uri.file(targetPath));
      link.tooltip = `Open ${reference.namespace}:${reference.name}`;
      return link;
    });
  }
}
