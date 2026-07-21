import * as vscode from "vscode";
import { listDirectories } from "./core/fs/listDirectories";
import { pathExists } from "./core/fs/pathExists";
import { ComponentService } from "./services/component/ComponentService";
import {
  CHOOSE_TEMPLATE_COMMAND_ID,
  chooseTemplateCommand,
} from "./vscode/commands/chooseTemplateCommand";
import { ComponentLinkProvider } from "./vscode/providers/ComponentLinkProvider";

export function activate(context: vscode.ExtensionContext): void {
  const componentService = new ComponentService(pathExists, listDirectories);
  const componentLinkProvider = new ComponentLinkProvider(componentService);

  context.subscriptions.push(
    vscode.languages.registerDocumentLinkProvider(
      { language: "php" },
      componentLinkProvider
    ),
    vscode.commands.registerCommand(CHOOSE_TEMPLATE_COMMAND_ID, chooseTemplateCommand)
  );
}

export function deactivate(): void {}
