import * as vscode from "vscode";
import { initWebview } from "./initWebview";

export default function createWebviewPanel(
  context: vscode.ExtensionContext,
  uri: vscode.Uri
) {
  const panel = vscode.window.createWebviewPanel(
    "jscad",
    "JSCAD",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      //retainContextWhenHidden: true,
    }
  );

  initWebview(context, panel, uri);
}
