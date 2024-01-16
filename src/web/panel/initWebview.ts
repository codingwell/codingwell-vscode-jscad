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
          content="default-src 'none'; img-src ${
            panel.webview.cspSource
          } https:; script-src 'unsafe-eval' 'unsafe-inline' ${
            panel.webview.cspSource
          }; style-src 'unsafe-inline' ${
            panel.webview.cspSource
          }; connect-src ${panel.webview.cspSource}; worker-src blob:;" 
        />
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

            #download {
              position: absolute;
              top: 10px;
              right: 10px;
            }

            #download svg {
              fill: none;
            }

            #download svg polyline,
            #download svg path {
              stroke: #0077FF;
              stroke-width: 2;
              stroke-linecap: round;
              stroke-linejoin: round;
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
        <button id="download">
          <svg width="16px" height="16px" viewBox="0 0 16 16">
            <polyline points="4.5 8.5 8 11 11.5 8.5"></polyline>
            <path d="M8,1 L8,11"></path>
            <path d="M1,15 L15,15"></path>
          </svg>
        </button>
        <script id="script" src="${extensionURI}/dist/web/webview.js" data-worker-uri="${extensionURI}/dist/web/webworker.js"></script>
        <script>mySetState({ uri: ${JSON.stringify(uri.toString())} });</script>
    </body>
    </html>`;
}
