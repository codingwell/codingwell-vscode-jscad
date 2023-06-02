import * as vscode from "vscode";
import { DataWatcher } from "./data-watcher";

export default function createWebviewPanel(
  context: vscode.ExtensionContext,
  uri: vscode.Uri
) {
  const dataWatcher = new DataWatcher();
  const disposables: vscode.Disposable[] = [dataWatcher];

  const panel = vscode.window.createWebviewPanel(
    "jscad",
    "JSCAD",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );
  panel.onDidDispose(
    () => {
      disposables.forEach((d) => d.dispose());
    },
    null,
    disposables
  );

  const extensionURI = panel.webview.asWebviewUri(context.extensionUri);

  panel.webview.onDidReceiveMessage(
    (message) => {
      switch (message.command) {
        case "ready":
          dataWatcher.watch(uri, (data) => {
            panel.webview.postMessage({ command: "setData", data });
          });
          return;
      }
    },
    null,
    disposables
  );

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
