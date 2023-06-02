// The module 'vscode' contains the VS Code extensibility API
import * as vscode from "vscode";
import createWebviewPanel from "./createWebviewPanel";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "jscad.preview",
    (params) => {
      let uri: vscode.Uri;
      if (params == null) {
        const editor = vscode.window.activeTextEditor;
        if (editor != null) {
          uri = editor.document.uri;
        } else {
          vscode.window.showErrorMessage("No file or directory selected");
          return;
        }
      } else {
        uri = params;
      }

      createWebviewPanel(context, uri);
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
