import * as vscode from "vscode";
import { initWebview } from "./initWebview";

export class JSCADPanelSerializer implements vscode.WebviewPanelSerializer {
  context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async deserializeWebviewPanel(
    webviewPanel: vscode.WebviewPanel,
    state: { uri: string },
  ) {
    // `state` is the state persisted using `setState` inside the webview
    const uri = vscode.Uri.parse(state.uri);

    // Restore the content of our webview.
    initWebview(this.context, webviewPanel, uri);
  }
}
