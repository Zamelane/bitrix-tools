import * as path from "node:path";
import * as vscode from "vscode";
import { ComponentService } from "../../services/component/ComponentService";

export class ComponentLinkProvider implements vscode.DocumentLinkProvider {
  constructor(private readonly componentService: ComponentService) {}

  async provideDocumentLinks(
    document: vscode.TextDocument
  ): Promise<vscode.DocumentLink[]> {
    if (document.uri.scheme !== "file") {
      return [];
    }

    const documentDir = path.dirname(document.uri.fsPath);
    const siteTemplate = this.readSiteTemplateSetting(document.uri);

    const links = await this.componentService.findLinks(
      document.getText(),
      documentDir,
      siteTemplate
    );

    return links.map(({ start, end, targetPath, tooltip }) => {
      const range = new vscode.Range(
        document.positionAt(start),
        document.positionAt(end)
      );
      const link = new vscode.DocumentLink(range, vscode.Uri.file(targetPath));
      link.tooltip = tooltip;
      return link;
    });
  }

  private readSiteTemplateSetting(uri: vscode.Uri): string | null {
    const value = vscode.workspace
      .getConfiguration("bitrixTools", uri)
      .get<string>("siteTemplate", "")
      .trim();
    return value === "" ? null : value;
  }
}
