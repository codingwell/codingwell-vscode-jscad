import * as vscode from "vscode";
import { DataWatcher } from "../data-watcher";
import { out } from "../logging";
import { OpenJscadDir } from "@jscad/core";

export function initWebview(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  uri: vscode.Uri,
) {
  out.appendLine(`Init preview ${uri}`);

  const dataWatcher = new DataWatcher();
  const disposables: vscode.Disposable[] = [dataWatcher];

  panel.onDidDispose(
    () => {
      out.appendLine(`Dispose preview ${uri}`);
      disposables.forEach((d) => d.dispose());
    },
    null,
    disposables,
  );

  const extensionURI = panel.webview.asWebviewUri(context.extensionUri);

  let lastData: OpenJscadDir[] | null = null;
  let watching = false;

  panel.webview.onDidReceiveMessage(
    (message) => {
      switch (message.command) {
        case "ready":
          if (!watching) {
            watching = true;
            dataWatcher.watch(uri, (data) => {
              lastData = data;
              panel.webview.postMessage({ command: "setData", data });
            });
          } else {
            // Panel was restored
            out.appendLine(
              `Restore preview ${uri} ${lastData == null ? "NoData" : ""}`,
            );
            if (lastData != null) {
              panel.webview.postMessage({ command: "setData", data: lastData });
            }
          }
          return;
      }
    },
    null,
    disposables,
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
          script-src 'unsafe-eval' 'unsafe-inline' ${panel.webview.cspSource};
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
        <script>mySetState({ uri: ${JSON.stringify(uri.toString())} });</script>
    </body>
    </html>`;
}
