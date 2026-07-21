import * as path from "node:path";
import * as vscode from "vscode";
import { ComponentService } from "../../services/component/ComponentService";
import { CHOOSE_TEMPLATE_COMMAND_ID } from "../commands/chooseTemplateCommand";

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

    return links.map((link) => {
      const range = new vscode.Range(
        document.positionAt(link.start),
        document.positionAt(link.end)
      );

      const target =
        link.kind === "direct"
          ? vscode.Uri.file(link.targetPath)
          : vscode.Uri.parse(
              `command:${CHOOSE_TEMPLATE_COMMAND_ID}?${encodeURIComponent(
                JSON.stringify([link.candidates])
              )}`
            );

      const documentLink = new vscode.DocumentLink(range, target);
      documentLink.tooltip = link.tooltip;
      return documentLink;
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
