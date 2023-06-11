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
            body {
              background: white;
            }

            .container {
                width: 100%;
                height: 100%;
                position: absolute;
                top: 0px;
                left: 0px;
                right: 0px;
                bottom: 0px;
                pointer-events: none;
            }

            #erroroverlay {
              color: red;
              white-space: pre;
            }

            #loadingoverlay {
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .spinner {
              background: transparent;
              height: 64px;
              width: 64px;
              border: 5px solid #FFF7;
              border-radius: 50%;
              border-top: 5px solid black;
              animation: rotate 0.6s linear infinite;
            }
            
            @keyframes rotate {
              0% {
                transform: rotate(0deg);
              }
              100% {
                transform: rotate(360deg);
              }
            }
        </style>
    </head>
    <body>
        <canvas id='renderTarget' style="border: 0px; margin: 0px; padding: 0px; top: 0px; left: 0px; width: 100%; height: 100%; position: absolute;"> </canvas>
        <div class="container" id="loadingoverlay"><div class="spinner"></div></div>
        <div class="container" id="erroroverlay"></div>
        <script src="${extensionURI}/dist/web/webview.js"></script>
    </body>
    </html>`;
}
