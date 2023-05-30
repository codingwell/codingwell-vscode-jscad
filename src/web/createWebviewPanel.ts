import * as vscode from "vscode";
import { DataWatcher } from "./data-watcher";

export default function createWebviewPanel(context: vscode.ExtensionContext) {
  const dataWatcher = new DataWatcher();
  const panel = vscode.window.createWebviewPanel(
    "jscad",
    "JSCAD",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      // localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
    }
  );

  const extensionURI = panel.webview.asWebviewUri(context.extensionUri);

  panel.webview.html = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            .container {
                width: 100%;
                height: 100%;
                position: absolute;
                top: 0px;
                left: 0px;
                right: 0px;
                bottom: 0px;
            }
        </style>
    </head>
    <body>
        <div class="container" id="app">Hello World!</div>
        <canvas id='renderTarget' style="border: 0px; margin: 0px; padding: 0px; top: 0px; left: 0px; width: 100%; height: 100%; position: absolute;"> </canvas>
        <script src="${extensionURI}/dist/web/webview.js"></script>
    </body>
    </html>`;
}
