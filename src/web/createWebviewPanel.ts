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
        <meta
          http-equiv="Content-Security-Policy"
          content="default-src 'none';
          img-src ${panel.webview.cspSource} https:;
          script-src 'unsafe-eval' ${panel.webview.cspSource};
          style-src 'unsafe-inline' ${panel.webview.cspSource};
          connect-src ${panel.webview.cspSource};
          worker-src blob:;"
        />
    </head>
    <body>
        <canvas id="renderTarget">
        </canvas>

        <div class="container" id="loadingoverlay">
          <div class="spinner">
          </div>
        </div>

        <div class="container" id="erroroverlay">
        </div>

        <div id="react-app" data-filename="${uri}">
        </div>

        <script id="script" src="${extensionURI}/dist/web/webview.js" data-worker-uri="${extensionURI}/dist/web/webworker.js"></script>
        <script id="script" src="${extensionURI}/dist/web/view.js"></script>
    </body>
    </html>`;
}
