import * as vscode from "vscode";
import { pathExists } from "./core/fs/pathExists";
import { ComponentService } from "./services/component/ComponentService";
import { ComponentLinkProvider } from "./vscode/providers/ComponentLinkProvider";

export function activate(context: vscode.ExtensionContext): void {
  const componentService = new ComponentService(pathExists);
  const componentLinkProvider = new ComponentLinkProvider(componentService);

  context.subscriptions.push(
    vscode.languages.registerDocumentLinkProvider(
      { language: "php" },
      componentLinkProvider
    )
  );
}

export function deactivate(): void {}
